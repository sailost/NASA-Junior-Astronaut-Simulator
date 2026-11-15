/** A consistent exploration scale, independent of HUD panels or screen aspect. */
export function explorationCamera(width: number, height: number) {
  const w = Math.max(1, width),
    h = Math.max(1, height);
  return {
    x: 0,
    y: 0,
    width: w,
    height: h,
    zoom: Math.max(w / 1140, h / 680),
    deadzone: { width: w * 0.1, height: h * 0.1 },
  };
}
