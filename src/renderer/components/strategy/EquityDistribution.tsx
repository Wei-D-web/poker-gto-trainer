import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import type { ComboStrategy } from '@shared/types/strategy'

interface Props {
  combos: ComboStrategy[]
  villainCombos?: ComboStrategy[]
  width?: number
  height?: number
}

export function EquityDistribution({ combos, villainCombos, width = 500, height = 200 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Compute equity distribution
  const distribution = useMemo(() => {
    const inRange = combos.filter(c => c.weight > 0.01)
    if (inRange.length === 0) return null

    // Get equities, weighted by range frequency
    const equities = inRange.map(c => ({
      equity: c.equity,
      weight: c.weight,
      combo: c.comboKey,
    })).sort((a, b) => a.equity - b.equity)

    // Compute weighted percentiles
    const totalWeight = equities.reduce((s, e) => s + e.weight, 0)
    let cumulative = 0
    const percentileData: Array<{ equity: number; percentile: number; combo: string }> = []

    for (const e of equities) {
      cumulative += e.weight
      const pct = (cumulative / totalWeight) * 100
      percentileData.push({ equity: e.equity * 100, percentile: pct, combo: e.combo })
    }

    // Stats
    const meanEquity = equities.reduce((s, e) => s + e.equity * e.weight, 0) / totalWeight
    const sortedEq = [...equities].sort((a, b) => a.equity - b.equity)
    const getPercentile = (p: number) => {
      let cum = 0
      for (const e of sortedEq) {
        cum += e.weight / totalWeight
        if (cum >= p / 100) return e.equity * 100
      }
      return sortedEq[sortedEq.length - 1]?.equity * 100 || 50
    }

    return {
      percentileData,
      meanEquity: meanEquity * 100,
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      rangeAdvantage: meanEquity > 0.5 ? 'hero' : 'villain',
      advantagePct: Math.abs(meanEquity - 0.5) * 100 * 2,
    }
  }, [combos])

  useEffect(() => {
    if (!distribution || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 30, left: 40 }
    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, w])
    const yScale = d3.scaleLinear().domain([0, 100]).range([h, 0])

    // Area generator
    const area = d3.area<{ equity: number; percentile: number }>()
      .x(d => xScale(d.equity))
      .y0(h)
      .y1(d => yScale(d.percentile))
      .curve(d3.curveMonotoneX)

    // Gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'equity-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#EF4444').attr('stop-opacity', 0.8)
    gradient.append('stop').attr('offset', '30%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.6)
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#3B82F6').attr('stop-opacity', 0.5)
    gradient.append('stop').attr('offset', '70%').attr('stop-color', '#10B981').attr('stop-opacity', 0.6)
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#10B981').attr('stop-opacity', 0.8)

    // Draw distribution area
    const data = distribution.percentileData
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#equity-gradient)')
      .attr('d', area)

    // Draw line
    const line = d3.line<{ equity: number; percentile: number }>()
      .x(d => xScale(d.equity))
      .y(d => yScale(d.percentile))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#6B7280')
      .attr('stroke-width', 1.5)
      .attr('d', line)

    // Percentile markers
    const markers = [
      { pct: distribution.p25, label: 'P25', color: '#EF4444' },
      { pct: distribution.p50, label: 'P50', color: '#F59E0B' },
      { pct: distribution.p75, label: 'P75', color: '#10B981' },
    ]

    for (const m of markers) {
      g.append('line')
        .attr('x1', xScale(m.pct)).attr('x2', xScale(m.pct))
        .attr('y1', 0).attr('y2', h)
        .attr('stroke', m.color).attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3').attr('opacity', 0.5)

      g.append('text')
        .attr('x', xScale(m.pct)).attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('fill', m.color).attr('font-size', '9px').attr('font-weight', 'bold')
        .text(m.label)

      g.append('text')
        .attr('x', xScale(m.pct)).attr('y', h + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', m.color).attr('font-size', '9px')
        .text(`${Math.round(m.pct)}%`)
    }

    // Mean line
    g.append('line')
      .attr('x1', xScale(distribution.meanEquity)).attr('x2', xScale(distribution.meanEquity))
      .attr('y1', 0).attr('y2', h)
      .attr('stroke', '#fff').attr('stroke-width', 2)

    g.append('text')
      .attr('x', xScale(distribution.meanEquity)).attr('y', -4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff').attr('font-size', '9px').attr('font-weight', 'bold')
      .text(`${Math.round(distribution.meanEquity)}%`)

    // Axes
    g.append('g').call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`))
      .attr('transform', `translate(0,${h})`)
      .selectAll('text').attr('fill', '#6B7280').attr('font-size', '8px')

    g.append('text')
      .attr('x', w / 2).attr('y', h + 28)
      .attr('text-anchor', 'middle').attr('fill', '#6B7280').attr('font-size', '9px')
      .text('胜率 (Equity)')

    g.append('text')
      .attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -35)
      .attr('text-anchor', 'middle').attr('fill', '#6B7280').attr('font-size', '9px')
      .text('累计范围%')

  }, [distribution, width, height])

  if (!distribution) return null

  return (
    <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">胜率分布</h4>
        <span className={distribution.rangeAdvantage === 'hero' ? 'text-green-400' : 'text-red-400'}>
          <span className="text-[10px] font-medium">
            {distribution.rangeAdvantage === 'hero' ? '我的范围优势' : '对手范围优势'}
          </span>
          <span className="text-xs ml-1 font-mono">{distribution.advantagePct.toFixed(1)}%</span>
        </span>
      </div>
      <svg ref={svgRef} width={width} height={height} className="w-full" />
      <div className="flex justify-between mt-2 text-[9px] text-neutral-600">
        <span className="text-red-400">弱 ←</span>
        <span>范围胜率分布</span>
        <span className="text-green-400">→ 强</span>
      </div>
    </div>
  )
}
