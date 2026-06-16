/**
 * ImportDialog — 牌谱导入对话框
 *
 * Two modes: file import (drag & drop) and text paste.
 */
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Upload, FileText, X, Loader2 } from 'lucide-react'

interface Props {
  importText: string
  onTextChange: (text: string) => void
  onImportFiles: () => void
  onImportText: () => void
  onClose: () => void
  importing: boolean
}

export function ImportDialog({ importText, onTextChange, onImportFiles, onImportText, onClose, importing }: Props) {
  const [mode, setMode] = useState<'files' | 'text'>('files')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">导入牌谱</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              支持 PokerStars、GGPoker、WPK(德州扑克) 格式
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setMode('files')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors',
              mode === 'files'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            <Upload className="w-4 h-4" />
            文件导入
          </button>
          <button
            onClick={() => setMode('text')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors',
              mode === 'text'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            <FileText className="w-4 h-4" />
            粘贴文本
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === 'files' ? (
            <div className="flex flex-col items-center gap-4">
              <div
                onClick={importing ? undefined : onImportFiles}
                className={cn(
                  'w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors',
                  importing
                    ? 'border-neutral-700 bg-neutral-800/50 cursor-not-allowed'
                    : 'border-neutral-600 bg-neutral-800/30 hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer',
                )}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                    <span className="text-sm text-neutral-400">正在导入...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-neutral-500" />
                    <span className="text-sm text-neutral-400">点击选择 .txt 牌谱文件</span>
                    <span className="text-xs text-neutral-600">支持多选，自动识别格式</span>
                  </>
                )}
              </div>

              <div className="text-xs text-neutral-600 text-center mt-2">
                <p>支持的格式示例:</p>
                <code className="block mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-500 text-left whitespace-pre">
                  {'PokerStars Hand #123456: Hold\'em No Limit...\nGGPoker Hand #RC123456: ...\n游戏编号: 1234567890'}
                </code>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={importText}
                onChange={e => onTextChange(e.target.value)}
                placeholder="在此粘贴牌谱文本..."
                className="w-full h-48 bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-200 placeholder-neutral-600 resize-none focus:outline-none focus:border-blue-500/50"
                disabled={importing}
              />
              <button
                onClick={onImportText}
                disabled={!importText.trim() || importing}
                className={cn(
                  'w-full py-2.5 rounded-lg font-medium text-sm transition-colors',
                  importText.trim() && !importing
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed',
                )}
              >
                {importing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    导入中...
                  </span>
                ) : (
                  '导入牌谱'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            {mode === 'files' ? '选择文件后自动解析并创建 Session' : '粘贴后点击导入按钮'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
