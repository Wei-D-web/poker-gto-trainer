import { ipcMain } from 'electron'
import { generateBluffCatchScenarios } from '../solver/bluff-catcher-engine'

export function registerTrainingIpc(): void {
  ipcMain.handle(
    'training:generateBluffCatchScenarios',
    (
      _event,
      params: {
        count: number
        includePaired?: boolean
        includeFlushBoards?: boolean
        includeStraightBoards?: boolean
        difficulty?: 'beginner' | 'intermediate' | 'advanced'
      }
    ) => {
      return generateBluffCatchScenarios(params.count ?? 10, {
        includePaired: params.includePaired,
        includeFlushBoards: params.includeFlushBoards,
        includeStraightBoards: params.includeStraightBoards,
        difficulty: params.difficulty,
      })
    }
  )
}
