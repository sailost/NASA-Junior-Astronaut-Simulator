export type SystemId = "power" | "oxygen" | "water" | "greenhouse" | "comms";
export interface Emergency {
  id: string;
  system: SystemId | "solar";
  description: string;
  severity: number;
  warning: number;
  remaining: number;
  resolved: boolean;
  science: string;
  options: string[];
  cost: string;
  consequence: string;
}
export function createEmergency(
  system: Emergency["system"],
  sol: number,
): Emergency {
  const info = {
    power: [
      "Acumulador desconectado",
      "La generación y las baterías mantienen los equipos encendidos.",
    ],
    oxygen: [
      "Válvula de oxígeno descalibrada",
      "El soporte vital necesita electricidad para mover y procesar gases.",
    ],
    water: [
      "Filtro de agua obstruido",
      "Reciclar reduce la necesidad de transportar agua desde la Tierra.",
    ],
    greenhouse: [
      "Control de riego averiado",
      "Las plantas necesitan agua, luz y tiempo; no producen alimento instantáneo.",
    ],
    comms: [
      "Antena fuera de frecuencia",
      "Una señal de radio viaja a la velocidad de la luz.",
    ],
    solar: [
      "Actividad solar · protocolo preventivo",
      "Un registro solar no determina por sí solo la exposición en Marte. La emergencia es una recreación educativa.",
    ],
  }[system];
  return {
    id: `${system}-${sol}`,
    system,
    description: info[0],
    severity: system === "solar" ? 3 : 2,
    warning: system === "solar" ? 22 : 0,
    remaining: system === "solar" ? 42 : 100,
    resolved: false,
    science: info[1],
    options:
      system === "solar"
        ? ["Activar refugio", "Aceptar exposición simulada"]
        : ["Desplazarse y reparar", "Priorizar soporte vital"],
    cost: system === "solar" ? "6 energía" : "5 energía + tiempo del minijuego",
    consequence:
      system === "solar"
        ? "Exposición si la tripulación no está protegida"
        : "Menor producción hasta reparar",
  };
}
