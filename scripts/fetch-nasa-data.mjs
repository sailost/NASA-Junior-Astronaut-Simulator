import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public/data/science.json");
const radlabUrl =
  "https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-01T23%3A05&absorbed_dose_rate&format=json";
export function normalizeRadlab(raw, retrievedAt) {
  if (!Array.isArray(raw.columns) || !Array.isArray(raw.data))
    throw new Error("Esquema RadLab inesperado.");
  const rows = raw.data.map((row) =>
    Object.fromEntries(raw.columns.map((c, i) => [c, row[i]])),
  );
  const valid = rows.filter(
    (r) =>
      r.spacecraft === "ISS" &&
      typeof r.instrument_id === "string" &&
      typeof r.absorbed_dose_rate === "number" &&
      Number.isFinite(r.absorbed_dose_rate) &&
      r.absorbed_dose_rate >= 0 &&
      Number.isFinite(Date.parse(r.timestamp)),
  );
  if (!valid.length)
    throw new Error("RadLab no devolvió mediciones verificables.");
  return valid.slice(0, 8).map((r) => ({
    timestamp: `${r.timestamp.replace(/Z$/, "")}Z`,
    instrument: String(r.instrument_id),
    platform: "ISS",
    location: "Órbita terrestre baja, no Marte",
    absorbedDoseRate: Number(r.absorbed_dose_rate),
    unit: "μGy/h",
    source: "NASA OSDR RadLab",
    url: radlabUrl,
    retrievedAt,
  }));
}
export function normalizeDonki(raw, type, retrievedAt) {
  if (!Array.isArray(raw)) throw new Error(`Respuesta ${type} no válida.`);
  return raw
    .filter(
      (r) =>
        typeof (r.flrID || r.activityID || r.sepID || r.gstID) === "string" &&
        Number.isFinite(Date.parse(r.beginTime || r.startTime || r.eventTime)),
    )
    .slice(0, 20)
    .map((r) => ({
      id: r.flrID || r.activityID || r.sepID || r.gstID,
      type,
      date: r.beginTime || r.startTime || r.eventTime,
      properties: Object.fromEntries(
        Object.entries({
          classType: r.classType,
          peakTime: r.peakTime,
          sourceLocation: r.sourceLocation,
          instruments: r.instruments?.map((i) => i.displayName).join("; "),
        }).filter(([, v]) => typeof v === "string"),
      ),
      source: "NASA CCMC / DONKI",
      url:
        typeof r.link === "string" && r.link.startsWith("https://")
          ? r.link
          : "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
      retrievedAt,
      explanation:
        "Registro histórico auténtico. No determina por sí solo una dosis ni una amenaza para Marte. El protocolo y la severidad del juego son simulados.",
    }));
}
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: "application/json" },
      });
    } catch {
      if (attempt === 2)
        throw new Error(
          "No se pudo conectar al servicio oficial. Se conserva la copia local.",
        );
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 2)
        throw new Error(
          `Servicio temporalmente no disponible (HTTP ${response.status}).`,
        );
      const delay = Math.min(
        5000,
        Math.max(500, Number(response.headers.get("retry-after") || 1) * 1000),
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    if (!response.ok)
      throw new Error(`Consulta rechazada (HTTP ${response.status}).`);
    try {
      return await response.json();
    } catch {
      throw new Error("La respuesta no es JSON válido.");
    }
  }
}
async function main() {
  const radOnly = process.argv.includes("--radlab-only"),
    key = process.env.NASA_API_KEY;
  if (!radOnly && (!key || key === "YOUR_NASA_API_KEY"))
    throw new Error(
      "Configura NASA_API_KEY en .env.local. No se ha modificado el archivo científico. Usa --radlab-only para consultar RadLab sin clave.",
    );
  const data = JSON.parse(await readFile(target, "utf8")),
    retrievedAt = new Date().toISOString();
  if (!radOnly) {
    const start = process.env.NASA_START_DATE || "2024-05-10",
      end = process.env.NASA_END_DATE || "2024-05-11";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      Date.parse(end) < Date.parse(start) ||
      Date.parse(end) - Date.parse(start) > 31 * 86400000
    )
      throw new Error("Usa un intervalo válido de hasta 31 días.");
    const events = [];
    // api.nasa.gov is the authenticated Open APIs gateway. The CCMC documentation
    // also describes its separate public webservice; do not send the key there.
    for (const type of ["FLR", "CME", "SEP"]) {
      const url = new URL(`https://api.nasa.gov/DONKI/${type}`);
      url.search = new URLSearchParams({
        startDate: start,
        endDate: end,
        api_key: key,
      }).toString();
      const result = normalizeDonki(await request(url), type, retrievedAt);
      events.push(...result);
      console.log(`${type}: ${result.length} registros validados.`);
    }
    if (!events.length)
      throw new Error(
        "No hay eventos válidos en el intervalo; se conserva la copia local.",
      );
    data.solarEvents = events;
  }
  const readings = normalizeRadlab(await request(radlabUrl), retrievedAt);
  data.radiation = {
    status: "verified",
    readings,
    source: "NASA OSDR RadLab",
    url: radlabUrl,
    explanation:
      "Mediciones históricas de dosis absorbida de DosTel en la ISS, en μGy/h (microgray por hora). Son datos de órbita terrestre, no de Marte. No son dosis equivalentes en μSv/h ni la exposición 0–100 del juego.",
  };
  data.checkedAt = retrievedAt;
  data.mode = "historical";
  const serialized = JSON.stringify(data, null, 2) + "\n";
  if (key && serialized.includes(key))
    throw new Error("Se canceló la escritura por protección de secretos.");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, serialized);
  await rename(`${target}.tmp`, target);
  console.log(
    "Archivo científico actualizado. Solo datos históricos públicos; no contiene credenciales.",
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
