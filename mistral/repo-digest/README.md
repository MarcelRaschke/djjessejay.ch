# repo-digest (Mistral Workflows)

Managed workflow deployment on Mistral Cloud. The `repo-digest` workflow takes a GitHub repo
handle and a date, fetches the PRs merged since that date and the open PRs awaiting review,
summarizes each PR in one line with a link, and posts the digest to the triggering user's Slack
self-DM.

## Run

Input schema:

```json
{
  "repo": "owner/repo",
  "since": "2026-11-08"
}
```

The workflow runs on-behalf-of the triggering user (hardened deployment), so it uses that user's
`github_app` and `slack` connector credentials. No secrets live in this repository.

## Layout

- `Dockerfile` — image built by the managed deployment; starts the worker via
  `python -m worker.entrypoints.worker`.
- `src/worker/entrypoints/worker.py` — discovers and serves all workflows in `worker.workflows`.
- `src/worker/workflows/repo_digest.py` — the `repo-digest` workflow and its activities.

Deploy (build context = this directory):

```
deployment_name: repo-digest
github_url: https://github.com/MarcelRaschke/djjessejay.ch
revision: <branch>
build_directory: mistral/repo-digest
dockerfile_path: Dockerfile
hardened: true
```
