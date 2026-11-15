import type { Resource } from "../systems/Simulation";
import { auraWelcomeTitle, auraWelcomeText } from "../ui/AuraWelcome";
export interface TutorialStep {
  id: string;
  kind: "read" | "resource" | "movement" | "interaction" | "decision";
  title: string;
  text: string;
  resource?: Resource;
}
export const tutorialSteps: readonly TutorialStep[] = [
  { id: "welcome", kind: "read", title: auraWelcomeTitle, text: auraWelcomeText },
  { id: "mars", kind: "read", title: "Nuestro nuevo hogar", text: "Estamos en Marte, a millones de kilómetros de la Tierra. Aquí, cada máquina ayuda a cuidar a la tripulación." },
  { id: "mission", kind: "read", title: "Tres soles, una misión", text: "Mantendremos a salvo a cuatro astronautas durante tres soles y completaremos una investigación científica para enviarla a la Tierra." },
  { id: "energy", kind: "resource", resource: "energy", title: "La energía mantiene todo en marcha", text: "Alimenta las máquinas y el soporte vital. Los paneles producen de día; por la noche dependemos de las baterías. Puedes revisar ambos en Máquinas." },
  { id: "oxygen", kind: "resource", resource: "oxygen", title: "Aire para respirar", text: "Los astronautas consumen oxígeno. El soporte vital recupera la reserva mientras funciona y tiene electricidad. Si falla, la reserva disminuye." },
  { id: "water", kind: "resource", resource: "water", title: "El agua se comparte", text: "La tripulación, los cultivos y los análisis necesitan agua. El reciclador recupera una parte mientras tiene electricidad y está operativo." },
  { id: "food", kind: "resource", resource: "food", title: "Comida para cuatro", text: "La tripulación consume alimentos con el tiempo. El invernadero permite cosechar más, pero necesita agua, energía y paciencia: las plantas no crecen al instante." },
  { id: "health", kind: "resource", resource: "health", title: "Así está nuestra tripulación", text: "La salud empeora si faltan recursos esenciales o aumenta demasiado la exposición simulada. Cuida el soporte vital y utiliza el refugio cuando corresponda." },
  { id: "radiation", kind: "resource", resource: "radiation", title: "Protección y exposición", text: "Marte no ofrece la misma protección natural que la Tierra. Consulta aquí la exposición simulada y, ante una alerta, el protocolo del refugio. Esta escala no es una medición científica." },
  { id: "movement", kind: "movement", title: "Tu turno: camina", text: "WASD o flechas para caminar. Recorre un pequeño tramo; yo vigilo las reservas mientras practicas." },
  { id: "interaction", kind: "interaction", title: "¡Perfecto! Ya puedes explorar", text: "Acércate al equipo de la misión marcada. Cuando estés cerca, pulsa E para interactuar." },
  { id: "decision", kind: "decision", title: "Tu primera decisión", text: "Completa una acción real. Las reservas están protegidas del paso del tiempo, pero tus decisiones sí aplican sus costes." },
  { id: "help", kind: "read", title: "Todo listo para explorar", text: "C o mi retrato abre la conversación conmigo. Elige «Explícame los recursos» y después Energía, Oxígeno o Agua. También puedes preguntarme qué misión sigue y cómo llegar. H abre la ayuda; J las misiones, M el mapa y R las reservas." },
];
