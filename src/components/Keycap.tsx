/**
 * 13×13 keycap. The rect is 12×12 so a 1px centered stroke lands on a half pixel.
 * Stroke, label, and the ghost fill come from token variables.
 */
export function Keycap({
  code,
  label,
  x,
  y,
  phase,
  ghost = false,
  hot = false,
}: {
  code: string;
  label: string;
  x: number;
  y: number;
  phase: "enter" | "shown" | "leaving";
  ghost?: boolean;
  hot?: boolean;
}) {
  const originX = Math.round(x - 6.5) + 0.5;
  const originY = Math.round(y - 6.5) + 0.5;
  const className = ["keycap", phase === "shown" ? "is-in" : phase === "leaving" ? "is-out" : "", ghost ? "is-ghost" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <g className={className} data-keycap={code} data-hot={hot ? "true" : "false"} aria-hidden="true" transform={`translate(${originX} ${originY})`}>
      <rect className="keycap-shape" width={12} height={12} rx={3} />
      <text className="keycap-label" x={6} y={6} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}
