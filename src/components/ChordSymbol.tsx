import { fittedSize, symbolParts } from "../theory/symbol";

export function ChordSymbol({
  symbol,
  size,
  maxWidth,
  className,
}: {
  symbol: string;
  size: number;
  maxWidth?: number;
  className?: string;
}) {
  const { base, ext } = symbolParts(symbol);
  const font = fittedSize(base, ext, size, maxWidth ?? Number.POSITIVE_INFINITY);
  return (
    <span className={className} style={{ fontSize: font, fontWeight: 600, lineHeight: 1.1 }}>
      {base}
      {ext ? <sup>{ext}</sup> : null}
    </span>
  );
}

export function SvgChord({
  symbol,
  size,
  maxWidth,
  y,
  fill,
}: {
  symbol: string;
  size: number;
  maxWidth: number;
  y: number;
  fill: string;
}) {
  const { base, ext } = symbolParts(symbol);
  const font = fittedSize(base, ext, size, maxWidth);
  return (
    <text y={y} textAnchor="middle" fill={fill} fontSize={font} fontWeight={600}>
      {base}
      {ext ? (
        <tspan fontSize={font * 0.75} dy={-font * 0.34}>
          {ext}
        </tspan>
      ) : null}
    </text>
  );
}
