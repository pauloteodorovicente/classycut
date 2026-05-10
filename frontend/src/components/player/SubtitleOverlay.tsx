import { usePlayerStore } from '../../stores/playerStore'
import { useTranscriptionStore } from '../../stores/transcriptionStore'

export default function SubtitleOverlay() {
  const { currentTime } = usePlayerStore()
  const { segments, subtitlesVisible } = useTranscriptionStore()

  if (!subtitlesVisible || segments.length === 0) return null

  const activeSeg = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  )

  if (!activeSeg) return null

  return (
    <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none px-4">
      <div className="bg-black/80 text-white text-sm px-4 py-2 rounded max-w-[80%] text-center leading-relaxed">
        {activeSeg.text}
      </div>
    </div>
  )
}
