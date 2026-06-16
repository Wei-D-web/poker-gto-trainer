import { ipcMain, BrowserWindow, dialog } from 'electron'
import { getDatabase } from '../data/database'
import { autoDetectAndParse } from '../data/hand-history-parser'
import { analyzeParsedHand } from '../data/batch-analyzer'

export function registerReportIpc(): void {
  ipcMain.handle('report:exportPDF', async (_event, params: { ids: string[] }) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false, error: 'No window' }

    const db = getDatabase()
    const hands: any[] = []

    for (const id of params.ids || []) {
      const stmt = db.prepare('SELECT * FROM hand_histories WHERE id = :id')
      stmt.bind({ ':id': id })
      if (stmt.step()) hands.push(stmt.getAsObject())
      stmt.free()
    }

    if (hands.length === 0) {
      return { success: false, error: 'No hands found' }
    }

    // Generate HTML report
    let totalMistakes = 0
    let totalEVLost = 0
    const handRows: string[] = []

    for (const h of hands) {
      const handText: string = h.hand_text || ''
      const hand = autoDetectAndParse(handText)
      if (!hand) continue

      const result = analyzeParsedHand(hand)
      if (result.success) {
        totalMistakes += result.mistakes || 0
        totalEVLost += result.totalEVLost || 0
      }

      const heroCards = hand.heroHand.join(' ')
      const boardCards = hand.board.length > 0 ? hand.board.join(' ') : 'Preflop'
      const won = hand.heroWon ? '✅ Won' : hand.heroWon === false ? '❌ Lost' : '—'

      handRows.push(`
        <tr>
          <td>${hand.id.slice(0, 8)}</td>
          <td><b>${heroCards}</b></td>
          <td>${boardCards}</td>
          <td>${hand.effectiveStack}bb</td>
          <td>${won}</td>
          <td>${result.success ? result.grade : '-'}</td>
          <td>${result.success ? result.mistakes : '-'}</td>
          <td>${result.success ? result.totalEVLost + 'bb' : '-'}</td>
        </tr>
      `)
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PokerGTO Session Report</title>
<style>
  body { font-family: -apple-system, sans-serif; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 24px; border-bottom: 2px solid #3B82F6; padding-bottom: 8px; }
  .summary { display: flex; gap: 20px; margin: 20px 0; }
  .card { flex:1; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
  .card .value { font-size: 28px; font-weight: 800; color: #1e293b; }
  .card .label { font-size: 11px; color: #64748b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; color: #64748b; text-transform: uppercase; }
  td { padding: 10px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; }
</style></head><body>
<h1>🎯 PokerGTO Session Report</h1>
<div class="summary">
  <div class="card"><div class="value">${hands.length}</div><div class="label">Hands Analyzed</div></div>
  <div class="card"><div class="value">${totalMistakes}</div><div class="label">Total Mistakes</div></div>
  <div class="card"><div class="value">${totalEVLost.toFixed(1)}bb</div><div class="label">Total EV Lost</div></div>
</div>
<table>
  <tr><th>Hand ID</th><th>Cards</th><th>Board</th><th>Stack</th><th>Result</th><th>Grade</th><th>Mistakes</th><th>EV Lost</th></tr>
  ${handRows.join('')}
</table>
<div class="footer">PokerGTO Trainer v0.1.0 · Generated ${new Date().toLocaleDateString()}</div>
</body></html>`

    // Save via dialog
    const saveResult = await dialog.showSaveDialog(window, {
      title: 'Save Report as PDF',
      defaultPath: `poker-gto-report-${Date.now()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    // Render PDF in hidden window
    const pdfWindow = new BrowserWindow({
      width: 800,
      height: 1100,
      show: false,
      webPreferences: { nodeIntegration: false, sandbox: true },
    })

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    })

    pdfWindow.close()

    const fs = await import('fs')
    fs.writeFileSync(saveResult.filePath, pdfData)

    return { success: true, path: saveResult.filePath }
  })
}
