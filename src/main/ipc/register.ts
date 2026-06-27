import { registerStrategyIpc } from './strategy.ipc'
import { registerHandHistoryIpc } from './hand-history.ipc'
import { registerReportIpc } from './report.ipc'
import { registerSpotLibraryIpc } from './spot-library.ipc'
import { registerAuthIpc } from './auth'
import { registerSessionReviewIpc } from './session-review.ipc'
import { registerLicenseIpc } from './license.ipc'
import { registerAiCoachIpc } from './ai-coach.ipc'

export function registerAllIpcHandlers(): void {
  registerStrategyIpc()
  registerHandHistoryIpc()
  registerReportIpc()
  registerSpotLibraryIpc()
  registerAuthIpc()
  registerSessionReviewIpc()
  registerLicenseIpc()
  registerAiCoachIpc()
}
