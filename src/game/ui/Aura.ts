import type { Simulation } from "../systems/Simulation";
import type { Objective } from "../systems/objectives";
/** Context only: this presenter never mutates simulation state. */
export function auraMessage(sim: Simulation, current?: Objective) {
  const critical = Object.entries(sim.resources).find(
    ([key, value]) =>
      key !== "radiation" && value < (key === "health" ? 35 : 18),
  );
  if (critical) {
    const name = (
      {
        energy: "Energía",
        oxygen: "Oxígeno",
        water: "Agua",
        food: "Alimentos",
        health: "Salud",
      } as Record<string, string>
    )[critical[0]];
    return {
      id: `critical-${critical[0]}`,
      text: `${name} en nivel crítico. ${critical[0] === "energy" ? "Revisa baterías y distribución en Máquinas y Control." : critical[0] === "oxygen" || critical[0] === "water" ? "Revisa el soporte vital." : critical[0] === "food" ? "Comprueba la cosecha del invernadero." : "Revisa las reservas y la protección de la tripulación."}`,
    };
  }
  if (current?.urgent)
    return {
      id: current.id,
      text: `${current.title}. Destino: ${current.room.toLowerCase()}.`,
    };
  const last = sim.log.at(-1);
  if (
    last &&
    sim.time - last.time < 5 &&
    !last.text.startsWith("ARCHIVO DONKI")
  )
    return {
      id: `log-${last.time}-${last.text}`,
      text: last.text
        .replace(/^HITO: /, "Completado: ")
        .replace(
          /\b(oxygen|water|power|greenhouse|comms)\b/g,
          (key) =>
            (
              ({
                oxygen: "oxígeno",
                water: "reciclaje de agua",
                power: "energía",
                greenhouse: "invernadero",
                comms: "comunicaciones",
              }) as Record<string, string>
            )[key],
        ),
    };
  if (current && !current.done)
    return {
      id: `goal-${current.id}`,
      text: `${current.title}. ${current.room.toLowerCase()} · Pulsa E al acercarte al equipo.`,
    };
  return undefined;
}
