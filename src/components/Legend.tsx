import type { Group } from "../theory/types";
import { GROUP_COLOR, GROUP_LABEL } from "./groupMeta";

const ITEMS: { group: Group; shape: string }[] = [
  { group: "tonic", shape: "circle" },
  { group: "subdominant", shape: "circle" },
  { group: "dominant", shape: "circle" },
  { group: "secondary", shape: "diamond" },
  { group: "borrowed", shape: "hex" },
  { group: "pivot", shape: "double" },
];

export function Legend() {
  return (
    <ul className="legend" data-testid="legend">
      {ITEMS.map((item) => (
        <li key={item.group}>
          <span className={`legend-mark ${item.shape}`} style={{ color: GROUP_COLOR[item.group], borderColor: GROUP_COLOR[item.group] }} />
          {GROUP_LABEL[item.group]}
        </li>
      ))}
    </ul>
  );
}
