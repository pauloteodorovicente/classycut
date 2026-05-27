import { useEffect, useRef } from 'react'

const BASE_TITLE = 'ClassyCut — Editor de Vídeo Classyco'

/**
 * Updates the browser tab title to signal job activity to the user.
 * - Active jobs  → "⏳ ClassyCut …"
 * - Just finished → "✓ ClassyCut …" (reverts on window focus or after 8s)
 * - Idle         → normal title
 */
export function useTabBadge(activeJobCount: number) {
  const prevCount = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Cancel any pending reset from a previous completion
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    if (activeJobCount > 0) {
      document.title = `⏳ ${BASE_TITLE}`
    } else if (prevCount.current > 0) {
      // Jobs just finished while we were tracking them
      document.title = `✓ ${BASE_TITLE}`

      const reset = () => {
        document.title = BASE_TITLE
      }
      const timer = setTimeout(reset, 8000)
      window.addEventListener('focus', reset, { once: true })

      cleanupRef.current = () => {
        clearTimeout(timer)
        window.removeEventListener('focus', reset)
        document.title = BASE_TITLE
      }
    }
    // No else: if both counts are 0 (initial render), don't touch the title

    prevCount.current = activeJobCount
  }, [activeJobCount])

  // Restore title on unmount (e.g. navigating away from editor)
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
      document.title = BASE_TITLE
    }
  }, [])
}
