import { Note } from "tonal";

const WHITE = [0, 2, 4, 5, 7, 9, 11];

interface Props {
  notes: string[];
  accent: string;
}

export function PianoKeyboard({ notes, accent }: Props) {
  const active = new Set(notes.map((note) => Note.chroma(note)).filter((chroma): chroma is number => chroma !== null && chroma !== undefined));
  const whites: { midi: number; chroma: number }[] = [];
  for (let octave = 0; octave < 2; octave += 1) {
    for (const chroma of WHITE) {
      whites.push({ midi: 48 + octave * 12 + chroma, chroma });
    }
  }

  return (
    <div className="piano" data-testid="piano" aria-hidden="true">
      <div className="piano-whites">
        {whites.map((key) => (
          <div key={key.midi} className={active.has(key.chroma) ? "white-key is-on" : "white-key"} style={active.has(key.chroma) ? { background: accent } : undefined} />
        ))}
      </div>
      <div className="piano-blacks">
        {whites.map((key) => {
          if (key.chroma === 4 || key.chroma === 11) return <span key={key.midi} className="black-gap" />;
          const chroma = (key.chroma + 1) % 12;
          const on = active.has(chroma);
          return (
            <span key={`${key.midi}-black`} className={on ? "black-key is-on" : "black-key"} style={on ? { background: accent } : undefined} />
          );
        })}
      </div>
    </div>
  );
}
