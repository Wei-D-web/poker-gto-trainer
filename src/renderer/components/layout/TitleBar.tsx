import { useUIStore } from '../../stores/uiStore'
import { useAuth } from '../../contexts/AuthContext'
import { TierBadge } from '../common/SubscriptionGate'
import { PanelLeft, X, LogOut, User } from 'lucide-react'

export function TitleBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const activeRoute = useUIStore((s) => s.activeRoute)
  const { user, signOut, isWeb } = useAuth()

  const routeLabels: Record<string, string> = {
    explore: 'Strategy Explorer', training: 'Training Mode',
    editor: 'Range Editor', compare: 'Range Compare',
    history: 'Hand History', settings: 'Settings',
  }

  return (
    <div className="drag-region flex items-center justify-between h-10 px-3 bg-[#06090F] border-b border-[#152233] shrink-0">
      <div className="flex items-center gap-2.5">
        <button onClick={toggleSidebar}
          className="no-drag p-1.5 rounded-md hover:bg-white/[0.06] text-neutral-500 hover:text-neutral-300 transition-all duration-150"
          title="Toggle sidebar (⌘B)">
          <PanelLeft size={15} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <span className="text-[10px] font-black text-white tracking-tighter">G</span>
          </div>
          <span className="text-[13px] font-semibold text-neutral-200 tracking-tight">PokerGTO</span>
          <span className="text-[13px] font-normal text-neutral-500">Trainer</span>
        </div>

        <div className="w-px h-4 bg-[#1E293B] mx-1" />
        <span className="text-[11px] text-neutral-500 font-medium tracking-wide">
          {routeLabels[activeRoute] || 'PokerGTO'}
        </span>

        {isWeb && user && <TierBadge />}
      </div>

      <div className="flex items-center no-drag gap-1">
        {isWeb && user && (
          <>
            <span className="text-[10px] text-neutral-500 flex items-center gap-1">
              <User size={11} />
              {user.email?.split('@')[0]}
            </span>
            <button onClick={signOut}
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-neutral-500 hover:text-neutral-300 transition-all duration-150"
              title="Sign out">
              <LogOut size={13} />
            </button>
          </>
        )}
        <button onClick={() => window.close()}
          className="p-1.5 rounded-md hover:bg-red-500/15 text-neutral-500 hover:text-red-400 transition-all duration-150"
          title="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
