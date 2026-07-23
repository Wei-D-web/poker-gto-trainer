import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useUIStore } from './stores/uiStore'
import { useDemoData } from './hooks/useDemoData'
import { Sidebar } from './components/layout/Sidebar'
import { TitleBar } from './components/layout/TitleBar'
import { SubscriptionGate, isPremiumFeature, DESKTOP_ONLY_FEATURES, isRunningInElectron } from './components/common/SubscriptionGate'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastContainer } from './components/common/ToastContainer'
import { OnboardingTour } from './components/common/OnboardingTour'
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from './hooks/useKeyboard'
import { DemoBanner } from './components/auth/DemoBanner'
import { DesktopRequiredModal, getDesktopRequiredInfo } from './components/auth/DesktopRequiredModal'
import { WelcomeFlow, shouldShowWelcome } from './components/common/WelcomeFlow'
import type { FC, LazyExoticComponent } from 'react'

// ── Lazy-loaded route components (code-split per feature) ──
const StrategyExplorer = lazy(() => import('./components/scenario/StrategyExplorer'))
const TrainingPage = lazy(() => import('./components/training/TrainingPage'))
const ComparePage = lazy(() => import('./components/hand-history/ComparePage'))
const RangeEditorPage = lazy(() => import('./components/hand-history/RangeEditorPage'))
const HandHistoryPage = lazy(() => import('./components/hand-history/HandHistoryPage'))
const HandHistoryDashboard = lazy(() => import('./components/hand-history/HandHistoryDashboard'))
const HandAnalyzerPage = lazy(() => import('./components/hand-history/HandAnalyzerPage'))
const AdvancedAnalysis = lazy(() => import('./components/scenario/AdvancedAnalysis'))
const ICMPage = lazy(() => import('./components/settings/ICMPage'))
const TurnRiverPage = lazy(() => import('./components/scenario/TurnRiverPage'))
const MultiwayPage = lazy(() => import('./components/scenario/MultiwayPage'))
const RangeBattlePage = lazy(() => import('./components/scenario/RangeBattlePage'))
const CashMttComparePage = lazy(() => import('./components/scenario/CashMttComparePage'))
const ExploitAdvisor = lazy(() => import('./components/scenario/ExploitAdvisor'))
const PlaygroundPage = lazy(() => import('./components/playground/PlaygroundPage'))
const PreflopChartsPage = lazy(() => import('./components/charts/PreflopChartsPage'))
const SpotLibraryPage = lazy(() => import('./components/spots/SpotLibraryPage'))
const ToolsPage = lazy(() => import('./components/tools/ToolsPage'))
const AnalyticsPage = lazy(() => import('./components/analytics/AnalyticsPage'))
const EquityTrainerPage = lazy(() => import('./components/training/EquityTrainerPage'))
const BluffCatcherPage = lazy(() => import('./components/training/BluffCatcherPage'))
const PremiumFeatures = lazy(() => import('./components/premium/PremiumFeatures'))
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'))
const AccountPage = lazy(() => import('./components/settings/AccountPage'))
const GuidePage = lazy(() => import('./components/guide/GuidePage'))
const SessionReviewPage = lazy(() => import('./components/session-review/SessionReviewPage'))

const ROUTES: Record<string, LazyExoticComponent<FC>> = {
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
  bluffcatcher: BluffCatcherPage,
}

/** Lightweight loading skeleton shown during route chunk loading */
function RouteSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-emerald-500 animate-spin mx-auto" />
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    </div>
  )
}

export function App() {
  const activeRoute = useUIStore((s) => s.activeRoute)
  const setActiveRoute = useUIStore((s) => s.setActiveRoute)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  // Inject demo data when in demo mode
  useDemoData()

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

  // ── Desktop-only feature gate (web only) ──
  const [desktopRequiredFeature, setDesktopRequiredFeature] = useState<string | null>(null)
  const desktopGated = !isRunningInElectron() && DESKTOP_ONLY_FEATURES.has(activeRoute)

  // Watch for desktop-only feature access on web
  useEffect(() => {
    if (desktopGated) {
      setDesktopRequiredFeature(activeRoute)
    }
  }, [activeRoute, desktopGated])

  const handleDesktopRequiredClose = useCallback(() => {
    setDesktopRequiredFeature(null)
    // Navigate to a safe feature
    setActiveRoute('explore')
  }, [setActiveRoute])

  const ActiveComponent = ROUTES[activeRoute] || HandAnalyzerPage
  const needsGate = isPremiumFeature(activeRoute) || DESKTOP_ONLY_FEATURES.has(activeRoute)

  // Get desktop feature info for the modal
  const desktopInfo = desktopRequiredFeature
    ? getDesktopRequiredInfo(desktopRequiredFeature)
    : null

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950">
      <DemoBanner />
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <Suspense fallback={<RouteSkeleton />}>
              {needsGate ? (
                <SubscriptionGate feature={activeRoute}>
                  <ActiveComponent />
                </SubscriptionGate>
              ) : (
                <ActiveComponent />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
      <OnboardingTour />

      {/* Desktop Required Modal — web users trying to access desktop-only features */}
      {desktopRequiredFeature && desktopInfo && (
        <DesktopRequiredModal
          featureId={desktopRequiredFeature}
          featureName={desktopInfo.name}
          description={desktopInfo.desc}
          onClose={handleDesktopRequiredClose}
        />
      )}

      {/* Welcome Flow — first desktop launch only */}
      {isRunningInElectron() && shouldShowWelcome() && (
        <WelcomeFlow />
      )}
    </div>
  )
}
