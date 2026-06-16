import { useState, useMemo } from 'react'
import { preflopEquity } from '../../../../src/main/solver/equity-calculator'
import type { ComboKey } from '@shared/types/poker'
import { cn } from '../../lib/utils'
import { Target, Check, X, TrendingUp, RotateCcw } from 'lucide-react'

const COMBO_POOL: ComboKey[] = [
  'AA','KK','QQ','JJ','TT','99','88','77',
  'AKs','AQs','AJs','ATs','KQs','KJs','QJs','JTs','T9s','98s','87s',
  'AKo','AQo','AJo','KQo',
]

function randomCombo(): ComboKey { return COMBO_POOL[Math.floor(Math.random() * COMBO_POOL.length)] }

interface Question {
  hero: ComboKey; villain: ComboKey; correctEquity: number
}

export function EquityTrainerPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [guess, setGuess] = useState(50)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [started, setStarted] = useState(false)
  const [count, setCount] = useState(10)

  const generateQuestions = () => {
    const qs: Question[] = []
    for (let i = 0; i < count; i++) {
      const hero = randomCombo(); let villain = randomCombo()
      while (villain === hero) villain = randomCombo()
      qs.push({ hero, villain, correctEquity: Math.round(preflopEquity(hero, villain) * 100) })
    }
    setQuestions(qs); setCurrent(0); setGuess(50); setAnswered(false); setScore(0); setTotal(0); setStarted(true)
  }

  const submitGuess = () => {
    const q = questions[current]
    const diff = Math.abs(guess - q.correctEquity)
    if (diff <= 5) setScore(s => s + 1)
    setTotal(t => t + 1)
    setAnswered(true)
  }

  const nextQuestion = () => {
    if (current + 1 >= questions.length) { setStarted(false); return }
    setCurrent(c => c + 1); setGuess(50); setAnswered(false)
  }

  const diff = questions[current] ? Math.abs(guess - questions[current].correctEquity) : 0
  const isClose = diff <= 5
  const accuracy = total > 0 ? Math.round(score / total * 100) : 0

  if (!started) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="page-header">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Target size={18} className="text-cyan-400" /></div>
            <div><h2 className="text-sm font-semibold text-neutral-200">Equity Trainer</h2><p className="text-xs text-neutral-500">Train your equity estimation accuracy</p></div></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <Target size={48} className="text-cyan-400/40 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-neutral-200 mb-2">Preflop Equity Quiz</h3>
              <p className="text-sm text-neutral-500 mb-4">Estimate the equity of one hand vs another</p>
              <div className="flex items-center gap-3 justify-center mb-6">
                <span className="text-xs text-neutral-500">Questions:</span>
                {[5,10,20,30].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={cn('px-3 py-1.5 text-xs rounded-lg font-semibold transition-all',
                      count === n ? 'bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/25' : 'bg-[#0F141C] text-neutral-500')}>{n}</button>
                ))}
              </div>
              <button onClick={generateQuestions}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-[0_2px_16px_rgba(6,182,212,0.2)]">
                Start Quiz
              </button>
            </div>
            {total > 0 && (
              <div className="text-xs text-neutral-500">Previous: {score}/{total} ({accuracy}%)</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Target size={18} className="text-cyan-400" /></div>
          <div className="flex-1"><h2 className="text-sm font-semibold text-neutral-200">Equity Trainer</h2><p className="text-xs text-neutral-500">{current + 1}/{questions.length} · Score: {score}/{total}</p></div>
          <button onClick={() => setStarted(false)} className="text-xs text-neutral-500 hover:text-neutral-300"><RotateCcw size={13} /></button>
        </div>
        <div className="h-1 bg-[#0F141C] rounded-full overflow-hidden mt-2">
          <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 animate-fade-in">
          {/* Hand matchup */}
          <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="w-20 h-24 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center mb-2">
                  <span className="text-2xl font-black text-blue-400 font-mono">{q.hero}</span>
                </div>
                <span className="text-[10px] text-blue-400 font-medium">Hero</span>
              </div>
              <span className="text-2xl text-neutral-700 font-bold">vs</span>
              <div className="text-center">
                <div className="w-20 h-24 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500/30 flex items-center justify-center mb-2">
                  <span className="text-2xl font-black text-red-400 font-mono">{q.villain}</span>
                </div>
                <span className="text-[10px] text-red-400 font-medium">Villain</span>
              </div>
            </div>

            {!answered ? (
              <>
                <p className="text-sm text-neutral-400 mb-4">What is {q.hero}'s equity vs {q.villain}?</p>
                <div className="flex items-center gap-3 mb-4">
                  <input type="range" min={0} max={100} value={guess} onChange={e => setGuess(Number(e.target.value))}
                    className="flex-1" />
                  <span className="text-2xl font-black text-neutral-200 w-14 text-right">{guess}%</span>
                </div>
                <button onClick={submitGuess}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all">
                  Submit
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className={cn('rounded-xl p-4', isClose ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20')}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {isClose ? <Check size={16} className="text-emerald-400" /> : <X size={16} className="text-red-400" />}
                    <span className={cn('text-sm font-bold', isClose ? 'text-emerald-400' : 'text-red-400')}>
                      {isClose ? `Great! ±${diff}%` : `Off by ${diff}%`}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    Your guess: <b>{guess}%</b> · Correct: <b className="text-cyan-400">{q.correctEquity}%</b>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <div className="h-3 bg-[#0F141C] rounded-full w-40 overflow-hidden flex">
                      <div className="h-full bg-cyan-500 rounded-l-full" style={{ width: `${q.correctEquity}%` }} />
                      <div className="h-full bg-neutral-600 rounded-r-full" style={{ width: `${100 - q.correctEquity}%` }} />
                    </div>
                    <span className="text-[10px] text-neutral-500">{q.correctEquity}% / {100 - q.correctEquity}%</span>
                  </div>
                </div>
                <button onClick={nextQuestion}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all">
                  {current + 1 >= questions.length ? 'See Results' : 'Next →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
