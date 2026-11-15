export const auraWelcomeTitle = "Hola, soy AURA";
export const auraWelcomeText = "Soy tu asistente de IA personal. Bienvenido a Base Aurora. Estoy aquí para ayudarte a cuidar la colonia. Estos son los indicadores de tus reservas; elige uno si quieres que te lo explique.";
export const auraWelcomeResources = [
  { id: "energy", name: "Energía", text: "Alimenta las máquinas. De noche usamos las baterías." },
  { id: "oxygen", name: "Oxígeno", text: "Es el aire de la tripulación. Lo recupera el soporte vital." },
  { id: "water", name: "Agua", text: "La necesitan la tripulación, los cultivos y los análisis." },
  { id: "food", name: "Comida", text: "Alimenta a la tripulación. El invernadero repone la reserva." },
  { id: "health", name: "Salud", text: "Indica cómo está la tripulación. Cuida sus recursos esenciales." },
  { id: "radiation", name: "Exposición", text: "Es un riesgo simulado. Ante una alerta solar, utiliza el refugio." },
] as const;
export function auraWelcomeOverview() {
  return `<div class="aura-welcome-resources" aria-label="Conoce tus recursos">${auraWelcomeResources.map((resource) => `<button type="button" data-aura-intro-resource="${resource.id}" aria-label="Preguntar a AURA sobre ${resource.name}"><strong>${resource.name}</strong><span>${resource.text}</span></button>`).join("")}</div><p class="aura-welcome-help">Después estaré en la esquina inferior izquierda. Pulsa <kbd>C</kbd> o mi retrato para preguntarme por tus recursos, la misión o cómo llegar al siguiente objetivo.</p>`;
}
