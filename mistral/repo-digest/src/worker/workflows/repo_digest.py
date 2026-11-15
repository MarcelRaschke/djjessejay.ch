import json
import re
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field

import mistralai.workflows as workflows
from mistralai.workflows import Depends
from mistralai.workflows.client import get_mistral_client
from mistralai.workflows.plugins.mistralai.connectors import (
    ToolCallClient,
    connector,
    uses_connectors,
)

github_connector = connector("github_app")
slack_connector = connector("slack")

MAX_PRS_PER_SECTION = 30
PR_FIELDS = ["number", "title", "body", "html_url", "user", "closed_at", "created_at"]


class RepoDigestInput(BaseModel):
    repo: str = Field(description='GitHub repository handle, e.g. "owner/repo".')
    since: str = Field(description="ISO date (YYYY-MM-DD); PRs merged on/after this date are included.")


class PrSummary(BaseModel):
    number: int
    title: str
    url: str
    author: str
    summary: str


class RepoDigestResult(BaseModel):
    repo: str
    since: str
    merged: list[PrSummary]
    awaiting_review: list[PrSummary]
    slack_message_link: str


def _payload(result: Any) -> Any:
    content = getattr(result, "content", None)
    if content is None and isinstance(result, dict):
        content = result.get("content")
    if content:
        texts = []
        for item in content:
            text = getattr(item, "text", None)
            if text is None and isinstance(item, dict):
                text = item.get("text")
            if isinstance(text, str):
                texts.append(text)
        if texts:
            return json.loads("".join(texts))
    if isinstance(result, str):
        return json.loads(result)
    return result


def _text_of(payload: Any) -> str:
    if isinstance(payload, str):
        return payload
    if isinstance(payload, dict):
        for key in ("result", "text", "message"):
            value = payload.get(key)
            if isinstance(value, str):
                return value
    return json.dumps(payload, ensure_ascii=False)


def _all_text(value: Any) -> str:
    parts: list[str] = []

    def walk(node: Any) -> None:
        if isinstance(node, str):
            parts.append(node)
            try:
                walk(json.loads(node))
            except (ValueError, TypeError):
                pass
        elif isinstance(node, dict):
            for child in node.values():
                walk(child)
        elif isinstance(node, (list, tuple)):
            for child in node:
                walk(child)

    walk(value)
    return "\n".join(parts)


def _split_repo(repo: str) -> tuple[str, str]:
    owner, sep, name = repo.partition("/")
    if not sep or not owner or not name:
        raise ValueError(f'Invalid repo handle "{repo}", expected "owner/repo".')
    return owner, name


async def _search_prs(
    github: ToolCallClient, owner: str, name: str, query: str
) -> list[dict[str, Any]]:
    result = await github.call_tool(
        "search_pull_requests",
        {
            "query": f"{query} sort:updated-desc",
            "owner": owner,
            "repo": name,
            "fields": PR_FIELDS,
            "perPage": MAX_PRS_PER_SECTION,
            "sort": "updated",
            "order": "desc",
        },
    )
    payload = _payload(result)
    items = payload.get("items", []) if isinstance(payload, dict) else []
    prs = []
    for item in items:
        if not isinstance(item, dict) or "number" not in item:
            continue
        user = item.get("user") or {}
        prs.append(
            {
                "number": item["number"],
                "title": item.get("title") or "",
                "url": item.get("html_url") or "",
                "author": user.get("login", "") if isinstance(user, dict) else "",
                "body": (item.get("body") or "")[:800],
            }
        )
    return prs


@workflows.activity(start_to_close_timeout=timedelta(seconds=60))
async def fetch_merged_prs(
    repo: str,
    since: str,
    github: ToolCallClient = Depends(github_connector),
) -> list[dict[str, Any]]:
    owner, name = _split_repo(repo)
    return await _search_prs(github, owner, name, f"is:merged merged:>={since}")


@workflows.activity(start_to_close_timeout=timedelta(seconds=60))
async def fetch_open_prs(
    repo: str,
    github: ToolCallClient = Depends(github_connector),
) -> list[dict[str, Any]]:
    owner, name = _split_repo(repo)
    return await _search_prs(github, owner, name, "is:open -is:draft")


class _OneLine(BaseModel):
    number: int
    summary: str


class _SummaryBatch(BaseModel):
    items: list[_OneLine]


@workflows.activity(start_to_close_timeout=timedelta(seconds=180))
async def summarize_prs(
    prs: list[dict[str, Any]],
    client: Any = Depends(get_mistral_client),
) -> list[PrSummary]:
    if not prs:
        return []
    listing = "\n\n".join(
        f"#{p['number']} | {p['title']} | by {p['author']} | {p['url']}\n{p['body']}"
        for p in prs
    )
    response = await client.chat.parse_async(
        model="mistral-small-latest",
        messages=[
            {
                "role": "system",
                "content": (
                    "You write one-line summaries (max 140 characters, in German) for GitHub pull "
                    "requests. For every PR in the user message, return its number and one concise "
                    "line describing what it changes and why. Do not add anything else."
                ),
            },
            {"role": "user", "content": listing},
        ],
        response_format=_SummaryBatch,
    )
    parsed = response.choices[0].message.parsed
    by_number = {item.number: item.summary for item in parsed.items} if parsed else {}
    return [
        PrSummary(
            number=p["number"],
            title=p["title"],
            url=p["url"],
            author=p["author"],
            summary=by_number.get(p["number"], p["title"]),
        )
        for p in prs
    ]


def _render_section(title: str, items: list[PrSummary]) -> list[str]:
    if not items:
        return [title, "_— keine —_", ""]
    lines = [title]
    for item in items:
        lines.append(f"- [#{item.number} {item.title}]({item.url}) — {item.summary}")
    lines.append("")
    return lines


def render_message(
    repo: str, since: str, merged: list[PrSummary], awaiting_review: list[PrSummary]
) -> str:
    lines = [
        f"*Repo-Digest für* `{repo}` *seit* `{since}`",
        "",
        *_render_section(f"*Gemerged ({len(merged)})*", merged),
        *_render_section(f"*Offen / wartet auf Review ({len(awaiting_review)})*", awaiting_review),
    ]
    return "\n".join(lines).strip()


@workflows.activity(start_to_close_timeout=timedelta(seconds=60), retry_policy_max_attempts=1)
async def post_digest_to_slack(
    message: str,
    slack: ToolCallClient = Depends(slack_connector),
) -> str:
    profile_text = _all_text(
        await slack.call_tool("slack_read_user_profile", {"response_format": "detailed"})
    )
    match = re.search(r"User ID:\s*([A-Z0-9]+)", profile_text) or re.search(
        r"\b(U[0-9A-Z]{8,})\b", profile_text
    )
    if not match:
        raise RuntimeError(
            "Could not resolve the Slack user id of the triggering user. "
            f"Profile response: {profile_text[:300]}"
        )
    sent_text = _all_text(
        await slack.call_tool(
            "slack_send_message",
            {
                "channel_id": match.group(1),
                "message": message,
                "unfurl_app_links": True,
            },
        )
    )
    link = re.search(r"https://[^\s\"'<>]+", sent_text)
    return link.group(0) if link else sent_text


@workflows.workflow.define(
    name="repo-digest",
    workflow_display_name="Repo Digest",
    workflow_description=(
        "Given a GitHub repo handle and a date, lists the PRs merged since that date and the open "
        "PRs awaiting review, summarizes each in one line with a link, and posts the digest to the "
        "triggering user's Slack self-DM."
    ),
    on_behalf_of=True,
)
@uses_connectors(github_connector, slack_connector)
class RepoDigestWorkflow:
    @workflows.workflow.entrypoint
    async def run(self, input: RepoDigestInput) -> RepoDigestResult:
        merged_raw = await fetch_merged_prs(input.repo, input.since)
        open_raw = await fetch_open_prs(input.repo)
        merged = await summarize_prs(merged_raw)
        awaiting_review = await summarize_prs(open_raw)
        message = render_message(input.repo, input.since, merged, awaiting_review)
        link = await post_digest_to_slack(message)
        return RepoDigestResult(
            repo=input.repo,
            since=input.since,
            merged=merged,
            awaiting_review=awaiting_review,
            slack_message_link=link,
        )
