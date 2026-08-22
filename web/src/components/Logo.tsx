// Sunrise + flowing horizon — a workday beginning and moving through its shape.
// Reads as "day" (the sun) and "flow" (the wave) without spelling either out.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="8.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M2.5 16.5c2-2 4-2 6 0s4 2 6 0s4-2 6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
