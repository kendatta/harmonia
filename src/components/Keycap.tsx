/** 13×13 keycap. Stroke and label colors live in CSS token variables. */
export function Keycap({
  code,
  label,
  x,
  y,
  phase,
}: {
  code: string;
  label: string;
  x: number;
  y: number;
  phase: "enter" | "shown" | "leaving";
}) {
  const className = phase === "shown" ? "keycap is-in" : phase === "leaving" ? "keycap is-out" : "keycap";
  return (
    <g className={className} data-keycap={code} aria-hidden="true" transform={`translate(${x} ${y})`}>
      <rect className="keycap-shape" x={-6.5} y={-6.5} width={13} height={13} rx={3} />
      <text className="keycap-label" textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}
