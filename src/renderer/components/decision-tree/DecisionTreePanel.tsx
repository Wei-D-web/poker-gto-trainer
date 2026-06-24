import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { Street } from '@shared/types/poker'

interface TreeNode {
  id: string
  label: string
  street: Street
  isHeroNode: boolean
  isActive: boolean
  children: TreeNode[]
  action?: string
  frequency?: number
  ev?: number
}

interface DecisionTreePanelProps {
  tree: TreeNode | null
  onNavigateToNode: (nodeId: string) => void
}

export function generateGameTree(
  street: Street,
  heroPosition: string,
  villainPosition: string
): TreeNode {
  const root: TreeNode = {
    id: 'root',
    label: `${heroPosition} opens 2.5bb`,
    street: 'preflop',
    isHeroNode: true,
    isActive: true,
    children: [
      {
        id: 'pf_vcall',
        label: `${villainPosition} calls`,
        street: 'preflop',
        isHeroNode: false,
        isActive: street !== 'preflop',
        action: 'call',
        frequency: 0.65,
        children: [
          {
            id: 'flop_hero',
            label: 'Flop — 轮到我行动',
            street: 'flop',
            isHeroNode: true,
            isActive: street === 'flop',
            children: [
              {
                id: 'flop_hero_bet33',
                label: 'Bet 33% pot',
                street: 'flop', isHeroNode: true, isActive: true,
                action: 'Bet 33%', frequency: 0.45, ev: 0.08,
                children: [
                  { id: 'flop_vill_fold33', label: `${villainPosition} folds`, street: 'flop', isHeroNode: false, isActive: true, action: 'fold', frequency: 0.4, children: [] },
                  { id: 'flop_vill_call33', label: `${villainPosition} calls`, street: 'flop', isHeroNode: false, isActive: true, action: 'call', frequency: 0.45, children: [
                    { id: 'turn_hero33', label: 'Turn — 轮到我行动', street: 'turn', isHeroNode: true, isActive: false, children: [] },
                  ]},
                  { id: 'flop_vill_raise33', label: `${villainPosition} raises`, street: 'flop', isHeroNode: false, isActive: true, action: 'raise', frequency: 0.15, children: [] },
                ],
              },
              {
                id: 'flop_hero_bet75',
                label: 'Bet 75% pot',
                street: 'flop', isHeroNode: true, isActive: true,
                action: 'Bet 75%', frequency: 0.25, ev: 0.12,
                children: [
                  { id: 'flop_vill_fold75', label: `${villainPosition} folds`, street: 'flop', isHeroNode: false, isActive: true, action: 'fold', frequency: 0.55, children: [] },
                  { id: 'flop_vill_call75', label: `${villainPosition} calls`, street: 'flop', isHeroNode: false, isActive: true, action: 'call', frequency: 0.35, children: [] },
                ],
              },
              {
                id: 'flop_hero_check',
                label: 'Check',
                street: 'flop', isHeroNode: true, isActive: true,
                action: 'Check', frequency: 0.30, ev: 0.03,
                children: [
                  { id: 'flop_vill_bet', label: `${villainPosition} bets`, street: 'flop', isHeroNode: false, isActive: true, action: 'bet', frequency: 0.6, children: [] },
                  { id: 'flop_vill_check', label: `${villainPosition} checks`, street: 'flop', isHeroNode: false, isActive: true, action: 'check', frequency: 0.4, children: [] },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'pf_v3bet', label: `${villainPosition} 3-bets to 10bb`, street: 'preflop',
        isHeroNode: false, isActive: false, action: '3-bet', frequency: 0.25,
        children: [{
          id: 'pf_hero_vs3bet', label: '轮到我行动 vs 3-bet', street: 'preflop', isHeroNode: true, isActive: false,
          children: [
            { id: 'pf_hero_call3bet', label: 'Call', street: 'preflop', isHeroNode: true, isActive: false, action: 'call', frequency: 0.6, children: [] },
            { id: 'pf_hero_4bet', label: '4-bet to 22bb', street: 'preflop', isHeroNode: true, isActive: false, action: '4-bet', frequency: 0.3, children: [] },
            { id: 'pf_hero_fold3bet', label: 'Fold', street: 'preflop', isHeroNode: true, isActive: false, action: 'fold', frequency: 0.1, children: [] },
          ],
        }],
      },
      { id: 'pf_vfold', label: `${villainPosition} folds`, street: 'preflop', isHeroNode: false, isActive: false, action: 'fold', frequency: 0.10, children: [] },
    ],
  }
  return root
}

export function DecisionTreePanel({ tree: externalTree, onNavigateToNode }: DecisionTreePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const renderTree = useCallback(() => {
    if (!svgRef.current || !externalTree) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = containerRef.current
    if (!container) return
    const width = container.clientWidth
    const height = container.clientHeight || 500

    svg.attr('width', width).attr('height', height)

    const treeLayout = d3.tree<TreeNode>()
      .size([width - 100, height - 80])
      .nodeSize([220, 70])

    const root = d3.hierarchy(externalTree)
    const treeData = treeLayout(root)

    const g = svg.append('g').attr('transform', 'translate(50, 40)')

    // Inner group for zoom transforms — preserves padding on zoom
    const zoomG = g.append('g')

    // Draw edges with curved paths
    zoomG.selectAll('path')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
        .x(d => d.x)
        .y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', d => (d.target.data as TreeNode).isActive ? '#334155' : '#1E293B')
      .attr('stroke-width', d => (d.target.data as TreeNode).isActive ? 1.5 : 0.8)
      .attr('stroke-dasharray', d => (d.target.data as TreeNode).isActive ? '' : '3,4')

    // Draw nodes
    const nodes = zoomG.selectAll('g.node-group')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => { onNavigateToNode(d.data.id) })

    // Glow for active hero nodes
    nodes.append('circle')
      .attr('r', d => {
        const node = d.data
        const base = node.street === 'preflop' ? 9 : node.street === 'flop' ? 8 : node.street === 'turn' ? 7 : 6
        return node.isHeroNode && node.isActive ? base + 3 : 0
      })
      .attr('fill', 'none')
      .attr('stroke', '#3B82F6')
      .attr('stroke-width', 1)
      .attr('opacity', d => (d.data.isHeroNode && d.data.isActive) ? 0.25 : 0)

    // Node circles
    nodes.append('circle')
      .attr('r', d => {
        const node = d.data
        if (node.street === 'preflop') return 8
        if (node.street === 'flop') return 7
        if (node.street === 'turn') return 6
        return 5
      })
      .attr('fill', d => {
        const node = d.data
        if (!node.isActive) return '#1E293B'
        if (node.isHeroNode) return '#3B82F6'
        return '#EF4444'
      })
      .attr('stroke', d => {
        const node = d.data
        if (!node.isActive) return '#334155'
        if (node.isHeroNode) return '#60A5FA'
        return '#F87171'
      })
      .attr('stroke-width', 1.5)
      .attr('filter', d => (d.data.isActive && d.data.isHeroNode) ? 'drop-shadow(0 0 6px rgba(59,130,246,0.4))' : 'none')

    // Node labels
    nodes.append('text')
      .attr('dy', d => d.data.isHeroNode ? -13 : 20)
      .attr('text-anchor', 'middle')
      .attr('fill', d => (d.data as TreeNode).isActive ? '#D1D5DB' : '#475569')
      .attr('font-size', '10px')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, sans-serif')
      .attr('font-weight', d => (d.data as TreeNode).isActive ? '600' : '400')
      .text(d => {
        const node = d.data
        let label = node.label
        if (node.frequency) label += ` (${Math.round(node.frequency * 100)}%)`
        if (node.ev) label += ` [${node.ev > 0 ? '+' : ''}${node.ev.toFixed(1)}]`
        return label.length > 24 ? label.slice(0, 22) + '…' : label
      })

    // Zoom — remove old listeners before re-attaching to prevent leaks
    svg.on('.zoom', null)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2.5])
      .on('zoom', (event) => { zoomG.attr('transform', event.transform) })

    svg.call(zoom)

  }, [externalTree, onNavigateToNode])

  useEffect(() => { renderTree() }, [renderTree])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-[#06090F] rounded-xl border border-[#152233]">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
