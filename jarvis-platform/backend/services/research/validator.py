"""Cross-validation engine for research findings."""

import logging

logger = logging.getLogger(__name__)


def cross_validate(results: list[dict]) -> dict:
    """Cross-validate claims across multiple sources.

    Args:
        results: List of search results with {title, url, snippet, source}

    Returns:
        dict with 'claims', 'agreement_score', 'conflicts'
    """
    if len(results) < 2:
        return {
            "claims": [],
            "agreement_score": 0.0,
            "conflicts": [],
            "reliability": "insufficient_data",
        }

    # Extract key terms from all snippets
    all_terms = {}
    for r in results:
        snippet = r.get("snippet", "").lower()
        # Simple keyword extraction
        words = set(snippet.split())
        for w in words:
            if len(w) > 3:  # Skip short words
                all_terms[w] = all_terms.get(w, 0) + 1

    # Find commonly mentioned terms (appearing in 2+ sources)
    common_terms = {k: v for k, v in all_terms.items() if v >= 2}

    # Calculate agreement score
    max_overlap = min(len(results), 5)
    agreement_score = len(common_terms) / max(1, len(all_terms)) if all_terms else 0.0

    # Identify potential conflicts
    conflicts = _find_conflicts(results)

    # Determine reliability level
    if len(results) >= 5 and agreement_score > 0.3:
        reliability = "high"
    elif len(results) >= 3 and agreement_score > 0.15:
        reliability = "moderate"
    else:
        reliability = "low"

    return {
        "common_terms": list(common_terms.keys())[:20],
        "agreement_score": round(agreement_score, 3),
        "conflicts": conflicts,
        "reliability": reliability,
        "sources_checked": len(results),
    }


def _find_conflicts(results: list[dict]) -> list[dict]:
    """Simple heuristic conflict detection."""
    conflicts = []

    # Look for contradictory patterns
    contradictions = [
        (["increase", "rise", "grew", "up"], ["decrease", "fall", "dropped", "down"]),
        (["positive", "good", "strong"], ["negative", "bad", "weak"]),
        (["bullish", "growth"], ["bearish", "decline"]),
    ]

    for i, r1 in enumerate(results):
        for r2 in results[i + 1:]:
            s1 = r1.get("snippet", "").lower()
            s2 = r2.get("snippet", "").lower()

            for pos_set, neg_set in contradictions:
                has_pos_1 = any(w in s1 for w in pos_set)
                has_neg_1 = any(w in s1 for w in neg_set)
                has_pos_2 = any(w in s2 for w in pos_set)
                has_neg_2 = any(w in s2 for w in neg_set)

                if (has_pos_1 and has_neg_2) or (has_neg_1 and has_pos_2):
                    conflicts.append({
                        "source_1": r1["title"],
                        "source_2": r2["title"],
                        "type": "contradictory_sentiment",
                    })
                    break

    return conflicts[:5]


def credibility_score(source: dict) -> float:
    """Score a source's credibility (0.0 - 1.0)."""
    url = source.get("url", "").lower()
    score = 0.5  # Start neutral

    # Trusted domains
    trusted = [
        "reuters.com", "bloomberg.com", "bbc.com", "nature.com",
        "wikipedia.org", "arxiv.org", "ieee.org", "acm.org",
        "github.com", "stackoverflow.com", "medium.com",
    ]
    if any(d in url for d in trusted):
        score += 0.2

    # Less reliable indicators
    if any(d in url for d in ["blogspot", "wordpress", "forum"]):
        score -= 0.1

    return round(min(max(score, 0.0), 1.0), 2)
