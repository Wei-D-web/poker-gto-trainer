import { useState, useEffect } from 'react'
import { useStrategyLoader } from '../../hooks/useStrategyLoader'
import { useUIStore } from '../../stores/uiStore'
import { useLanguageStore, type Language } from '../../stores/languageStore'
import { useT } from '../../stores/languageStore'
import { DEFAULT_SHORTCUTS } from '../../hooks/useKeyboard'
import { cn } from '../../lib/utils'
import { Database, Monitor, Moon, Sun, Keyboard, Globe } from 'lucide-react'

export function SettingsPage() {
  const t = useT()
  const { initSampleData, getDataStats } = useStrategyLoader()
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const lang = useLanguageStore((s) => s.lang)
  const setLang = useLanguageStore((s) => s.setLang)
  const [stats, setStats] = useState<{ preflopCount: number; scenarioCount: number; strategyCount: number } | null>(null)
  const [initStatus, setInitStatus] = useState<string | null>(null)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => { const s = await getDataStats(); setStats(s) }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h2 className="text-lg font-bold text-neutral-200 mb-8">{t('settings.title')}</h2>

      <div className="max-w-xl space-y-8">
        {/* Language */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe size={15} />
            {t('settings.language')}
          </h3>
          <div className="flex gap-2">
            {([
              { id: 'zh' as Language, label: '中文', flag: '🇨🇳' },
              { id: 'en' as Language, label: 'English', flag: '🇺🇸' },
            ]).map(item => (
              <button
                key={item.id}
                onClick={() => setLang(item.id)}
                className={cn(
                  'px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2.5',
                  lang === item.id
                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25'
                    : 'bg-[#0B1019] text-neutral-400 hover:bg-[#0F141C] border border-[#1C2A3D]',
                )}
              >
                <span className="text-base">{item.flag}</span>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Monitor size={15} />
            {t('settings.appearance')}
          </h3>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map(tp => (
              <button
                key={tp}
                onClick={() => setTheme(tp)}
                className={cn(
                  'px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2.5',
                  theme === tp
                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25'
                    : 'bg-[#0B1019] text-neutral-400 hover:bg-[#0F141C] border border-[#1C2A3D]',
                )}
              >
                {tp === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                {tp === 'dark' ? t('settings.dark') : t('settings.light')}
              </button>
            ))}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Keyboard size={15} />
            {t('settings.keyboard')}
          </h3>
          <div className="bg-[#090D14] rounded-xl border border-[#152233] divide-y divide-[#152233] overflow-hidden">
            {DEFAULT_SHORTCUTS.map((sc, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-neutral-400">{sc.description}</span>
                <kbd className="px-2.5 py-1 text-xs bg-[#0F141C] text-neutral-300 rounded-lg font-mono font-medium border border-[#1C2A3D]">
                  {sc.ctrl ? '⌘' : ''}{sc.shift ? '⇧' : ''}{sc.key.toUpperCase()}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Data Management */}
        <section className="p-6 bg-amber-500/[0.04] border border-amber-500/15 rounded-2xl">
          <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <Database size={16} />
            {t('settings.dataManagement')}
          </h3>

          <div className="space-y-4">
            <button onClick={loadStats}
              className="px-4 py-2 text-sm font-medium bg-[#0F141C] hover:bg-[#151B28] text-neutral-300 rounded-lg transition-colors border border-[#1C2A3D]">
              {t('settings.refreshStats')}
            </button>

            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#090D14] rounded-xl p-4 text-center border border-[#152233]">
                  <div className="text-2xl font-bold text-blue-400">{stats.preflopCount}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">{t('settings.preflopData')}</div>
                </div>
                <div className="bg-[#090D14] rounded-xl p-4 text-center border border-[#152233]">
                  <div className="text-2xl font-bold text-emerald-400">{stats.scenarioCount}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">{t('settings.postflopData')}</div>
                </div>
                <div className="bg-[#090D14] rounded-xl p-4 text-center border border-[#152233]">
                  <div className="text-2xl font-bold text-amber-400">{stats.strategyCount}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Strategies</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={async () => {
                  setInitStatus('Generating preflop data...')
                  try {
                    const result = await window.electronAPI?.strategy?.initSampleData() || { message: 'Electron API not available' }
                    setInitStatus(result.message)
                    await loadStats()
                  } catch (e) { setInitStatus('Failed: ' + String(e)) }
                }}
                className="px-4 py-2.5 text-sm font-semibold bg-amber-500/8 hover:bg-amber-500/12 text-amber-400 rounded-xl transition-colors border border-amber-500/15"
              >
                {t('settings.initPreflop')}
              </button>
              <button
                onClick={async () => {
                  setInitStatus('Generating postflop data...')
                  try {
                    const result = await window.electronAPI?.strategy?.initPostflopData() || { message: 'Electron API not available' }
                    setInitStatus(result.message)
                    await loadStats()
                  } catch (e) { setInitStatus('Failed: ' + String(e)) }
                }}
                className="px-4 py-2.5 text-sm font-semibold bg-emerald-500/8 hover:bg-emerald-500/12 text-emerald-400 rounded-xl transition-colors border border-emerald-500/15"
              >
                {t('settings.initPostflop')}
              </button>
            </div>
            {initStatus && (
              <p className={cn(
                'text-xs font-medium animate-fade-in',
                initStatus.includes('Failed') ? 'text-red-400' : 'text-neutral-400',
              )}>
                {initStatus}
              </p>
            )}
          </div>
        </section>

        {/* About */}
        <section className="border-t border-[#152233] pt-6">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{t('settings.about')}</h3>
          <div className="text-xs text-neutral-500 space-y-1.5 leading-relaxed">
            <p className="text-neutral-300 font-semibold">PokerGTO Trainer v0.1.0</p>
            <p>{t('settings.aboutText')}</p>
            <p className="mt-2 text-neutral-600">Electron · React · TypeScript · D3.js · SQLite · CFR Solver</p>
          </div>
        </section>
      </div>
    </div>
  )
}
