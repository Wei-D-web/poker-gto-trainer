import { useState } from 'react'
import { useTrainingStore } from '../../stores/trainingStore'
import { POSITION_LABELS, type Position } from '@shared/types/poker'
import type { TrainingConfig, TrainingDifficulty } from '@shared/types/training'
import { cn } from '../../lib/utils'
import { Play, Target, Layers, Gauge, Route } from 'lucide-react'

const POSITIONS: Position[] = [0, 1, 2, 3, 4, 5]
const STACK_DEPTHS = [20, 30, 50, 75, 100, 150]
const STREETS: Array<'preflop' | 'flop' | 'turn' | 'river'> = ['preflop', 'flop', 'turn', 'river']

export function TrainingConfigPanel() {
  const setConfig = useTrainingStore((s) => s.setConfig)
  const startSession = useTrainingStore((s) => s.startSession)

  const [gameType, setGameType] = useState<'cash' | 'tournament'>('cash')
  const [selectedPositions, setSelectedPositions] = useState<Position[]>([3, 2, 0])
  const [selectedDepths, setSelectedDepths] = useState<number[]>([100, 50])
  const [selectedStreets, setSelectedStreets] = useState<Array<'preflop' | 'flop' | 'turn' | 'river'>>(['preflop', 'flop'])
  const [difficulty, setDifficulty] = useState<TrainingDifficulty>('medium')
  const [questionCount, setQuestionCount] = useState(20)

  const togglePosition = (pos: Position) => {
    setSelectedPositions(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])
  }
  const toggleDepth = (depth: number) => {
    setSelectedDepths(prev => prev.includes(depth) ? prev.filter(d => d !== depth) : [...prev, depth])
  }
  const toggleStreet = (street: 'preflop' | 'flop' | 'turn' | 'river') => {
    setSelectedStreets(prev => prev.includes(street) ? prev.filter(s => s !== street) : [...prev, street])
  }

  const handleStart = () => {
    const config: TrainingConfig = {
      gameType,
      positions: selectedPositions.length > 0 ? selectedPositions : [3],
      stackDepths: selectedDepths.length > 0 ? selectedDepths : [100],
      streets: selectedStreets.length > 0 ? selectedStreets : ['preflop'],
      potTypes: ['SRP', '3BP'],
      difficulty,
      questionCount,
    }
    setConfig(config)
    startSession()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-neutral-200 mb-1">Configure Training Session</h3>
        <p className="text-xs text-neutral-500">Customize the scenarios you want to practice</p>
      </div>

      {/* Game Type */}
      <section>
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Target size={11} /> Game Type
        </label>
        <div className="flex gap-2">
          {(['cash', 'tournament'] as const).map(gt => (
            <button key={gt} onClick={() => setGameType(gt)}
              className={cn(
                'px-4 py-2.5 text-sm rounded-xl font-semibold transition-all flex items-center gap-2',
                gameType === gt
                  ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25'
                  : 'bg-[#0B1019] text-neutral-400 hover:bg-[#0F141C] border border-[#1C2A3D]',
              )}>
              {gt === 'cash' ? '💵' : '🏆'} {gt === 'cash' ? 'Cash' : 'MTT'}
            </button>
          ))}
        </div>
      </section>

      {/* Positions */}
      <section>
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Layers size={11} /> Positions
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {POSITIONS.map(pos => (
            <button key={pos} onClick={() => togglePosition(pos)}
              className={cn(
                'px-3.5 py-2 text-sm rounded-lg font-semibold transition-all',
                selectedPositions.includes(pos)
                  ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25'
                  : 'bg-[#0B1019] text-neutral-500 hover:text-neutral-300 border border-[#1C2A3D]',
              )}>
              {POSITION_LABELS[pos]}
            </button>
          ))}
        </div>
      </section>

      {/* Stack Depths */}
      <section>
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Gauge size={11} /> Stack Depths
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {STACK_DEPTHS.map(depth => (
            <button key={depth} onClick={() => toggleDepth(depth)}
              className={cn(
                'px-3.5 py-2 text-sm rounded-lg font-semibold transition-all',
                selectedDepths.includes(depth)
                  ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25'
                  : 'bg-[#0B1019] text-neutral-500 hover:text-neutral-300 border border-[#1C2A3D]',
              )}>
              {depth}bb
            </button>
          ))}
        </div>
      </section>

      {/* Streets */}
      <section>
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Route size={11} /> Streets
        </label>
        <div className="flex gap-1.5">
          {STREETS.map(street => (
            <button key={street} onClick={() => toggleStreet(street)}
              className={cn(
                'px-4 py-2 text-sm rounded-lg font-semibold transition-all capitalize',
                selectedStreets.includes(street)
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25'
                  : 'bg-[#0B1019] text-neutral-500 hover:text-neutral-300 border border-[#1C2A3D]',
              )}>
              {street}
            </button>
          ))}
        </div>
      </section>

      {/* Difficulty */}
      <section>
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Difficulty</label>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as TrainingDifficulty[]).map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={cn(
                'px-5 py-2.5 text-sm rounded-xl font-semibold transition-all capitalize',
                difficulty === d
                  ? d === 'easy'
                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25'
                    : d === 'medium'
                      ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25'
                      : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25'
                  : 'bg-[#0B1019] text-neutral-500 hover:text-neutral-300 border border-[#1C2A3D]',
              )}>
              {d === 'easy' ? '⭐' : d === 'medium' ? '⭐⭐' : '⭐⭐⭐'} {d}
            </button>
          ))}
        </div>
      </section>

      {/* Question Count */}
      <section>
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
          Questions: <span className="text-neutral-200 font-bold">{questionCount}</span>
        </label>
        <input type="range" min={5} max={50} step={5} value={questionCount}
          onChange={(e) => setQuestionCount(parseInt(e.target.value))} className="w-full" />
        <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
          <span>5</span><span>50</span>
        </div>
      </section>

      {/* Start */}
      <button onClick={handleStart}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_2px_16px_rgba(16,185,129,0.25)] active:scale-[0.98]">
        <Play size={17} />
        Start Training Session
      </button>
    </div>
  )
}
