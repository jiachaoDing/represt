import { cycleOrbitTokens } from './cycle-orbit-tokens'

// The owning control supplies the translated day label and aria-current="date".
export function CycleTodayMarker({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none shrink-0 rounded-full ${className}`}
      style={{
        width: cycleOrbitTokens.today.size,
        height: cycleOrbitTokens.today.size,
        backgroundColor: cycleOrbitTokens.today.color,
      }}
    />
  )
}
