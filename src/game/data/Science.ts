export interface SolarRecord {
  id: string;
  type: string;
  date: string;
  properties: Record<string, string>;
  source: string;
  url: string;
  retrievedAt: string;
  explanation: string;
}
export interface ScienceData {
  schemaVersion: number;
  checkedAt: string;
  mode: string;
  solarEvents: SolarRecord[];
  radiation: {
    status: string;
    readings: Record<string, unknown>[];
    source: string;
    url: string;
    explanation: string;
  };
  cards: {
    title: string;
    label: string;
    body: string;
    source: string;
    url: string;
  }[];
}
export async function loadScience(): Promise<ScienceData> {
  const response = await fetch(
    `${import.meta.env?.BASE_URL || "./"}data/science.json`,
  );
  if (!response.ok)
    throw new Error("No se pudo cargar el archivo científico local.");
  const data = await response.json();
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.solarEvents) ||
    !Array.isArray(data.cards)
  )
    throw new Error("Archivo científico no válido.");
  return data;
}
export const escapeHtml = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function sourceLink(url: string, label: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return escapeHtml(label);
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`;
  } catch {
    return escapeHtml(label);
  }
}
