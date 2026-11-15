export function rotateMask(mask: number, turns: number) {
  for (let i = 0; i < turns % 4; i++) mask = ((mask << 1) & 15) | (mask >> 3);
  return mask;
}
export const waterSolution = [10, 10, 12, 6, 10, 9, 3, 10, 10]; // N E S W = bits 1 2 4 8
export function waterConnected(masks: number[]) {
  if (masks.length !== 9 || !(masks[0] & 8)) return false;
  let cell = 0,
    entry = 8;
  const visited = new Set<number>();
  while (!visited.has(cell)) {
    visited.add(cell);
    const mask = masks[cell];
    if (!(mask & entry)) return false;
    const exit = mask ^ entry;
    if (![1, 2, 4, 8].includes(exit)) return false;
    if (cell === 8 && exit === 2) return visited.size === 9;
    const row = Math.floor(cell / 3),
      col = cell % 3;
    if (exit === 1) {
      if (!row) return false;
      cell -= 3;
      entry = 4;
    } else if (exit === 2) {
      if (col === 2) return false;
      cell++;
      entry = 8;
    } else if (exit === 4) {
      if (row === 2) return false;
      cell += 3;
      entry = 1;
    } else {
      if (!col) return false;
      cell--;
      entry = 2;
    }
  }
  return false;
}
export const oxygenAligned = (values: number[]) =>
  values.length === 3 &&
  values.every((v, i) => Math.abs(v - [40, 65, 55][i]) <= 3);
export const signalAligned = (frequency: number, phase: number) =>
  Math.abs(frequency - 62) <= 2 && Math.abs(phase - 34) <= 3;
export const circuitAligned = (links: number[]) =>
  links.length === 3 && links.every((v, i) => v === [2, 0, 1][i]);
