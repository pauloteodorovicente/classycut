import type { ReactNode } from 'react'

interface AppShellProps {
  sidebar: ReactNode
  preview: ReactNode
  timeline: ReactNode
  toolbar: ReactNode
}

export default function AppShell({ sidebar, preview, timeline, toolbar }: AppShellProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Top toolbar */}
      {toolbar}

      {/* Main area: sidebar + preview */}
      <div className="flex-1 flex min-h-0">
        {sidebar}
        <div className="flex-1 flex flex-col min-w-0 p-2 gap-2">
          {preview}
        </div>
      </div>

      {/* Timeline at bottom */}
      {timeline}
    </div>
  )
}
