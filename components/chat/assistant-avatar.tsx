import { cn } from "cn"

export const assistantName = "Gauge"

// A train-cab robot in the blueprint line style: pantograph antenna, bogie wheels.
// SMIL keeps the blink and glance self-contained, with no keyframes in globals.css.
export function AssistantAvatar({
  thinking = false,
  className,
}: {
  thinking?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <path d="M12 9.5 16 5l4 4.5M13.5 4h5" />
      <rect x="6" y="9.5" width="20" height="15" rx="6" />
      <g fill="currentColor" stroke="none">
        {[12.5, 19.5].map((cx) => (
          <ellipse key={cx} cx={cx} cy="16.5" rx="1.6" ry="2.1">
            <animate
              attributeName="ry"
              values="2.1;2.1;0.25;2.1"
              keyTimes="0;0.9;0.95;1"
              dur="4.5s"
              repeatCount="indefinite"
            />
            {thinking && (
              <animate
                attributeName="cx"
                values={`${cx};${cx - 1};${cx + 1};${cx}`}
                dur="1.6s"
                repeatCount="indefinite"
              />
            )}
          </ellipse>
        ))}
      </g>
      <path d="M14.5 20.5q1.5 1.2 3 0" />
      <circle cx="11" cy="27.5" r="1.5" />
      <circle cx="21" cy="27.5" r="1.5" />
    </svg>
  )
}
