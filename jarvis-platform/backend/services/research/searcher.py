"""Multi-source web search — DuckDuckGo + SerpAPI fallback."""

import asyncio
import logging
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)


async def search(
    query: str,
    max_results: int = 10,
    use_serpapi: bool = False,
) -> list[dict]:
    """Search across multiple sources and return deduplicated results.

    Returns list of {title, url, snippet, source}
    """
    results = []

    # Try DuckDuckGo (free, no API key needed)
    ddg_results = await _search_duckduckgo(query, max_results)
    results.extend(ddg_results)

    # Try SerpAPI if configured and results are sparse
    if use_serpapi and settings.serpapi_key and len(results) < 5:
        serp_results = await _search_serpapi(query, max_results)
        results.extend(serp_results)

    # Deduplicate by URL
    seen = set()
    unique = []
    for r in results:
        if r["url"] not in seen:
            seen.add(r["url"])
            unique.append(r)

    logger.info(f"Search '{query[:50]}...': {len(unique)} unique results")
    return unique[:max_results]


async def _search_duckduckgo(query: str, max_results: int) -> list[dict]:
    """Search using DuckDuckGo."""
    try:
        from duckduckgo_search import DDGS

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: list(DDGS().text(query, max_results=max_results)),
        )

        return [
            {
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
                "source": "duckduckgo",
            }
            for r in results
        ]
    except ImportError:
        logger.debug("duckduckgo-search not installed")
        return []
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
        return []


async def _search_serpapi(query: str, max_results: int) -> list[dict]:
    """Search using SerpAPI (Google)."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "api_key": settings.serpapi_key,
                    "num": max_results,
                    "engine": "google",
                },
                timeout=15.0,
            )
            data = response.json()

            results = []
            for r in data.get("organic_results", []):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("link", ""),
                    "snippet": r.get("snippet", ""),
                    "source": "google",
                })
            return results
    except Exception as e:
        logger.warning(f"SerpAPI search failed: {e}")
        return []


async def fetch_page(url: str, timeout: int = 10) -> Optional[str]:
    """Fetch and extract text content from a URL."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                timeout=timeout,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; JARVIS/1.0; +https://jarvis.ai)"
                },
                follow_redirects=True,
            )
            if response.status_code != 200:
                return None

            # Basic text extraction (strip HTML tags)
            import re
            text = response.text
            # Remove scripts and styles
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            # Remove HTML tags
            text = re.sub(r'<[^>]+>', ' ', text)
            # Collapse whitespace
            text = re.sub(r'\s+', ' ', text).strip()

            # Truncate
            return text[:8000]
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {e}")
        return None
