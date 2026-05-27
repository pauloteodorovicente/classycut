import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useTranscriptionStore } from '../stores/transcriptionStore'
import { getJob } from '../api/jobs'
import type { TranscriptionSegment } from '../types/transcription'

/**
 * Polls the active transcription job regardless of which tool tab is open.
 * Mount once in EditorPage so the poll survives tab navigation.
 */
export function useTranscriptionPoller() {
  const {
    transcribeJobId,
    setSegments,
    setLanguage,
    setTranscribeJobId,
    setCompletedTranscriptionJobId,
  } = useTranscriptionStore()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    if (!transcribeJobId) return

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(transcribeJobId)

        if (job.status === 'done' && job.result_json) {
          const result = JSON.parse(job.result_json)
          setSegments(result.segments as TranscriptionSegment[])
          setLanguage(result.language)
          setCompletedTranscriptionJobId(transcribeJobId)
          setTranscribeJobId(null)
          clearInterval(pollRef.current!)
          pollRef.current = null
          toast.success(`Transcrição concluída! Idioma: ${result.language}`)
        } else if (job.status === 'error') {
          setTranscribeJobId(null)
          clearInterval(pollRef.current!)
          pollRef.current = null
          toast.error(`Erro na transcrição: ${job.error_message || 'Falha'}`)
        }
      } catch {
        // keep polling on transient network errors
      }
    }, 2000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [
    transcribeJobId,
    setSegments,
    setLanguage,
    setTranscribeJobId,
    setCompletedTranscriptionJobId,
  ])
}
