/** Historical surface reading from Curiosity's RAD instrument, not a live forecast. */
export const marsRadReference = {
  rateMicrograyPerSol: 210,
  source: "NASA Science · Radiation Measurements on Mars",
  url: "https://science.nasa.gov/resource/radiation-measurements-on-mars/",
} as const;

/** Absorbed dose = absorbed dose rate × exposure duration. Both inputs are game/reference values. */
export function absorbedDoseMicrogray(rateMicrograyPerSol: number, durationSols: number) {
  if (!Number.isFinite(rateMicrograyPerSol) || !Number.isFinite(durationSols)) return 0;
  return Math.max(0, rateMicrograyPerSol) * Math.max(0, durationSols);
}
