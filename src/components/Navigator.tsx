import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { displayRoman, displaySymbol, keyLabel } from "../theory/chords";
import { describeChordInKey, getContinuations } from "../theory/continuations";
import {
  CENTER_EASE,
  CENTER_TRANSITION_MS,
  FRAME,
  degreeRays,
  layoutContinuations,
  ringLabels,
  type PlacedChord,
} from "../theory/layout";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { GROUP_COLOR, pivotCaption } from "./groupMeta";
import type { Group } from "../theory/types";

const EASE = CENTER_EASE;

function useSvgTranslate(x: number, y: number, reduced: boolean) {
  const ref = useRef<SVGGElement | null>(null);
  const pos = useRef({ x, y });

  const setNode = useCallback((node: SVGGElement | null) => {
    ref.current = node;
    if (node) node.setAttribute("transform", `translate(${pos.current.x} ${pos.current.y})`);
  }, []);

  useEffect(() => {
    const from = pos.current;
    const node = ref.current;
    if (!node || reduced || (from.x === x && from.y === y)) {
      pos.current = { x, y };
      ref.current?.setAttribute("transform", `translate(${x} ${y})`);
      return;
    }
    const controls = animate(0, 1, {
      duration: CENTER_TRANSITION_MS / 1000,
      ease: [EASE[0], EASE[1], EASE[2], EASE[3]],
      onUpdate: (t) => {
        const nx = from.x + (x - from.x) * t;
        const ny = from.y + (y - from.y) * t;
        pos.current = { x: nx, y: ny };
        ref.current?.setAttribute("transform", `translate(${nx} ${ny})`);
      },
    });
    return () => controls.stop();
  }, [reduced, x, y]);

  return setNode;
}

function polygon(sides: number, radius: number, rotationDeg: number): string {
  return Array.from({ length: sides }, (_, index) => {
    const angle = ((index * (360 / sides) + rotationDeg) * Math.PI) / 180;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(" ");
}

function shapeOf(group: Group): "circle" | "square" | "diamond" | "octagon" | "hexagon" | "double" {
  switch (group) {
    case "tonic":
      return "circle";
    case "subdominant":
      return "square";
    case "dominant":
      return "diamond";
    case "secondary":
      return "octagon";
    case "borrowed":
      return "hexagon";
    case "pivot":
      return "double";
  }
}

function NodeShape({
  group,
  r,
  state,
}: {
  group: Group;
  r: number;
  state: "default" | "strong" | "hover";
}) {
  const color = GROUP_COLOR[group];
  const emphasized = state !== "default";
  const common = {
    fill: color,
    fillOpacity: state === "hover" ? 0.38 : state === "strong" ? 0.24 : 0.1,
    stroke: state === "hover" ? "#e6e4df" : color,
    strokeWidth: state === "hover" ? 2.2 : emphasized ? 1.9 : 1.15,
  };
  const shape = shapeOf(group);

  if (shape === "square") {
    const side = r * Math.SQRT1_2 * 2;
    return <rect x={-side / 2} y={-side / 2} width={side} height={side} {...common} />;
  }
  if (shape === "diamond") {
    return <polygon points={polygon(4, r, -90)} {...common} />;
  }
  if (shape === "octagon") {
    return <polygon points={polygon(8, r, -90)} {...common} />;
  }
  if (shape === "hexagon") {
    return <polygon points={polygon(6, r, -90)} {...common} />;
  }
  return (
    <>
      <circle r={r} {...common} />
      {shape === "double" ? <circle r={r - 5} fill="none" stroke={color} strokeWidth={emphasized ? 1.4 : 1} /> : null}
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
  const roman = displayRoman(move.roman);
  const pivot = move.group === "pivot";
  const state = hovered ? "hover" : move.strong ? "strong" : "default";
  const symbolSize = symbol.length >= 5 ? 10 : symbol.length >= 4 ? 11 : 13;
  const romanSize = roman.length >= 6 ? 8 : 9;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, ease: [EASE[0], EASE[1], EASE[2], EASE[3]] }}
    >
      <g
        ref={setNode}
        className="orbit-node"
        role="button"
        tabIndex={0}
        data-testid={`orbit-${move.id}`}
        data-symbol={move.symbol}
        data-group={move.group}
        data-shape={shapeOf(move.group)}
        data-ring={node.ring}
        data-state={state}
        data-strong={move.strong ? "true" : "false"}
        aria-label={`${symbol}, ${roman}. ${move.detail}`}
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
        <NodeShape group={move.group} r={node.r} state={state} />
        <text y={pivot ? -10 : -5} textAnchor="middle" className="node-roman" fill={color} fontSize={romanSize}>
          {roman}
        </text>
        <text y={pivot ? 3 : 10} textAnchor="middle" className="node-symbol" fontSize={symbolSize}>
          {symbol}
        </text>
        {move.pivotKind ? (
          <text y={15} textAnchor="middle" className="node-relation" fill={color}>
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
  const audibleAt = useHarmonyStore((state) => state.audibleAt);
  const choose = useHarmonyStore((state) => state.chooseContinuation);
  const replay = useHarmonyStore((state) => state.replayCenter);
  const stop = useHarmonyStore((state) => state.stopPlayback);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sounding, setSounding] = useState(false);

  useEffect(() => {
    if (!audibleAt || isPlaying) {
      const clear = window.setTimeout(() => setSounding(false), 0);
      return () => window.clearTimeout(clear);
    }
    const left = 3000 - (Date.now() - audibleAt);
    if (left <= 0) {
      const clear = window.setTimeout(() => setSounding(false), 0);
      return () => window.clearTimeout(clear);
    }
    const start = window.setTimeout(() => setSounding(true), 0);
    const stop = window.setTimeout(() => setSounding(false), left);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [audibleAt, isPlaying]);

  const symbol = playbackStep?.symbol ?? center.symbol;
  const visualKey = playbackStep?.key ?? key;
  const moves = useMemo(() => getContinuations(symbol, visualKey), [symbol, visualKey]);
  const nodes = useMemo(() => layoutContinuations(moves, visualKey), [moves, visualKey]);
  const labels = useMemo(() => ringLabels(), []);
  const rays = useMemo(() => degreeRays(), []);
  const analysis = useMemo(() => describeChordInKey(symbol, visualKey), [symbol, visualKey]);
  const hovered = nodes.find((node) => node.continuation.id === hoverId)?.continuation ?? null;
  const reduced = useReducedMotion() ?? false;
  const centerState = isPlaying || sounding ? "sounding" : "idle";
  const shownSymbol = displaySymbol(symbol);
  const shownRoman = displayRoman(analysis.roman);
  const moveEase = reduced ? { duration: 0 } : { duration: CENTER_TRANSITION_MS / 1000, ease: [EASE[0], EASE[1], EASE[2], EASE[3]] as [number, number, number, number] };

  function pick(node: PlacedChord) {
    if (isPlaying) {
      stop();
      return;
    }
    choose(node.continuation);
  }

  return (
    <div className="stage-card" data-testid="navigator">
      <svg
        className="orbit-svg"
        viewBox={`0 0 ${FRAME.size} ${FRAME.size}`}
        role="img"
        aria-label="Mapa harmônico"
        data-transition-ms={CENTER_TRANSITION_MS}
      >
        {rays.map((ray, index) => (
          <line key={`ray-${index}`} className="degree-ray" x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
        ))}
        <circle className="guide" data-ring="1" cx={FRAME.c} cy={FRAME.c} r={FRAME.rDiatonic} />
        <circle className="guide" data-ring="2" cx={FRAME.c} cy={FRAME.c} r={FRAME.rSecondary} />
        <circle className="guide" data-ring="3" cx={FRAME.c} cy={FRAME.c} r={FRAME.rBorrowed} />
        <circle className="guide" data-ring="4" cx={FRAME.c} cy={FRAME.c} r={FRAME.rPivot} />
        {labels.map((label) => (
          <text
            key={label.id}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="ring-label"
            data-ring-label={label.id}
          >
            {label.text}
          </text>
        ))}

        {nodes.map((node) => (
          <motion.line
            key={`line-${node.continuation.id}`}
            x1={FRAME.c}
            y1={FRAME.c}
            initial={false}
            animate={{ x2: node.x, y2: node.y }}
            transition={moveEase}
            stroke={GROUP_COLOR[node.continuation.group]}
            strokeWidth={node.continuation.strong ? 1.35 : 0.8}
            strokeOpacity={node.continuation.strong ? 0.7 : 0.28}
          />
        ))}

        <g
          className="center-chord"
          data-state={centerState}
          transform={`translate(${FRAME.c} ${FRAME.c})`}
          role="button"
          tabIndex={0}
          data-testid="center-chord"
          data-symbol={symbol}
          aria-label={`${shownSymbol}, ${shownRoman}. Toque para ouvir.`}
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
              transition={{ duration: reduced ? 0 : 0.2, ease: [EASE[0], EASE[1], EASE[2], EASE[3]] }}
            >
              <text y={-16} textAnchor="middle" className="center-roman" fill={GROUP_COLOR[analysis.group]}>
                {shownRoman}
              </text>
              <text y={12} textAnchor="middle" className="center-symbol" fontSize={shownSymbol.length >= 4 ? 26 : 34}>
                {shownSymbol}
              </text>
              <text y={34} textAnchor="middle" className="center-key">
                {keyLabel(visualKey)}
              </text>
            </motion.g>
          </AnimatePresence>
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
