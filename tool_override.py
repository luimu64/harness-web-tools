"""web_extract tool override — expose format="links" and format="data" to the model."""

from __future__ import annotations

import copy
import logging
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)

_TOOLSET = "web"
_TOOL_NAME = "web_extract"


def _build_schema() -> Dict[str, Any]:
    """Deep-copy the bundled schema and add the format parameter."""
    from tools.web_tools import WEB_EXTRACT_SCHEMA

    schema = copy.deepcopy(WEB_EXTRACT_SCHEMA)
    props = schema.setdefault("parameters", {}).setdefault("properties", {})
    props["format"] = {
        "type": "string",
        "enum": ["markdown", "links", "data"],
        "description": (
            "Output mode. 'markdown' (default): clean page text, with "
            "'## Links', '## Images', '## Videos' manifests of every link/image/video "
            "URL on the page appended at the end. 'links': skip text conversion "
            "entirely and return ONLY the title + full link/image/video inventory. "
            "'data': return the page's embedded structured data "
            "(schema.org JSON-LD, OpenGraph, Twitter cards, meta) as JSON."
        ),
    }
    schema["description"] = (
        WEB_EXTRACT_SCHEMA["description"]
        + " Pass format='links' to get the page's complete link, image, "
        "and video URL inventory instead of prose (fast, one request). "
        "Pass format='data' to get the page's embedded structured data "
        "(JSON-LD/OpenGraph/Twitter/meta) as JSON instead of prose."
    )
    return schema


def _build_handler() -> Callable[[Dict[str, Any]], Any]:
    """Build the tool handler closure."""

    def _handler(args: Dict[str, Any], **kw: Any):
        from tools.web_tools import web_extract_tool

        urls = args.get("urls", [])[:5] if isinstance(args.get("urls"), list) else []
        fmt = (args.get("format") or "markdown").strip().lower()
        if fmt not in ("markdown", "links", "data"):
            fmt = "markdown"
        return web_extract_tool(urls, fmt, char_limit=args.get("char_limit"))

    return _handler


def _registration_kwargs() -> Dict[str, Any]:
    """Common kwargs for registry.register / ctx.register_tool."""
    from tools.web_tools import _web_requires_env, check_web_api_key

    return {
        "name": _TOOL_NAME,
        "toolset": _TOOLSET,
        "schema": _build_schema(),
        "handler": _build_handler(),
        "check_fn": check_web_api_key,
        "requires_env": _web_requires_env(),
        "is_async": True,
        "emoji": "📄",
        "override": True,
    }


def register_web_extract_override(ctx: Optional[Any] = None) -> None:
    """(Re-)register the web_extract tool override."""
    try:
        kwargs = _registration_kwargs()
        if ctx is not None and hasattr(ctx, "register_tool"):
            ctx.register_tool(**kwargs)
        else:
            from tools.registry import registry

            registry.register(**kwargs)
        logger.info("harness-web-tools: web_extract tool override registered")
    except Exception as exc:
        logger.warning("harness-web-tools: web_extract tool override failed: %s", exc)
