/**
 * Export utilities — screenshot, PDF, CSV, JSON
 */

/** Capture a DOM element as a PNG image and trigger download */
export async function captureElementAsPNG(
  element: HTMLElement,
  filename: string = 'range-export.png'
): Promise<void> {
  try {
    // Use html-to-image approach via canvas
    const html2canvas = await import('html2canvas-pro')
    const canvas = await html2canvas.default(element, {
      backgroundColor: '#0A0A0A',
      scale: 2,
    })

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  } catch (err) {
    console.error('Screenshot failed:', err)
    // Fallback: use basic canvas
    fallbackCapture(element, filename)
  }
}

/** Fallback screenshot using basic canvas */
function fallbackCapture(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.width = rect.width * 2
  canvas.height = rect.height * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0A0A0A'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Copy text content
  const text = element.textContent || ''
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '14px monospace'
  ctx.fillText(text, 20, 40)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

/** Export strategy data as JSON */
export function exportAsJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Export range data as CSV */
export function exportAsCSV(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  }
}
