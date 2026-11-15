import {
  escapeHtml as esc,
  sourceLink,
  type ScienceData,
} from "../data/Science";
import { marsRadReference } from "../data/Radiation";

export function renderScienceArchive(
  data?: ScienceData,
  selected?: { id: string },
) {
  const solar = (data?.solarEvents || [])
    .map(
      (r) => `<article>
    <span class="eyebrow">DATO REAL · ${esc(r.type)} · HISTÓRICO</span>
    <h3>${esc(r.id)}</h3><p>${esc(r.explanation)}</p>
    <dl>${Object.entries(r.properties)
      .map(
        ([key, value]) =>
          `<dt>${esc({ classType: "Clasificación", peakTime: "Máximo (UTC)", sourceRegion: "Región solar", instrument: "Instrumento", instruments: "Instrumentos", sourceLocation: "Origen" }[key] || key)}</dt><dd>${esc(value)}</dd>`,
      )
      .join("")}</dl>
    <small>${esc(r.date)} · Consulta ${esc(r.retrievedAt)}</small>${sourceLink(r.url, r.source)}</article>`,
    )
    .join("");
  const cards = (data?.cards || [])
    .map(
      (c) =>
        `<article><span class="eyebrow">${esc(c.label)}</span><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p>${sourceLink(c.url, c.source)}</article>`,
    )
    .join("");
  const readings = data?.radiation.readings || [];
  const table = readings.length
    ? `<div class="measurement-table"><table><caption>ISS · órbita terrestre baja · 1 abril 2022</caption><thead><tr><th>Hora UTC</th><th>Instrumento</th><th>Dosis absorbida</th></tr></thead><tbody>${readings.map((r) => `<tr><td>${esc(String(r.timestamp).slice(11, 19))}</td><td>${esc(r.instrument)}</td><td>${Number(r.absorbedDoseRate).toFixed(3)} ${esc(r.unit)}</td></tr>`).join("")}</tbody></table><small>Valores redondeados a 3 decimales. Fecha y precisión originales conservadas en el archivo local. Consulta: ${esc(readings[0].retrievedAt)}.</small>${sourceLink(String(readings[0].url), "NASA RadLab · consulta de origen")}</div>`
    : "";
  return `<button class="close" aria-label="Cerrar">×</button>
    <div class="eyebrow">BITÁCORA DE CONOCIMIENTO / FUENTES OFICIALES</div>
    <h2>Archivo científico</h2><p>Registros históricos y referencias utilizadas en la simulación. Consulta: ${esc(data?.checkedAt || "archivo no disponible")}.</p>
    <div class="science-note">${selected ? `Registro de contexto de esta partida: <b>${esc(selected.id)}</b>.<br>` : ""}<b>SIMULACIÓN:</b> recursos 0–100, crecimiento acelerado y exposición sin unidad física. No son mediciones de NASA ni recomendaciones para una misión real.</div>
    <div class="science-grid">${solar}${cards}<article class="radiation-article"><span class="eyebrow">MARTE · CURIOSITY / RAD · DATO HISTÓRICO</span><h3>Calcular dosis absorbida</h3><p>Durante los primeros diez meses de Curiosity en Marte, RAD midió una tasa de referencia de alrededor de <b>${marsRadReference.rateMicrograyPerSol} μGy por sol</b>. Para un ejercicio sencillo: dosis absorbida = tasa × duración. Un sol de exposición a esa tasa da ${marsRadReference.rateMicrograyPerSol} μGy.</p><p>Es un promedio de un periodo y lugar concretos, no una medición en tiempo real ni un pronóstico para Base Aurora. La atmósfera y la actividad solar hacen variar las observaciones. μGy es dosis absorbida; no se convierte automáticamente a mSv.</p>${sourceLink(marsRadReference.url, marsRadReference.source)}</article><article class="radiation-article"><span class="eyebrow">RADLAB · ${data?.radiation.status === "verified" ? "MEDICIONES VERIFICADAS" : "INTEGRACIÓN PENDIENTE"}</span><h3>La radiación tiene unidades</h3><p>${esc(data?.radiation.explanation || "El archivo no está disponible. No mostramos valores inventados.")}</p>${table}${sourceLink("https://visualization.osdr.nasa.gov/radlab/gui/data-api/", "NASA RadLab · documentación")}</article></div>
    <p class="fine">Arte vectorial y sonidos originales generados por código. Proyecto independiente; NASA y CSA no avalan ni certifican este videojuego.</p>`;
}
