import type { Simulation } from "../systems/Simulation";
import type { ComicSequence } from "./Prologue";
import type { CampaignOutcome } from "../systems/Campaign";
const art = (name: string) => `assets/world/interiors/${name}.png`;
export const pendingStoryArt = {
  sol2: ["assets/story/sol2/sol2-01.png", "assets/story/sol2/sol2-02.png"],
  sol3: ["assets/story/sol3/sol3-01.png", "assets/story/sol3/sol3-02.png"],
  victory: ["assets/story/endings/victory-01.png", "assets/story/endings/victory-02.png"],
  partial: ["assets/story/endings/partial-01.png", "assets/story/endings/partial-02.png"],
  defeat: ["assets/story/endings/defeat-01.png", "assets/story/endings/defeat-02.png"],
} as const;
// Pending files are a production checklist, never requested by the reader.
export function campaignStory(id: "sol2" | "sol3" | CampaignOutcome, sim: Simulation): ComicSequence {
  const c = sim.campaign;
  const reserves = `Reservas conservadas: energía ${Math.round(sim.resources.energy)}, agua ${Math.round(sim.resources.water)}, alimento ${Math.round(sim.resources.food)} / 100.`;
  const damage = Object.entries(sim.systems).filter(([, ok]) => !ok).map(([name]) => ({ oxygen: "oxígeno", water: "reciclador", power: "alimentación", comms: "antena", greenhouse: "riego" })[name]);
  const condition = damage.length ? `Siguen pendientes daños en ${damage.join(", ")}.` : sim.resources.health < 55 || Math.min(sim.resources.energy, sim.resources.water, sim.resources.oxygen, sim.resources.food) < 20 ? "La colonia continúa, pero algunas reservas o la salud requieren atención." : "La tripulación mantiene condiciones estables en este momento.";
  const decisions = c?.decisions || [];
  const names: Record<string, string> = { energy: "energía", oxygen: "oxígeno", water: "agua", food: "alimentos", health: "salud", radiation: "exposición", power: "alimentación", greenhouse: "riego", comms: "antena" };
  const history = c?.criticalHistory.length ? `Durante la operación hubo valores críticos de ${c.criticalHistory.map((key) => names[key]).join(", ")}.` : "No se registraron valores críticos en las reservas vigiladas.";
  const repairs = c?.damageHistory.length ? `Hubo averías en ${c.damageHistory.map((key) => names[key]).join(", ")}; las reparaciones y los daños pendientes constan en el registro.` : "No se registraron averías hasta este punto.";
  const common = { id, allowMenu: false };
  if (id === "sol2") return { ...common, label: "Entrar en la noche", pages: [
    { heading: "La última luz", asset: art("machine-generator"), lines: ["La luz del Sol se está apagando. Ahora dependeremos de las reservas que conseguimos preparar.", "Las decisiones de hoy determinarán nuestras opciones durante la noche."], facts: [reserves, ...decisions] },
    { heading: "Escuchar a la colonia", asset: art("console-control"), lines: ["Durante la noche vigilaremos las señales de los equipos. Una tendencia puede avisarnos antes de que una reserva se agote.", "Aparecerá un marcianito por cada misión pendiente. Son enemigos ficticios del juego, no descubrimientos de NASA: cada misión resuelta hace desaparecer al suyo."], facts: ["Dispones de 20 segundos de juego para cada objetivo activo. Después perderás salud; más marcianitos significan más daño.", "Las explicaciones y las pausas detienen el plazo. Al resolver las tres misiones, se despeja la base y amanece."] },
  ] };
  if (id === "sol3") return { ...common, label: "Comenzar el amanecer", pages: [
    { heading: "Una nueva luz", asset: art("shelter-shield-panel"), lines: ["Lo conseguimos. Ha amanecido.", condition], facts: [reserves, history, repairs, `Protección durante la alerta: ${c?.protectedDuringAlert ? "protocolo aplicado" : "la exposición registrada deberá revisarse"}.`] },
    { heading: "Sobrevivir no era todo", asset: art("machine-lab-scanner"), lines: ["Pero sobrevivir no era nuestro único objetivo. Ahora debemos utilizar lo aprendido para completar la misión científica.", "Tierra necesita las evidencias y las limitaciones de nuestro ensayo, no solo una lista de tareas terminadas."], facts: decisions },
  ] };
  const ending = id === "victory" ? "Una colonia que aprende" : id === "partial" ? "Seguimos aquí, con preguntas pendientes" : "El límite de la colonia";
  return { ...common, label: "Ver resultado de la misión", pages: [
    { heading: ending, asset: art(id === "defeat" ? "machine-oxygen" : "machine-communications"), lines: [id === "victory" ? "Has conectado las observaciones con decisiones y comprobado sus efectos. La colonia ha demostrado autonomía." : id === "partial" ? "La tripulación ha podido continuar, pero el trabajo o la estabilidad de la colonia presentan limitaciones." : "La misión no pudo continuar. Revisemos la condición que hizo inviable el soporte vital.", sim.reason], facts: [reserves, condition, history] },
    { heading: "Lo que comunicamos a Tierra", asset: art("console-control"), lines: [sim.report === "received" ? `La recepción está confirmada: ${sim.research} evidencias y ${decisions.length} decisiones registradas.` : "No consta una confirmación de recepción del informe. El resumen conservará esta limitación.", id === "defeat" ? "El próximo intento puede cambiar: compara la caída de reservas, las averías pendientes y los costes de tus decisiones." : "El resumen explica qué aplicaste, qué pudiste comprobar y qué quedó sin demostrar."], facts: decisions.length ? decisions : ["No se registraron configuraciones experimentales aplicadas."] },
  ] };
}
