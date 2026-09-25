import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useIsPresent, useReducedMotion } from "motion/react";
import { displayRoman } from "../theory/chords";
import { describeChordInKey, getContinuations } from "../theory/continuations";
import {
  CENTER_EASE,
  ENTER_DELAY,
  FRAME,
  SECTORS,
  SECTOR_RAYS,
  ghostForRoman,
  layoutContinuations,
  layoutKey,
  polar,
  type PlacedChord,
} from "../theory/layout";
import { chordAria, keyPhrase, pivotLabel } from "../theory/speech";
import { useHarmonyStore } from "../store/useHarmonyStore";
import type { Group } from "../theory/types";
import { SvgChord } from "./ChordSymbol";
import { LEGEND, groupVar } from "./groupMeta";
import { useSoundingProgress } from "./useSounding";

const EASE = CENTER_EASE;

type Origin = "stay" | "center" | "inward";

interface Memory {
  symbol: string;
  group: string;
  keyId: string;
  ids: string[];
  positions: Record<string, { x: number; y: number; r: number }>;
  origins: Record<string, Origin>;
  fly: { x: number; y: number; r: number; symbol: string } | null;
}

function remember(
  symbol: string,
  group: string,
  keyId: string,
  nodes: PlacedChord[],
  previous: Memory | null,
  transitionFrom: { x: number; y: number; r: number; symbol: string } | null,
): Memory {
  const prevIds = new Set(previous?.ids ?? []);
  const prevCenter = previous ? layoutKey(previous.symbol, previous.group) : "";
  const positions: Memory["positions"] = {};
  const origins: Memory["origins"] = {};
  const ids = nodes.map((node) => {
    const id = layoutKey(node.continuation.symbol, node.continuation.group);
    positions[id] = { x: node.x, y: node.y, r: node.r };
    if (!previous) origins[id] = "stay";
    else if (prevIds.has(id)) origins[id] = "stay";
    else if (id === prevCenter) origins[id] = "center";
    else origins[id] = "inward";
    return id;
  });
  const slot = layoutKey(symbol, group);
  const fromClick = transitionFrom && transitionFrom.symbol === symbol ? transitionFrom : null;
  const fromMap = previous?.positions[slot];
  return {
    symbol,
    group,
    keyId,
    ids,
    positions,
    origins,
    fly: fromClick ?? (fromMap ? { ...fromMap, symbol } : null),
  };
}

function DrainArc({ radius, color, progress }: { radius: number; color: string; progress: number }) {
  const circ = 2 * Math.PI * radius;
  return (
    <circle
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray={`${circ} ${circ}`}
      strokeDashoffset={circ * progress}
      transform="rotate(-90)"
      data-progress={progress.toFixed(3)}
    />
  );
}

function useNodeMotion(
  target: { x: number; y: number; scale: number },
  spec: { fromX: number | null; fromY: number | null; fromScale: number; delay: number; duration: number; reduced: boolean },
) {
  const ref = useRef<SVGGElement | null>(null);
  const pos = useRef({
    x: spec.fromX ?? target.x,
    y: spec.fromY ?? target.y,
    scale: spec.fromX === null ? target.scale : spec.fromScale,
  });

  const setNode = useCallback((node: SVGGElement | null) => {
    ref.current = node;
    if (!node) return;
    const place = pos.current;
    node.setAttribute("transform", `translate(${place.x} ${place.y}) scale(${place.scale})`);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const start = pos.current;
    const distance = Math.hypot(target.x - start.x, target.y - start.y);
    if (spec.reduced || (distance < 0.5 && Math.abs(target.scale - start.scale) < 0.001)) {
      pos.current = { x: target.x, y: target.y, scale: target.scale };
      node.setAttribute("transform", `translate(${target.x} ${target.y}) scale(${target.scale})`);
      return;
    }
    const duration = distance > 0.5 ? spec.duration : 0.12;
    const controls = animate(0, 1, {
      delay: distance > 0.5 ? spec.delay : 0,
      duration,
      ease: [EASE[0], EASE[1], EASE[2], EASE[3]],
      onUpdate: (t) => {
        const x = start.x + (target.x - start.x) * t;
        const y = start.y + (target.y - start.y) * t;
        const scale = start.scale + (target.scale - start.scale) * t;
        pos.current = { x, y, scale };
        ref.current?.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
      },
    });
    return () => controls.stop();
  }, [spec.delay, spec.duration, spec.reduced, target.scale, target.x, target.y]);

  return { setNode, pos, ref };
}

function OrbitNode({
  node,
  origin,
  hovered,
  locked,
  exitInstant,
  onHover,
  onPick,
}: {
  node: PlacedChord;
  origin: "stay" | "center" | "inward";
  hovered: boolean;
  locked: boolean;
  exitInstant: boolean;
  onHover: (id: string | null) => void;
  onPick: (node: PlacedChord) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const present = useIsPresent();
  const move = node.continuation;
  const color = groupVar(move.group);
  const delay = ENTER_DELAY[node.ring];
  const inward = polar(FRAME.c, FRAME.c, Math.max(0, node.orbit - 12), node.angle);
  const from =
    origin === "center"
      ? { x: FRAME.c, y: FRAME.c, scale: FRAME.centerR / node.r }
      : origin === "inward" && !reduced
        ? { x: inward.x, y: inward.y, scale: 1 }
        : null;
  const hoverScale = hovered && !locked && !reduced ? 1.06 : 1;
  const { setNode, pos, ref } = useNodeMotion(
    { x: node.x, y: node.y, scale: hoverScale },
    {
      fromX: from?.x ?? null,
      fromY: from?.y ?? null,
      fromScale: from?.scale ?? 1,
      delay: origin === "inward" && !reduced ? delay : 0,
      duration: reduced ? 0 : origin === "inward" ? Math.max(0.08, 0.45 - delay) : 0.42,
      reduced,
    },
  );

  useEffect(() => {
    if (present || reduced || exitInstant) return;
    const start = pos.current;
    const dx = FRAME.c - start.x;
    const dy = FRAME.c - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const endX = start.x + (dx / len) * 12;
    const endY = start.y + (dy / len) * 12;
    const controls = animate(0, 1, {
      duration: 0.16,
      ease: [EASE[0], EASE[1], EASE[2], EASE[3]],
      onUpdate: (t) => {
        const x = start.x + (endX - start.x) * t;
        const y = start.y + (endY - start.y) * t;
        const scale = start.scale + (0.9 - start.scale) * t;
        pos.current = { x, y, scale };
        ref.current?.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
      },
    });
    return () => controls.stop();
  }, [exitInstant, pos, present, reduced, ref]);

  const strong = move.strong;
  const state = locked ? "unavailable" : hovered ? "hover" : strong ? "strong" : "rest";
  const strokeWidth = hovered || strong ? 2 : 1.5;
  const strokeOpacity = hovered || strong ? 1 : 0.55;
  return (
    <motion.g
      initial={origin === "inward" && !reduced ? { opacity: 0 } : false}
      animate={{ opacity: locked ? 0.4 : 1 }}
      exit={{ opacity: 0, transition: { duration: exitInstant || reduced ? 0.12 : 0.16 } }}
      transition={{
        duration: reduced ? 0.12 : origin === "inward" ? Math.max(0.08, 0.45 - delay) : 0.2,
        delay: reduced || origin !== "inward" ? 0 : delay,
      }}
    >
      <g
        ref={setNode}
        className="orbit-node"
        role="button"
        tabIndex={locked ? -1 : 0}
        data-testid={`orbit-${move.id}`}
        data-symbol={move.symbol}
        data-group={move.group}
        data-ring={node.ring}
        data-orbit={node.orbit}
        data-angle={node.angle}
        data-strong={strong ? "true" : "false"}
        data-state={state}
        aria-label={chordAria(move)}
        onMouseEnter={() => {
          if (!locked) onHover(move.id);
        }}
        onMouseLeave={() => onHover(null)}
        onFocus={() => {
          if (!locked) onHover(move.id);
        }}
        onBlur={() => onHover(null)}
        onClick={() => {
          if (!locked) onPick(node);
        }}
        onKeyDown={(event) => {
          if (locked) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPick(node);
          }
        }}
      >
        <circle
          r={node.r}
          fill={hovered ? color : "var(--color-surface)"}
          fillOpacity={hovered ? 0.12 : 1}
          stroke={color}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
        <circle className="focus-ring" r={node.r + 4} />
        <SvgChord
          symbol={move.symbol}
          size={node.ring === 1 ? 14 : 13}
          maxWidth={node.r * 1.6}
          y={node.ring === 4 ? 4 : -3}
          fill="var(--color-text)"
        />
        {node.ring === 4 ? null : (
          <text y={10} textAnchor="middle" className="node-roman" fill={hovered ? "var(--color-text-secondary)" : "var(--color-text-muted)"}>
            {displayRoman(move.roman)}
          </text>
        )}
        <title>{move.detail}</title>
      </g>
    </motion.g>
  );
}

function CenterDisk({
  symbol,
  roman,
  group,
  subtitle,
  fly,
  playing,
  progress,
  reduced,
  onReplay,
}: {
  symbol: string;
  roman: string;
  group: Group | "chromatic";
  subtitle: string;
  fly: { x: number; y: number; r: number } | null;
  playing: boolean;
  progress: number;
  reduced: boolean;
  onReplay: () => void;
}) {
  const color = groupVar(group);
  const { setNode } = useNodeMotion(
    { x: FRAME.c, y: FRAME.c, scale: 1 },
    {
      fromX: fly && !reduced ? fly.x : null,
      fromY: fly && !reduced ? fly.y : null,
      fromScale: fly && !reduced ? fly.r / FRAME.centerR : 1,
      delay: 0,
      duration: reduced ? 0.12 : 0.42,
      reduced,
    },
  );

  return (
    <g ref={setNode} data-testid="center-chord" data-state={playing ? "playing" : "selected"} data-group={group}>
      {playing && !reduced ? (
        <motion.circle
          r={55}
          fill="none"
          stroke={color}
          strokeWidth={10}
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.42, ease: [EASE[0], EASE[1], EASE[2], EASE[3]] }}
        />
      ) : null}
      {playing ? <DrainArc radius={FRAME.centerR + 5} color={color} progress={progress} /> : null}
      <circle r={FRAME.centerR} fill={playing ? color : "var(--color-text)"} />
      <SvgChord symbol={symbol} size={28} maxWidth={FRAME.centerR * 1.6} y={-6} fill="var(--color-bg)" />
      <text y={16} textAnchor="middle" className="center-meta" fill="var(--color-bg)" fillOpacity={0.7}>
        {displayRoman(roman)} · {subtitle}
      </text>
      <circle
        r={FRAME.centerR}
        fill="transparent"
        className="orbit-node"
        role="button"
        tabIndex={0}
        aria-label={`${symbol}, centro`}
        onClick={onReplay}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onReplay();
          }
        }}
      />
    </g>
  );
}

export function Navigator() {
  const center = useHarmonyStore((state) => state.center);
  const key = useHarmonyStore((state) => state.key);
  const playbackStep = useHarmonyStore((state) => state.playbackStep);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const paused = useHarmonyStore((state) => state.paused);
  const sounding = useHarmonyStore((state) => state.sounding);
  const transitionFrom = useHarmonyStore((state) => state.transitionFrom);
  const choose = useHarmonyStore((state) => state.chooseContinuation);
  const replay = useHarmonyStore((state) => state.replayCenter);
  const setTransitionFrom = useHarmonyStore((state) => state.setTransitionFrom);
  const reduced = useReducedMotion() ?? false;
  const progress = useSoundingProgress(sounding);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const overlay = (isPlaying || paused) && playbackStep ? playbackStep : null;
  const symbol = overlay?.symbol ?? center.symbol;
  const activeKey = overlay?.key ?? key;
  const analysis = overlay ?? describeChordInKey(symbol, activeKey);
  const placed = layoutContinuations(getContinuations(symbol, activeKey), activeKey);
  const ordered = [...placed].sort((a, b) => a.ring - b.ring || a.angle - b.angle);
  const playing = Boolean(sounding && progress < 1);
  const keyId = `${activeKey.tonic}|${activeKey.mode}`;
  const [memory, setMemory] = useState<Memory>(() => remember(symbol, analysis.group, keyId, ordered, null, null));
  let view = memory;
  if (memory.symbol !== symbol || memory.group !== analysis.group || memory.keyId !== keyId) {
    view = remember(symbol, analysis.group, keyId, ordered, memory, transitionFrom);
    setMemory(view);
  }
  const fly = view.fly && view.fly.symbol === symbol ? view.fly : null;

  useEffect(() => {
    if (transitionFrom) setTransitionFrom(null);
  }, [setTransitionFrom, transitionFrom]);

  const hovered = ordered.find((node) => node.continuation.id === hoverId) ?? null;
  const ghost = ghostForRoman(
    analysis.roman,
    placed.filter((node) => node.ring === 1).map((node) => node.angle),
  );

  const targetLine = (() => {
    if (!hovered || hovered.continuation.group !== "secondary" || isPlaying) return null;
    const targetRoman = hovered.continuation.roman.split("/")[1];
    if (!targetRoman) return null;
    const target = placed.find((node) => node.ring === 1 && node.continuation.roman.replace("°", "") === targetRoman.replace("°", ""));
    const at = target ? { x: target.x, y: target.y } : ghostForRoman(targetRoman, []);
    if (!at) return null;
    return { x1: hovered.x, y1: hovered.y, x2: at.x, y2: at.y };
  })();

  return (
    <div className="stage-frame" data-testid="navigator">
      <svg className="canvas-svg" viewBox="0 0 720 720" width="720" height="720" role="img" aria-label="Mapa harmônico">
        {[FRAME.rDiatonic, FRAME.rSecondary, FRAME.rBorrowed].map((radius) => (
          <circle key={radius} cx={FRAME.c} cy={FRAME.c} r={radius} className="guide" data-guide={radius} />
        ))}
        <circle cx={FRAME.c} cy={FRAME.c} r={FRAME.rPivot} className="guide guide-dashed" data-guide={FRAME.rPivot} />
        <circle cx={FRAME.c} cy={FRAME.c} r={FRAME.centerRing} className="guide" />
        {SECTOR_RAYS.map((angle) => {
          const inner = polar(FRAME.c, FRAME.c, 70, angle);
          const outer = polar(FRAME.c, FRAME.c, 150, angle);
          return (
            <line key={angle} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className="sector-ray" />
          );
        })}
        <motion.g
          key={`${activeKey.tonic}-${activeKey.mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0.12 : 0.2 }}
        >
          {SECTORS.map((sector) => {
            const point = polar(FRAME.c, FRAME.c, 160, sector.angle);
            return (
              <text key={sector.id} x={point.x} y={point.y} textAnchor="middle" className="sector-label">
                {sector.label}
              </text>
            );
          })}
        </motion.g>
        {ghost ? (
          <circle cx={ghost.x} cy={ghost.y} r={FRAME.nodeDiatonic} className="ghost" data-ghost="true" />
        ) : null}
        {targetLine ? (
          <line x1={targetLine.x1} y1={targetLine.y1} x2={targetLine.x2} y2={targetLine.y2} className="target-link" />
        ) : null}
        {isPlaying
          ? null
          : ordered
              .filter((node) => node.continuation.strong || node.continuation.id === hoverId)
              .map((node) => {
                const inner = polar(FRAME.c, FRAME.c, FRAME.centerRing, node.angle);
                const outer = polar(FRAME.c, FRAME.c, node.orbit - node.r, node.angle);
                return (
                  <line
                    key={`spoke-${node.continuation.id}`}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={groupVar(node.continuation.group)}
                    strokeOpacity={0.4}
                    strokeWidth={node.continuation.id === hoverId ? 1 : 1.5}
                    pointerEvents="none"
                  />
                );
              })}
        <AnimatePresence initial={false}>
          {ordered.map((node) => {
            const id = layoutKey(node.continuation.symbol, node.continuation.group);
            const origin = view.origins[id] ?? "inward";
            return (
              <OrbitNode
                key={id}
                node={node}
                origin={origin}
                hovered={hoverId === node.continuation.id}
                locked={isPlaying}
                exitInstant={node.continuation.symbol === symbol}
                onHover={setHoverId}
                onPick={(picked) => {
                  setTransitionFrom({
                    x: picked.x,
                    y: picked.y,
                    r: picked.r,
                    symbol: picked.continuation.symbol,
                  });
                  choose(picked.continuation);
                }}
              />
            );
          })}
        </AnimatePresence>
        <CenterDisk
          key={`${layoutKey(symbol, analysis.group)}|${keyId}`}
          symbol={symbol}
          roman={analysis.roman}
          group={analysis.group}
          subtitle={keyPhrase(activeKey)}
          fly={fly}
          playing={playing}
          progress={progress}
          reduced={reduced}
          onReplay={() => {
            if (!isPlaying) replay();
          }}
        />
        {ordered
          .filter((node) => node.label)
          .map((node) => (
            <text
              key={`label-${node.continuation.id}`}
              x={node.label?.x}
              y={node.label?.y}
              textAnchor={node.label?.anchor}
              className="pivot-label"
            >
              {pivotLabel(node.continuation.nextKey)}
            </text>
          ))}
        <g className="legend" transform="translate(16 700)">
          {LEGEND.map((item, index) => (
            <g key={item.id} transform={`translate(${[0, 118, 276, 412][index] ?? 0} 0)`}>
              <circle r={4} cx={4} cy={-4} fill={item.color} />
              <text x={16} y={0} className="legend-label">
                {item.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
