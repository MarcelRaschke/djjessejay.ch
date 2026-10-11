"""Gemeinsame Hilfsmittel fuer den Triage-Loop: Konfiguration, Zeitfenster, GitHub-Client.

Nur Lesend. Kein Schreibzugriff auf Repos, Issues, PRs oder Workflows.
Ausnahme: post() dient ausschliesslich dem Label-Bootstrap (bootstrap_labels.py).
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - Umgebung ohne PyYAML
    yaml = None  # type: ignore[assignment]

CONFIG_REQUIRED_FIELDS = ("window_days", "stale_days", "repos", "labels", "grading", "slack", "caps")


class TriageError(RuntimeError):
    """Struktureller Fehler im Loop -> Exit-Code 3."""


class BudgetError(RuntimeError):
    """Budget-Cap ueberschritten -> Exit-Code 2."""


def default_config_path() -> Path:
    return Path(os.environ.get("TRIAGE_CONFIG", str(Path(__file__).resolve().parent / "config.yaml")))


def load_config(path: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    """Laedt die Loop-Konfiguration und erzwingt die Pflichtfelder."""
    p = Path(path) if path else default_config_path()
    if not p.exists():
        raise TriageError(f"Konfiguration nicht gefunden: {p}")
    text = p.read_text(encoding="utf-8")
    if p.suffix in (".yaml", ".yml"):
        if yaml is None:
            raise TriageError("PyYAML fehlt: pip install pyyaml")
        cfg = yaml.safe_load(text)
    else:
        cfg = json.loads(text)
    if not isinstance(cfg, dict):
        raise TriageError(f"Konfiguration ist kein Mapping: {p}")
    missing = [k for k in CONFIG_REQUIRED_FIELDS if k not in cfg]
    if missing:
        raise TriageError(f"Pflichtfelder fehlen in {p}: {', '.join(missing)}")
    return cfg


def config_fingerprint(cfg: dict[str, Any]) -> str:
    """Sha-Kurzfassung der Konfiguration; landet im Trace fuer Reproduzierbarkeit."""
    blob = json.dumps(cfg, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:12]


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def since_iso(window_days: int, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    return (now - timedelta(days=window_days)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _next_link(link_header: str) -> str | None:
    """Extrahiert die rel="next"-URL aus einem Link-Header."""
    for part in link_header.split(","):
        segments = part.split(";")
        if len(segments) < 2:
            continue
        if 'rel="next"' in segments[1]:
            return segments[0].strip().strip("<>")
    return None


class GitHubClient:
    """Minimaler GitHub-REST-Client (stdlib, kein Drittanbieter-Paket)."""

    API = "https://api.github.com"

    def __init__(self, token: str | None = None) -> None:
        self.token = (token or os.environ.get("GITHUB_TOKEN") or "").strip()
        if not self.token:
            raise TriageError("GITHUB_TOKEN ist nicht gesetzt")

    def fetch(self, url: str) -> tuple[Any, str | None]:
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ivdj-triage-loop",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
                link = resp.headers.get("Link", "")
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                raise TriageError(f"Rate-Limit oder Zugriff verweigert ({exc.code}) bei {url}") from exc
            if exc.code == 404:
                return None, None
            raise TriageError(f"HTTP {exc.code} bei {url}") from exc
        except urllib.error.URLError as exc:
            raise TriageError(f"Netzwerkfehler bei {url}: {exc.reason}") from exc
        return payload, _next_link(link)

    def get_all(self, path: str, params: dict[str, Any] | None = None, max_pages: int = 5) -> list[Any]:
        """GET mit Link-Header-Pagination; dicts mit workflow_runs werden entpackt."""
        url = self.API + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        items: list[Any] = []
        for _ in range(max_pages):
            payload, next_url = self.fetch(url)
            if payload is None:
                break
            if isinstance(payload, list):
                items.extend(payload)
            elif isinstance(payload, dict) and "workflow_runs" in payload:
                items.extend(payload["workflow_runs"])
            else:
                items.append(payload)
                break
            if not next_url:
                break
            url = next_url
        return items

    def get_one(self, path: str) -> dict[str, Any] | None:
        items = self.get_all(path, max_pages=1)
        return items[0] if items and isinstance(items[0], dict) else None

    def post(self, path: str, payload: dict[str, Any]) -> tuple[int, Any]:
        """POST, ausschliesslich fuer das Label-Bootstrap (idempotent, HTTP 422 = existiert)."""
        req = urllib.request.Request(
            self.API + path,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ivdj-triage-loop",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8") or "{}")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
            return exc.code, body
        except urllib.error.URLError as exc:
            raise TriageError(f"Netzwerkfehler bei POST {path}: {exc.reason}") from exc
