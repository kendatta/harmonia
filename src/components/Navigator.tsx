import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import { displaySymbol, keyLabel } from "../theory/chords";
import { describeChordInKey, getContinuations } from "../theory/continuations";
import { FRAME, arcPath, fifthMarkers, layoutContinuations, type PlacedChord } from "../theory/layout";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { GROUP_COLOR, pivotCaption } from "./groupMeta";

const SPRING = { stiffness: 280, damping: 32, mass: 0.8 };

function useSvgTranslate(x: number, y: number, reduced: boolean) {
  const mx = useSpring(x, SPRING);
  const my = useSpring(y, SPRING);
  const ref = useRef<SVGGElement>(null);

  const setNode = useCallback(
    (node: SVGGElement | null) => {
      ref.current = node;
      if (node) node.setAttribute("transform", `translate(${mx.get()} ${my.get()})`);
    },
    [mx, my],
  );

  useEffect(() => {
    if (reduced) {
      mx.jump(x);
      my.jump(y);
    } else {
      mx.set(x);
      my.set(y);
    }
  }, [mx, my, reduced, x, y]);

  useEffect(() => {
    const apply = () => {
      ref.current?.setAttribute("transform", `translate(${mx.get()} ${my.get()})`);
    };
    const unsubX = mx.on("change", apply);
    const unsubY = my.on("change", apply);
    return () => {
      unsubX();
      unsubY();
    };
  }, [mx, my]);

  return setNode;
}

function NodeShape({ group, pivot, r, strong }: { group: PlacedChord["continuation"]["group"]; pivot: boolean; r: number; strong: boolean }) {
  const color = GROUP_COLOR[group];
  const common = {
    fill: color,
    fillOpacity: strong ? 0.22 : 0.1,
    stroke: color,
    strokeWidth: strong ? 1.8 : 1.15,
  };

  if (group === "secondary") {
    return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} {...common} />;
  }
  if (group === "borrowed") {
    const points = Array.from({ length: 6 }, (_, index) => {
      const angle = ((index * 60 - 90) * Math.PI) / 180;
      return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
    }).join(" ");
    return <polygon points={points} {...common} />;
  }
  return (
    <>
      <circle r={r} {...common} />
      {pivot ? <circle r={r - 6} fill="none" stroke={color} strokeWidth={1} opacity={0.8} /> : null}
    </>
  );
}

function OrbitNode({
  node,
  hovered,
  onHover,
  onPick,
}: {
  node: PlacedChord;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onPick: (node: PlacedChord) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const setNode = useSvgTranslate(node.x, node.y, reduced);
  const move = node.continuation;
  const color = GROUP_COLOR[move.group];
  const symbol = displaySymbol(move.symbol);
  const pivot = move.group === "pivot";
  const symbolSize = symbol.length >= 5 ? 11 : symbol.length >= 4 ? 12 : 14;

  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.22 }}>
      <g
        ref={setNode}
        className="orbit-node"
        role="button"
        tabIndex={0}
        data-testid={`orbit-${move.id}`}
        data-symbol={move.symbol}
        data-group={move.group}
        aria-label={`${symbol}, ${move.roman}. ${move.detail}`}
        onMouseEnter={() => onHover(move.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(move.id)}
        onBlur={() => onHover(null)}
        onClick={() => onPick(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPick(node);
          }
        }}
      >
        <NodeShape group={move.group} pivot={pivot} r={node.r} strong={move.strong || hovered} />
        <text y={pivot ? -11 : -6} textAnchor="middle" className="node-roman" fill={color}>
          {move.roman}
        </text>
        <text y={pivot ? 5 : 11} textAnchor="middle" className="node-symbol" fontSize={symbolSize}>
          {symbol}
        </text>
        {move.pivotKind ? (
          <text y={18} textAnchor="middle" className="node-relation" fill={color}>
            {pivotCaption(move.pivotKind)}
          </text>
        ) : null}
        <title>{move.detail}</title>
      </g>
    </motion.g>
  );
}

export function Navigator() {
  const center = useHarmonyStore((state) => state.center);
  const key = useHarmonyStore((state) => state.key);
  const playbackStep = useHarmonyStore((state) => state.playbackStep);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const choose = useHarmonyStore((state) => state.chooseContinuation);
  const replay = useHarmonyStore((state) => state.replayCenter);
  const stop = useHarmonyStore((state) => state.stopPlayback);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const symbol = playbackStep?.symbol ?? center.symbol;
  const visualKey = playbackStep?.key ?? key;
  const moves = useMemo(() => getContinuations(symbol, visualKey), [symbol, visualKey]);
  const nodes = useMemo(() => layoutContinuations(moves, visualKey), [moves, visualKey]);
  const markers = useMemo(() => fifthMarkers(visualKey, nodes), [visualKey, nodes]);
  const analysis = useMemo(() => describeChordInKey(symbol, visualKey), [symbol, visualKey]);
  const hovered = nodes.find((node) => node.continuation.id === hoverId)?.continuation ?? null;
  const reduced = useReducedMotion() ?? false;

  function pick(node: PlacedChord) {
    if (isPlaying) {
      stop();
      return;
    }
    choose(node.continuation);
  }

  return (
    <div className="stage-card" data-testid="navigator">
      <svg className="orbit-svg" viewBox={`0 0 ${FRAME.size} ${FRAME.size}`} role="img" aria-label="Mapa harmônico">
        <circle className="guide" cx={FRAME.c} cy={FRAME.c} r={FRAME.rDiatonic} />
        <circle className="guide" cx={FRAME.c} cy={FRAME.c} r={FRAME.rColor} />
        <circle className="guide" cx={FRAME.c} cy={FRAME.c} r={FRAME.rPivot} />
        <path className="sector tonic" d={arcPath(FRAME.c, FRAME.c, FRAME.rDiatonic, 310, 100)} />
        <path className="sector dominant" d={arcPath(FRAME.c, FRAME.c, FRAME.rDiatonic, 70, 100)} />
        <path className="sector subdominant" d={arcPath(FRAME.c, FRAME.c, FRAME.rDiatonic, 190, 100)} />
        <path className="sector secondary" d={arcPath(FRAME.c, FRAME.c, FRAME.rColor, 48, 120)} />
        <path className="sector borrowed" d={arcPath(FRAME.c, FRAME.c, FRAME.rColor, 200, 120)} />

        {markers.map((marker) => (
          <text
            key={`${marker.angle}-${marker.label}`}
            x={marker.x}
            y={marker.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={marker.tonic ? "fifth-label is-tonic" : "fifth-label"}
          >
            {marker.label}
          </text>
        ))}

        {nodes.map((node) => (
          <motion.line
            key={`line-${node.continuation.id}`}
            x1={FRAME.c}
            y1={FRAME.c}
            initial={false}
            animate={{ x2: node.x, y2: node.y }}
            transition={reduced ? { duration: 0 } : { type: "spring", ...SPRING }}
            stroke={GROUP_COLOR[node.continuation.group]}
            strokeWidth={node.continuation.strong ? 1.25 : 0.8}
            strokeOpacity={node.continuation.strong ? 0.55 : 0.22}
          />
        ))}

        <g
          className={isPlaying ? "center-chord is-playing" : "center-chord"}
          transform={`translate(${FRAME.c} ${FRAME.c})`}
          role="button"
          tabIndex={0}
          data-testid="center-chord"
          data-symbol={symbol}
          aria-label={`${displaySymbol(symbol)}, ${analysis.roman}. Toque para ouvir.`}
          onClick={() => replay()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              replay();
            }
          }}
        >
          <circle className="center-disc" r={FRAME.centerR} />
          <circle className="center-pulse" r={FRAME.centerR + 8} />
          <AnimatePresence mode="wait">
            <motion.g
              key={`${symbol}-${visualKey.tonic}-${visualKey.mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
            >
              <text y={-16} textAnchor="middle" className="center-roman" fill={GROUP_COLOR[analysis.group]}>
                {analysis.roman}
              </text>
              <text y={16} textAnchor="middle" className="center-symbol" fontSize={displaySymbol(symbol).length >= 4 ? 30 : 38}>
                {displaySymbol(symbol)}
              </text>
            </motion.g>
          </AnimatePresence>
          <text y={FRAME.centerR + 22} textAnchor="middle" className="center-key">
            {keyLabel(visualKey)}
          </text>
        </g>

        <AnimatePresence>
          {nodes.map((node) => (
            <OrbitNode key={node.continuation.id} node={node} hovered={hoverId === node.continuation.id} onHover={setHoverId} onPick={pick} />
          ))}
        </AnimatePresence>
      </svg>
      <p className="orbit-detail" aria-live="polite">
        {hovered
          ? hovered.detail
          : isPlaying
            ? "Reproduzindo o caminho. O centro acompanha o acorde que está soando."
            : "Passe o cursor sobre um caminho para ler a função. O traço mais firme é um passo provável a partir do centro."}
      </p>
    </div>
  );
}
