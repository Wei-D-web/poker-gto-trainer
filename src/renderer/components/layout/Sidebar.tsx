import { useUIStore } from '../../stores/uiStore'
import { useT } from '../../stores/languageStore'
import { useAuth } from '../../contexts/AuthContext'
import { isPremiumFeature } from '../common/SubscriptionGate'
import { cn } from '../../lib/utils'
import {
  Globe, Settings, BookOpen, BarChart3, Target, Edit3,
  Search, Lock, DollarSign, ArrowRight, Users, Zap, HelpCircle, Swords, Play, Library, Bookmark, Calculator, Flame,
  GitCompare, Crosshair, Shield, type LucideIcon,
} from 'lucide-react'

interface NavSection {
  label: string
  items: NavItem[]
}

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string
  disabled?: boolean
  accent?: string // tailwind color class for the icon
}

export function Sidebar() {
  const t = useT()
  const activeRoute = useUIStore((s) => s.activeRoute)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setActiveRoute = useUIStore((s) => s.setActiveRoute)
  const { tier, user } = useAuth()
  const isFree = tier === 'free'

  if (collapsed) return null

  const NAV_SECTIONS: NavSection[] = [
    {
      label: t('nav.sectionCore'),
      items: [
        { id: 'premium', label: '🔥 Premium', icon: Flame, accent: 'text-amber-400' },
        { id: 'playground', label: '实战模拟', icon: Play, accent: 'text-emerald-400' },
        { id: 'explore', label: t('nav.explore'), icon: Globe, shortcut: '1', accent: 'text-blue-400' },
        { id: 'training', label: t('nav.training'), icon: Target, shortcut: '2', accent: 'text-green-400' },
        { id: 'editor', label: t('nav.editor'), icon: Edit3, shortcut: '3', accent: 'text-yellow-400' },
        { id: 'compare', label: t('nav.compare'), icon: BarChart3, shortcut: '4', accent: 'text-purple-400' },
        { id: 'history', label: t('nav.history'), icon: BookOpen, shortcut: '5', accent: 'text-cyan-400' },
      ],
    },
    {
      label: t('nav.sectionAnalysis'),
      items: [
        { id: 'analytics', label: '数据分析', icon: BarChart3, accent: 'text-purple-400' },
        { id: 'equitytrainer', label: '胜率训练', icon: Target, accent: 'text-cyan-400' },
        { id: 'charts', label: '翻前图册', icon: Library, accent: 'text-blue-400' },
        { id: 'battle', label: 'Range Battle', icon: Swords, accent: 'text-red-400' },
        { id: 'cashmttcompare', label: 'Cash vs MTT', icon: GitCompare, accent: 'text-indigo-400' },
        { id: 'exploitadvisor', label: '剥削顾问', icon: Crosshair, accent: 'text-orange-400' },
        { id: 'analyzer', label: t('nav.analyzer'), icon: Search, shortcut: '6', accent: 'text-cyan-400' },
        { id: 'advanced', label: t('nav.advanced'), icon: Lock, shortcut: '7', accent: 'text-purple-400' },
        { id: 'turnriver', label: t('nav.turnRiver'), icon: ArrowRight, shortcut: '9', accent: 'text-amber-400' },
        { id: 'multiway', label: t('nav.multiway'), icon: Users, shortcut: '0', accent: 'text-pink-400' },
      ],
    },
    {
      label: t('nav.sectionTools'),
      items: [
        { id: 'tools', label: '工具箱', icon: Calculator, accent: 'text-amber-400' },
        { id: 'review', label: '复盘教练', icon: Zap, accent: 'text-cyan-400' },
        { id: 'spots', label: '收藏夹', icon: Bookmark, accent: 'text-yellow-400' },
        { id: 'icm', label: t('nav.icm'), icon: DollarSign, shortcut: '8', accent: 'text-emerald-400' },
        { id: 'guide', label: t('nav.guide'), icon: HelpCircle, accent: 'text-blue-400' },
        { id: 'account', label: '账户', icon: Shield, accent: 'text-purple-400' },
        { id: 'settings', label: t('nav.settings'), icon: Settings },
      ],
    },
  ]

  return (
    <nav className="w-56 bg-[#080B10] border-r border-[#152233] flex flex-col shrink-0">
      {/* Navigation items */}
      <div className="flex-1 py-4 px-2.5 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2.5 mb-1.5 text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeRoute === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveRoute(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 group',
                      isActive
                        ? 'bg-blue-500/10 text-blue-400 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]',
                    )}
                  >
                    <Icon
                      size={17}
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive
                          ? 'text-blue-400'
                          : item.accent || 'text-neutral-500 group-hover:text-neutral-300',
                      )}
                    />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {isFree && isPremiumFeature(item.id) && (
                      <Lock size={10} className="text-amber-500/70 shrink-0" />
                    )}
                    {item.shortcut && (
                      <kbd className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-mono font-medium transition-colors',
                        isActive
                          ? 'text-blue-500 bg-blue-500/10'
                          : 'text-neutral-600 bg-neutral-800/50 group-hover:text-neutral-500',
                      )}>
                        ⌘{item.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#152233] space-y-2">
        {user && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <span className="text-xs">👤</span>
            <span className="truncate font-medium text-neutral-300">{user.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <span className="font-medium">Offline Ready</span>
        </div>
      </div>
    </nav>
  )
}
