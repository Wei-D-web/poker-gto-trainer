"""Synthesizer agent — merges multiple agent outputs into a coherent report."""

import logging

from models.agent import AgentResult
from services.llm.client import llm_client
from config import settings

logger = logging.getLogger(__name__)


class Synthesizer:
    """Merges outputs from multiple agents into a structured final report.

    The synthesizer:
    1. Reviews all agent findings
    2. Identifies key themes and cross-cutting insights
    3. Resolves contradictions between agents
    4. Produces a structured, actionable report
    """

    SYSTEM_PROMPT = """You are the Synthesizer Agent in a multi-agent research system.

Your job is to merge findings from multiple parallel research agents into ONE coherent,
well-structured report for the user.

Guidelines:
- Integrate, don't just concatenate — find connections between findings
- Highlight agreements and contradictions between agents
- Structure with clear sections and headers (markdown)
- Include a "Key Takeaways" section at the top (3-5 bullet points)
- Note any information gaps or areas needing further research
- Be concise but comprehensive — quality over quantity
- Use tables for comparisons when appropriate
- End with "Next Steps" if applicable"""

    async def synthesize(
        self,
        query: str,
        results: list[AgentResult],
    ) -> str:
        """Synthesize agent results into a final report."""

        if not results:
            return "No results were produced by the research agents."

        # Build the synthesis prompt
        findings_text = ""
        for i, r in enumerate(results):
            status_icon = "✓" if r.status == "completed" else "✗"
            findings_text += f"\n### Agent {i+1}: {r.agent_id} {status_icon}\n"
            findings_text += f"**Task**: {r.description}\n\n"
            if r.status == "completed":
                findings_text += r.output.get("findings", str(r.output))
            else:
                findings_text += f"*Failed: {r.error}*\n"
            findings_text += "\n---\n"

        prompt = f"""ORIGINAL USER QUERY: {query}

AGENT FINDINGS:
{findings_text}

Synthesize these findings into a comprehensive report. Use clear markdown formatting with:
- A "Key Takeaways" section (3-5 bullets)
- Thematic sections with headers
- A comparison table if comparing multiple entities
- A "Limitations & Gaps" section
- "Next Steps" if applicable

Write the report now:"""

        try:
            result = await llm_client.chat(
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                model=settings.default_model,
                temperature=0.5,
                max_tokens=4096,
            )
            return result["text"]

        except Exception as e:
            logger.error(f"Synthesis failed: {e}")
            # Fallback: simple concatenation
            fallback = f"# Research Report: {query}\n\n"
            fallback += "*Note: Auto-synthesis failed, showing raw agent outputs.*\n\n"
            for r in results:
                if r.status == "completed":
                    fallback += f"## {r.agent_id}\n\n{r.output.get('findings', '')}\n\n"
            return fallback
