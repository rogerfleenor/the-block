interface DamageNotesProps {
  notes: string[];
}

export function DamageNotes({ notes }: DamageNotesProps) {
  if (notes.length === 0) {
    return <p className="text-sm text-neutral-500">No damage noted.</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {notes.map((n, idx) => (
        <li key={idx}>{n}</li>
      ))}
    </ul>
  );
}
