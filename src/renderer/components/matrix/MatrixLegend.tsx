/**
 * Professional frequency legend — PioSolver/GTOWizard-grade.
 * Shows the 7-stop heatmap gradient from empty (dark) to 100% (red).
 */
export function MatrixLegend() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Range</span>

      {/* Discrete color stops */}
      <div className="flex items-center gap-[2px]">
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#0D1219' }} title="0%" />
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#0A2E1F' }} title="15%" />
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#0B5C3B' }} title="30%" />
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#0D8C56' }} title="50%" />
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#D4850A' }} title="70%" />
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#E04A1A' }} title="90%" />
        <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#E0243F' }} title="100%" />
      </div>

      {/* Labels */}
      <span className="text-[10px] text-neutral-600 font-medium">0%</span>

      {/* Continuous gradient bar */}
      <div
        className="w-14 h-1.5 rounded-full"
        style={{
          background: 'linear-gradient(to right, #0D1219, #0A2E1F, #0B5C3B, #0D8C56, #D4850A, #E04A1A, #E0243F)',
        }}
      />

      <span className="text-[10px] text-neutral-600 font-medium">100%</span>
    </div>
  )
}
