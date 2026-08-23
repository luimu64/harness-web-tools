"""Hermes WebSearchProvider backed by harness-web-tools."""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from agent.web_search_provider import WebSearchProvider, get_provider_env

logger = logging.getLogger(__name__)

_REPO_DIR = Path(__file__).resolve().parent
_BRIDGE_SCRIPT = _REPO_DIR / "src" / "bridge.ts"
_BUN_DEFAULT_PATHS = (
    shutil.which("bun"),
    "/opt/data/home/.bun/bin/bun",
    "/root/.bun/bin/bun",
    "/usr/local/bin/bun",
    "/usr/bin/bun",
)


def _get_bun_path() -> Optional[str]:
    for p in _BUN_DEFAULT_PATHS:
        if p and os.path.exists(p) and os.access(p, os.X_OK):
            return p
    return None


def _run_harness_bridge(mode: str, payload: Dict[str, Any], timeout: int = 35) -> Dict[str, Any]:
    bun = _get_bun_path()
    if not bun:
        raise RuntimeError("bun runtime not found")
    if not _BRIDGE_SCRIPT.exists():
        raise RuntimeError(f"harness-web-tools bridge script not found at {_BRIDGE_SCRIPT}")

    cmd = [bun, "run", str(_BRIDGE_SCRIPT), mode, json.dumps(payload)]
    env = dict(os.environ)

    searxng = get_provider_env("SEARXNG_URL")
    if searxng:
        env["SEARXNG_URL"] = searxng
    brave_key = get_provider_env("BRAVE_API_KEY") or get_provider_env("BRAVE_SEARCH_API_KEY")
    if brave_key:
        env["BRAVE_API_KEY"] = brave_key

    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=str(_REPO_DIR),
        env=env,
    )
    if proc.returncode != 0:
        err = proc.stderr.strip() or f"Process exited with code {proc.returncode}"
        raise RuntimeError(f"harness-web-tools error: {err}")

    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"JSON decode failed: {exc}\nRaw: {proc.stdout[:500]}") from exc


class HarnessWebToolsProvider(WebSearchProvider):
    """Web search and extraction provider powered by harness-web-tools."""

    @property
    def name(self) -> str:
        return "harness-web-tools"

    @property
    def display_name(self) -> str:
        return "Harness Web Tools"

    def is_available(self) -> bool:
        return _get_bun_path() is not None and _BRIDGE_SCRIPT.exists()

    def supports_search(self) -> bool:
        return True

    def supports_extract(self) -> bool:
        return True

    def search(self, query: str, limit: int = 5) -> Dict[str, Any]:
        limit = max(1, min(int(limit), 20))
        try:
            res = _run_harness_bridge("search", {"query": query, "limit": limit})
            web = []
            for item in res.get("sources", []):
                web.append(
                    {
                        "url": item.get("url", ""),
                        "title": item.get("title", ""),
                        "description": item.get("snippet", ""),
                    }
                )
            return {"data": {"web": web}, "engine": res.get("engine", "duckduckgo")}
        except Exception as exc:
            logger.warning("harness-web-tools search failed: %s", exc)
            return {"data": {"web": []}, "error": str(exc)}

    def extract(self, urls: List[str], **kwargs: Any) -> List[Dict[str, Any]]:
        if not urls:
            return []

        fmt = (kwargs.get("format") or "markdown").strip().lower()
        if fmt not in ("markdown", "links", "data"):
            fmt = "markdown"

        payload: Dict[str, Any] = {"urls": urls, "format": fmt}
        char_limit = kwargs.get("char_limit")
        if char_limit is not None:
            try:
                payload["char_limit"] = int(char_limit)
            except (ValueError, TypeError):
                pass

        try:
            res = _run_harness_bridge("extract", payload)
            returned = res.get("results", [])
            out = []
            for idx, u in enumerate(urls):
                r = returned[idx] if idx < len(returned) else {}
                content = r.get("content", "")
                entry = {
                    "url": u,
                    "title": r.get("title", "") or u,
                    "content": content,
                    "raw_content": content,
                    "error": r.get("error"),
                    "metadata": r.get("metadata") or {},
                }
                if "structured" in r:
                    entry["structured"] = r["structured"]
                out.append(entry)
            return out
        except Exception as exc:
            logger.warning("harness-web-tools extract failed: %s", exc)
            return [
                {
                    "url": u,
                    "title": "",
                    "content": "",
                    "raw_content": "",
                    "error": f"Extraction failed: {exc}",
                    "metadata": {},
                }
                for u in urls
            ]

    def get_setup_schema(self) -> Dict[str, Any]:
        return {
            "name": "Harness Web Tools",
            "badge": "free · no key · bun",
            "tag": "Platform-agnostic web search and extraction suite.",
            "env_vars": ["SEARXNG_URL", "BRAVE_API_KEY"],
        }
