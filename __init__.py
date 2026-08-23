from .provider import HarnessWebToolsProvider
from .tool_override import register_web_extract_override


def register(ctx) -> None:
    """Plugin entry point — called once at load time."""
    provider = HarnessWebToolsProvider()
    ctx.register_web_search_provider(provider)
    register_web_extract_override(ctx)
