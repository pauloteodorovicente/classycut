import { useState, useEffect } from 'react'
import { getWaveform } from '../api/media'

type FetchState = { id: string; data: number[] } | null

export function useWaveform(
  mediaId: string | null | undefined,
  mediaType?: 'video' | 'audio' | 'image'
) {
  const [fetchState, setFetchState] = useState<FetchState>(null)

  useEffect(() => {
    if (!mediaId) return
    let cancelled = false
    getWaveform(mediaId, 800)
      .then((data) => {
        if (!cancelled) setFetchState({ id: mediaId, data })
      })
      .catch(() => {
        if (!cancelled) setFetchState(null)
      })
    return () => { cancelled = true }
  }, [mediaId])

  const waveformData = fetchState !== null && fetchState.id === mediaId ? fetchState.data : []
  const isLoading = !!mediaId && fetchState?.id !== mediaId
  const waveformColor =
    mediaType === 'audio'
      ? 'rgba(72, 187, 120, 0.5)'
      : 'rgba(99, 179, 237, 0.5)'

  return { waveformData, isLoading, waveformColor }
}
