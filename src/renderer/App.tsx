import { useEffect } from 'react'
import { useUIStore } from './stores/uiStore'
import { Sidebar } from './components/layout/Sidebar'
import { TitleBar } from './components/layout/TitleBar'
import { StrategyExplorer } from './components/scenario/StrategyExplorer'
import { TrainingPage } from './components/training/TrainingPage'
import { ComparePage } from './components/hand-history/ComparePage'
import { RangeEditorPage } from './components/hand-history/RangeEditorPage'
import { HandHistoryPage } from './components/hand-history/HandHistoryPage'
import { HandHistoryDashboard } from './components/hand-history/HandHistoryDashboard'
import { HandAnalyzerPage } from './components/hand-history/HandAnalyzerPage'
import { AdvancedAnalysis } from './components/scenario/AdvancedAnalysis'
import { ICMPage } from './components/settings/ICMPage'
import { TurnRiverPage } from './components/scenario/TurnRiverPage'
import { MultiwayPage } from './components/scenario/MultiwayPage'
import { RangeBattlePage } from './components/scenario/RangeBattlePage'
import { CashMttComparePage } from './components/scenario/CashMttComparePage'
import { ExploitAdvisor } from './components/scenario/ExploitAdvisor'
import { PlaygroundPage } from './components/playground/PlaygroundPage'
import { PreflopChartsPage } from './components/charts/PreflopChartsPage'
import { SpotLibraryPage } from './components/spots/SpotLibraryPage'
import { ToolsPage } from './components/tools/ToolsPage'
import { AnalyticsPage } from './components/analytics/AnalyticsPage'
import { EquityTrainerPage } from './components/training/EquityTrainerPage'
import { PremiumFeatures } from './components/premium/PremiumFeatures'
import { SettingsPage } from './components/settings/SettingsPage'
import { AccountPage } from './components/settings/AccountPage'
import { GuidePage } from './components/guide/GuidePage'
import { SessionReviewPage } from './components/session-review/SessionReviewPage'
import { SubscriptionGate, isPremiumFeature } from './components/common/SubscriptionGate'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastContainer } from './components/common/ToastContainer'
import { OnboardingTour } from './components/common/OnboardingTour'
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from './hooks/useKeyboard'
import type { FC } from 'react'

const ROUTES: Record<string, FC> = {
  explore: StrategyExplorer,
  training: TrainingPage,
  compare: ComparePage,
  editor: RangeEditorPage,
  history: HandHistoryDashboard,
  analyzer: HandAnalyzerPage,
  advanced: AdvancedAnalysis,
  icm: ICMPage,
  turnriver: TurnRiverPage,
  multiway: MultiwayPage,
  premium: PremiumFeatures,
  analytics: AnalyticsPage,
  equitytrainer: EquityTrainerPage,
  tools: ToolsPage,
  spots: SpotLibraryPage,
  charts: PreflopChartsPage,
  playground: PlaygroundPage,
  battle: RangeBattlePage,
  cashmttcompare: CashMttComparePage,
  exploitadvisor: ExploitAdvisor,
  settings: SettingsPage,
  account: AccountPage,
  guide: GuidePage,
  review: SessionReviewPage,
}

export function App() {
  const activeRoute = useUIStore((s) => s.activeRoute)
  const setActiveRoute = useUIStore((s) => s.setActiveRoute)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.route && ROUTES[detail.route]) {
        setActiveRoute(detail.route)
      }
    }
    const onToggleSidebar = () => toggleSidebar()

    window.addEventListener('navigate', onNavigate)
    window.addEventListener('toggle-sidebar', onToggleSidebar)
    return () => {
      window.removeEventListener('navigate', onNavigate)
      window.removeEventListener('toggle-sidebar', onToggleSidebar)
    }
  }, [setActiveRoute, toggleSidebar])

  useKeyboardShortcuts(DEFAULT_SHORTCUTS)

  const ActiveComponent = ROUTES[activeRoute] || HandAnalyzerPage
  const needsGate = isPremiumFeature(activeRoute)

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            {needsGate ? (
              <SubscriptionGate feature={activeRoute}>
                <ActiveComponent />
              </SubscriptionGate>
            ) : (
              <ActiveComponent />
            )}
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
      <OnboardingTour />
    </div>
  )
}
