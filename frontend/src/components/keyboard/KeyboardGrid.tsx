import { KeyTile } from './KeyTile';

export function KeyboardGrid() {
  // 40 keys in a 10x4 grid, keyIndex 1-40
  const keys = Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-10 gap-2">
      {keys.map(keyIndex => (
        <KeyTile key={keyIndex} keyIndex={keyIndex} />
      ))}
    </div>
  );
}
