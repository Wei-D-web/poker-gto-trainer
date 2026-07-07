/* ==========================================
   J.A.R.V.I.S. — Agent Swarm Progress Visualization
   ========================================== */

var JARVIS = window.JARVIS || {};

JARVIS.Agents = (function () {
  let container;

  function init(containerId) {
    container = document.getElementById(containerId || 'side-panel-content');
  }

  /**
   * Render agent swarm progress cards in the side panel.
   * @param {Array} agents - array of {agentId, status, description, output?, error?}
   */
  function renderSwarm(agents) {
    if (!container) return;

    const statusIcons = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
    };

    const statusLabels = {
      pending: 'Queued',
      running: 'Processing...',
      completed: 'Complete',
      failed: 'Failed',
    };

    let html = '<div class="side-panel-content">';

    // Status summary
    const counts = { completed: 0, running: 0, pending: 0, failed: 0 };
    agents.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });

    html += `
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <span style="font-size: 11px; color: var(--fg-tertiary); letter-spacing: 0.05em;">
          AGENTS: ${agents.length}
        </span>
        ${counts.completed > 0 ? `<span style="font-size: 11px; color: var(--jarvis-green);">✓ ${counts.completed}</span>` : ''}
        ${counts.running > 0 ? `<span style="font-size: 11px; color: var(--jarvis-blue-light);">↻ ${counts.running}</span>` : ''}
        ${counts.failed > 0 ? `<span style="font-size: 11px; color: var(--jarvis-red);">✗ ${counts.failed}</span>` : ''}
      </div>
    `;

    // Agent cards
    agents.forEach((agent) => {
      const icon = statusIcons[agent.status] || '⏳';
      const label = statusLabels[agent.status] || agent.status;

      html += `
        <div class="agent-card ${agent.status}">
          <div class="agent-card-icon">${icon}</div>
          <div class="agent-card-content">
            <div class="agent-card-title">${escapeHtml(agent.agentId || 'Agent')}</div>
            <div style="font-size: 12px; color: var(--fg-secondary); margin-bottom: 4px;">
              ${escapeHtml(agent.description || '')}
            </div>
            <div class="agent-card-status">${label}</div>
            ${agent.error ? `<div class="agent-card-status" style="color: var(--jarvis-red);">${escapeHtml(agent.error)}</div>` : ''}
            ${agent.output?.findings ? `
              <details style="margin-top: 8px;">
                <summary style="font-size: 11px; color: var(--fg-tertiary); cursor: pointer;">View findings</summary>
                <div style="font-size: 11px; color: var(--fg-secondary); margin-top: 6px; white-space: pre-wrap; max-height: 120px; overflow-y: auto;">
                  ${escapeHtml(agent.output.findings.substring(0, 500))}
                </div>
              </details>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * Show the final synthesized report.
   */
  function renderReport(report) {
    if (!container) return;

    container.innerHTML = `
      <div class="side-panel-content">
        <div style="font-size: 11px; color: var(--jarvis-green); letter-spacing: 0.05em; margin-bottom: 12px;">
          ✓ RESEARCH COMPLETE
        </div>
        <div style="font-size: 12px; color: var(--fg-primary); line-height: 1.6; white-space: pre-wrap; max-height: calc(100vh - 200px); overflow-y: auto;">
          ${formatMarkdown(report || '')}
        </div>
      </div>
    `;
  }

  function clear() {
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧠</div>
          <div class="empty-title">Multi-Agent Swarm</div>
          <div class="empty-desc">Complex tasks are decomposed and executed by parallel AI agents.</div>
        </div>
      `;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    return text
      .replace(/### (.*)/g, '<h4 style="color: var(--jarvis-blue-light); margin: 12px 0 4px; font-size: 13px;">$1</h4>')
      .replace(/## (.*)/g, '<h3 style="color: var(--fg-primary); margin: 16px 0 6px; font-size: 14px;">$1</h3>')
      .replace(/# (.*)/g, '<h2 style="color: var(--fg-primary); margin: 16px 0 8px; font-size: 15px;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/- (.*)/g, '<li style="margin-left: 16px; color: var(--fg-secondary);">$1</li>')
      .replace(/\n/g, '<br>');
  }

  return { init, renderSwarm, renderReport, clear };
})();

window.JARVIS = JARVIS;
