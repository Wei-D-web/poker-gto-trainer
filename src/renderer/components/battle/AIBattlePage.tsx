/**
 * AIBattlePage — Poker AI 对战主页面
 *
 * Free users: 3 hands/day
 * Starter: 10 hands/day
 * Pro/Lifetime/Developer: unlimited
 */
import { useState, useCallback } from 'react'
import { useGameStore, getDailyLimit, getHandsRemaining } from '../../stores/gameStore'
import { useAuth } from '../../contexts/AuthContext'
import { PlayerSeat } from './PlayerSeat'
import { CommunityCards } from './CommunityCards'
import { ActionBar } from './ActionBar'
import { PotDisplay } from './PotDisplay'
import { HandResultModal } from './HandResultModal'
import { GameHUD } from './GameHUD'
import { UpgradePrompt } from '../common/SubscriptionGate'
import { cn } from '../../lib/utils'
import { Zap, Swords } from 'lucide-react'
import type { Position } from '../../../shared/types/poker'
import type { GameAction } from '../../services/game-simulator'

export default function AIBattlePage() {
  const { tier, isTrialing } = useAuth()
  const effectiveTier = tier || 'free'
  const dailyLimit = getDailyLimit(effectiveTier)
  const remaining = getHandsRemaining(effectiveTier)

  const {
    gameState, sessionStats, isAIThinking, showResult,
    newHand, heroAction, dismissResult, resetSession,
  } = useGameStore()

  const [hasStarted, setHasStarted] = useState(false)

  // ── Trial expired check (free tier, no trial) ──
  const trialExpired = effectiveTier === 'free' && !isTrialing

  // ── Start new hand ──
  const handleNewHand = useCallback(() => {
    if (remaining <= 0 && dailyLimit !== Infinity) return
    // Random position per hand for variety
    const positions: Position[] = [0, 1, 2, 3, 4, 5]
    const heroPos = positions[Math.floor(Math.random() * 3)] // BTN (3) or CO (2) or MP (1)
    const villainPos = heroPos === 3 ? 5 : 3 // If hero is BTN, villain in BB; otherwise hero in position vs BTN
    newHand(heroPos, villainPos, 100)
    setHasStarted(true)
  }, [newHand, remaining, dailyLimit])

  const handleHeroAction = useCallback((action: { type: GameAction['type']; amount?: number }) => {
    heroAction(action)
  }, [heroAction])

  const handleDismiss = useCallback(() => {
    dismissResult()
  }, [dismissResult])

  // ── Trial expired ──
  if (trialExpired) {
    return <UpgradePrompt feature="aigame" />
  }

  // ── Lobby screen (before first hand) ──
  if (!hasStarted || !gameState) {
    return (
      <div className="flex flex-col h-full">
        <GameHUD
          sessionStats={sessionStats}
          handsPlayed={sessionStats.handsPlayed}
          dailyLimit={dailyLimit}
          handsRemaining={remaining}
          isAIThinking={false}
          onNewHand={handleNewHand}
          onReset={resetSession}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto">
              <Swords size={36} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-200 mb-2">AI 对战</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                跟 GTO 风格 AI 打单挑，就像在真实的线上牌桌上一样。
                <br />AI 会根据手牌强度和牌面纹理做出合理决策。
              </p>
            </div>

            {/* Daily limit info */}
            {dailyLimit !== Infinity && (
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 px-4">
                <Zap size={14} className="text-amber-400" />
                今日剩余 <span className="text-amber-400 font-bold font-mono">{remaining}</span> / {dailyLimit} 局
                <br />
                <span className="text-neutral-600">升级到 Pro 可无限畅玩</span>
              </div>
            )}

            <button
              onClick={handleNewHand}
              disabled={remaining <= 0 && dailyLimit !== Infinity}
              className={cn(
                'px-8 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95',
                'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20',
                (remaining <= 0 && dailyLimit !== Infinity) && 'opacity-30 cursor-not-allowed bg-neutral-700 hover:bg-neutral-700',
              )}
            >
              {remaining <= 0 && dailyLimit !== Infinity ? '今日限额已用完' : '开始对局 🃏'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Table view ──
  const { hero, villain, board, pot, street, currentActor, phase, lastAction } = gameState

  return (
    <div className="flex flex-col h-full">
      <GameHUD
        sessionStats={sessionStats}
        handsPlayed={sessionStats.handsPlayed}
        dailyLimit={dailyLimit}
        handsRemaining={remaining}
        isAIThinking={isAIThinking}
        onNewHand={handleNewHand}
        onReset={resetSession}
      />

      {/* Table */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6 relative overflow-hidden">
        {/* Background felt texture */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800/10 via-transparent to-transparent pointer-events-none" />

        {/* AI side */}
        <PlayerSeat
          name={villain.name}
          isHero={false}
          stack={villain.stack}
          currentBet={villain.currentBet}
          holeCards={villain.holeCardsDisplay}
          folded={villain.folded}
          isAllIn={villain.isAllIn}
          isActing={currentActor === 'villain' && phase !== 'showdown'}
          isWinner={gameState.result?.winner === 'villain'}
          position={gameState.villainPosition}
          showCards={phase === 'showdown'}
          lastAction={currentActor === 'hero' ? lastAction : undefined}
        />

        {/* Board + Pot */}
        <div className="flex flex-col items-center gap-3 relative z-10">
          <CommunityCards cards={board} street={street} />
          <PotDisplay pot={pot} street={phase === 'showdown' ? 'showdown' : street} />
        </div>

        {/* Hero side */}
        <PlayerSeat
          name={hero.name}
          isHero={true}
          stack={hero.stack}
          currentBet={hero.currentBet}
          holeCards={hero.holeCardsDisplay}
          folded={hero.folded}
          isAllIn={hero.isAllIn}
          isActing={currentActor === 'hero' && phase !== 'showdown'}
          isWinner={gameState.result?.winner === 'hero'}
          position={gameState.heroPosition}
          lastAction={currentActor === 'villain' ? lastAction : undefined}
        />

        {/* Action buttons */}
        <div className="relative z-10">
          {phase !== 'showdown' && currentActor === 'hero' ? (
            <ActionBar
              gameState={gameState}
              onAction={handleHeroAction}
              disabled={isAIThinking}
            />
          ) : (
            phase === 'showdown' && !showResult && (
              <button
                onClick={handleNewHand}
                disabled={remaining <= 0 && dailyLimit !== Infinity}
                className="px-6 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold text-xs hover:border-neutral-600 transition-colors"
              >
                再来一局
              </button>
            )
          )}
        </div>

        {/* Action log */}
        <div className="absolute bottom-2 right-4 max-h-24 overflow-y-auto text-right space-y-0.5">
          {gameState.actions.slice(-5).map((a, i) => (
            <p key={i} className="text-[10px] text-neutral-600">
              {a.player === 'hero' ? 'Hero' : 'AI'} {a.type} {a.amount > 0 ? `$${a.amount}` : ''}
            </p>
          ))}
        </div>
      </div>

      {/* Result modal */}
      {showResult && gameState.result && (
        <HandResultModal
          result={gameState.result}
          gameState={gameState}
          onNewHand={handleNewHand}
          onClose={handleDismiss}
        />
      )}
    </div>
  )
}
