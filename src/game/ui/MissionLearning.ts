import type { Simulation } from "../systems/Simulation";
import { campaignSources } from "../systems/Campaign";
export interface MissionLesson { key: string; title: string; why: string; real: string; effect: string; next: string; source: { label: string; url: string }; objective: boolean; }
const life = { label: "NASA · Sistemas de soporte vital", url: "https://www.nasa.gov/reference/jsc-life-support-subsystems/" };
const radio = { label: "NASA · Comunicaciones de Marte", url: "https://science.nasa.gov/mars/mars-relay-network/" };
const solar = { label: "NASA CCMC · DONKI", url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" };
const plantScience = { label: "NASA · Plantas en el espacio", url: "https://science.nasa.gov/eclips/videos/plants-in-space/" };
type Copy = [string, string, {label:string;url:string}];
export const missionLessonCopy: Record<string, Copy> = {
  "collect-plant": ["Recogiste una hoja. A esa pequeña parte de la planta la llamamos muestra. La llevaremos al Laboratorio para empezar una prueba sobre cómo cuidar el cultivo.", "Las hojas usan la luz para fabricar alimento: ese proceso se llama fotosíntesis. NASA utiliza luces LED para cultivar plantas en el espacio. En nuestra base también debemos cuidar el agua y la iluminación.", plantScience],
  "analyze-plant": ["El análisis preparó una comparación entre usar menos agua o intentar crecer más rápido. Ahora tenemos información para elegir, en vez de ajustar el cultivo a ciegas.", "Un experimento compara condiciones y registra qué cambia. La CSA propone actividades de investigación sobre producción de alimentos. Los porcentajes y el escáner de este juego son simplificaciones, no resultados de un estudio real.", campaignSources.plants],
  "plant-plan": ["Elegiste qué cuidar primero: ahorrar agua o acelerar el cultivo. Cada opción tiene un coste; crecer más rápido no significa que sea siempre la mejor solución.", "En un sistema de cultivo hay que administrar recursos limitados. Comparar alternativas también sirve para decidir cómo producir alimentos con menos recursos en lugares remotos.", campaignSources.plants],
  "plant-trial": ["Plantaste con la forma de riego que elegiste. El cultivo ya está en marcha y usará agua y electricidad mientras crece.", "Plantar es el comienzo del proceso: obtener comida requiere cuidar las condiciones y esperar al crecimiento. En un lugar aislado hay que preparar esos recursos antes de necesitar la cosecha.", campaignSources.plants],
  "batteries": ["Preparaste una reserva para los equipos que seguirán funcionando sin luz solar. Guardar energía ahora permite mantener aire, agua y cultivos durante la noche.", "El soporte vital depende de sistemas que trabajan juntos. Planificar la energía evita que una falta de electricidad afecte también al aire y al agua. Nuestra previsión nocturna usa números simulados.", life],
  "diagnose-night": ["Relacionaste una señal con el equipo que puede explicarla. Diagnosticar primero evita gastar repuestos en una máquina que no causa el problema.", "En ingeniería se comparan observaciones con el funcionamiento esperado de un sistema. Saber qué hace cada componente ayuda a encontrar y reparar una avería.", life],
  "restore-night": ["Restauraste el circuito que estaba fallando. Su producción puede volver a alimentar las reservas; reparar no rellena mágicamente todo lo que ya se consumió.", "El soporte vital necesita mantenimiento para seguir proporcionando un ambiente habitable. Los controles del minijuego representan esa idea, pero no son instrucciones para reparar equipos reales.", life],
  "collect-water": ["Guardaste una muestra de agua del reciclador. Queremos estudiar cómo conservarla y qué energía necesita el sistema, no recogerla sin un propósito.", "La ISS utiliza sistemas de recuperación de agua para reducir el suministro necesario desde la Tierra. Una muestra de nuestro juego no demuestra que un agua real sea potable.", campaignSources.water],
  "analyze-water": ["Revisamos la reserva y el funcionamiento del reciclador. Podemos decidir entre recuperar más agua usando más electricidad o reducir la demanda.", "Recuperar agua ayuda a aprovechar un recurso limitado en el espacio. En la vida real se necesitan procesos y controles de calidad que este juego no reproduce.", campaignSources.water],
  "water-plan": ["Aplicaste una decisión basada en la evidencia del agua. Ahora cambiará su recuperación o su consumo: observa cómo responde la reserva durante la noche.", "Ahorrar un recurso y producirlo son cosas distintas. Un sistema de recuperación reduce necesidades de reabastecimiento, pero también necesita equipos que funcionen.", campaignSources.water],
  "night-protection": ["Terminó el ejercicio nocturno. Las reservas y la exposición registradas muestran las consecuencias de preparar energía, reparar y proteger a la tripulación.", "Estudiar actividad solar ayuda a preparar procedimientos. DONKI guarda observaciones y análisis solares; no calcula la dosis en nuestra colonia ficticia. La noche del juego no representa una misión real.", solar],
  "analyze-soil": ["Comparamos configuraciones del sustrato experimental. El objetivo es elegir cómo controlar el cultivo, no asumir que cualquier suelo sirve para plantar.", "NASA investiga sistemas que controlan el suministro de agua y nutrientes a las plantas, como PONDS. Nuestro ensayo es ficticio y no mide la composición del suelo real de Marte.", campaignSources.soil],
  "soil-plan": ["Elegiste cómo adaptar el ensayo: aislar el circuito o acondicionar el sustrato. Ambos caminos gastan recursos distintos y cambian el crecimiento del modelo.", "Diseñar una solución significa comparar costes y condiciones, no buscar un botón correcto para todos los casos. Los valores de esta decisión son del juego, no recomendaciones agrícolas de NASA.", campaignSources.soil],
  "verify-trial": ["El cultivo volvió a crecer después de tu intervención. Ese cambio observable es la evidencia que necesitábamos para incluir la decisión en el informe.", "Probar una solución y observar sus efectos permite revisar las conclusiones. Nuestro ensayo breve enseña esa relación, pero no sustituye un experimento científico real.", campaignSources.soil],
  "report": ["Enviaste el informe con las decisiones y las observaciones de la colonia. El objetivo de envío está completado; la respuesta de Tierra llegará después.", "Las señales de radio necesitan tiempo para viajar. Por eso enviar un mensaje y recibir su respuesta son pasos distintos. Aquí la espera está reducida para poder jugar.", radio],
  "planted": ["Iniciaste el cultivo con la estrategia elegida. Ahora consumirá recursos y necesitará tiempo para crecer: pulsar Plantar no crea comida al instante.", "Investigar la producción de alimentos incluye observar cómo responden los cultivos a sus condiciones. Aquí el tiempo y el crecimiento están acelerados.", campaignSources.plants],
  "sheltered": ["Activaste el traslado y la protección de la tripulación durante el ejercicio. El protocolo reduce la exposición simulada; no es un escudo mágico ni una dosis medida.", "La preparación ante actividad solar requiere contexto y procedimientos. Un registro histórico de DONKI no demuestra por sí solo peligro en Marte.", solar],
  "transmitted": ["Enviaste el informe con lo que pudiste comprobar. Todavía falta recibir la confirmación: transmitir y recibir una respuesta son pasos diferentes.", "Las señales necesitan tiempo para viajar entre Marte y la Tierra. La espera del juego está acelerada y no representa el tiempo real de una comunicación.", radio],
  "harvested": ["Recogiste un cultivo maduro y aumentó la reserva de alimentos. Se utilizaron agua, electricidad y tiempo antes de obtener esa comida.", "Producir alimentos requiere planificar todo el proceso, no solo la cosecha. Los rendimientos del juego son inventados y no representan un cultivo real.", campaignSources.plants],
  "tended": ["Ajustaste las condiciones del cultivo. Su crecimiento cambia, pero seguirá necesitando recursos y tiempo.", "Controlar el suministro de agua y las condiciones de crecimiento es parte de investigar sistemas de cultivo para el espacio.", campaignSources.plants],
};
const briefMessages: Record<string,string> = {
  "analyze-plant": "Terminaste la prueba y elegiste cómo regar. Usarás esa elección cuando plantes en el Invernadero.",
  "plant-plan": "Comparaste dos formas de cuidar la planta y elegiste una: ahorrar agua o intentar que crezca antes. Esa elección se aplicará al nuevo cultivo.",
  "plant-trial": "Plantaste con la forma de riego que elegiste. El cultivo ya está en marcha y necesitará agua, electricidad y tiempo.",
  "batteries": "La reserva está preparada. Cuando se oculte el Sol, las baterías mantendrán los equipos en marcha.",
  "diagnose-night": "Encontraste el circuito que explica la señal. Ahora sabemos dónde hace falta intervenir.",
  "restore-night": "El circuito vuelve a funcionar. Su producción ayudará a recuperar las reservas que se estaban consumiendo.",
  "collect-water": "La muestra de agua está guardada. La estudiaremos para decidir cómo conservar agua sin agotar la electricidad.",
  "analyze-water": "El análisis permite comparar dos opciones: recuperar más agua con energía o reducir su consumo.",
  "water-plan": "La estrategia de agua está aplicada. Su efecto ya forma parte del consumo y la recuperación de la base.",
  "night-protection": "Activaste el refugio y la tripulación está a cubierto. Ahora podemos atender los demás sistemas que sigan pendientes.",
  "analyze-soil": "La comparación del sustrato está lista. Elige una configuración que puedas sostener con tus reservas.",
  "soil-plan": "La configuración está aplicada. Falta comprobar que el cultivo crezca después de la intervención.",
  "verify-trial": "El cultivo respondió a la intervención. Ya tenemos una observación que respalda la decisión del informe.",
  "planted": "El cultivo está en marcha. Necesita agua, electricidad y tiempo; plantar no crea comida al instante.",
  "sheltered": "La tripulación está a cubierto. El protocolo reduce la exposición simulada durante el ejercicio.",
  "transmitted": "El informe salió hacia Tierra. La misión se cerrará cuando llegue la confirmación.",
  "harvested": "La cosecha ya está en la reserva de alimentos. Puedes iniciar otro cultivo cuando lo necesites.",
  "tended": "Las condiciones del cultivo están ajustadas. Observa su crecimiento y cuida el agua disponible.",
};
const completedTitles: Record<string,string> = { "collect-plant":"Hoja recogida", "analyze-plant":"Forma de riego elegida", "plant-trial":"Cultivo plantado", batteries:"Baterías preparadas", "restore-night":"Equipo reparado", "water-plan":"Plan para conservar agua aplicado", "night-protection":"Tripulación protegida", "soil-plan":"Material del cultivo preparado", "verify-trial":"Crecimiento comprobado", report:"Informe enviado" };
export function nextLessonStep(sim: Simulation) {
  const c=sim.campaign!;
  if (sim.status !== "playing") return "Revisa el resultado de la operación y las decisiones que lo hicieron posible.";
  if (c.pending) return "Continúa con AURA hacia la siguiente etapa. Tus recursos y decisiones se conservan.";
  const current=c.objectives(sim).find((o)=>!o.done&&!o.waiting);
  switch(current?.id) {
    case "collect-plant": return "Ve al Invernadero y recoge la muestra para empezar la investigación del cultivo.";
    case "analyze-plant": return sim.expedition.results.includes("plant") ? "Elige una estrategia en el Laboratorio: ahorrar agua o acelerar el cultivo." : "Ve al Laboratorio. El escáner permite comparar riego y crecimiento antes de elegir cómo cultivar.";
    case "plant-trial": return "Vuelve al Invernadero y pulsa Plantar. Así pondrás en marcha el cultivo con el riego que elegiste.";
    case "batteries": return "Ve a Máquinas y prepara la reserva de energía para mantener la base durante la noche.";
    case "restore-night": return `Ve a ${c.nightRisk === "power" ? "Máquinas" : "Soporte vital"}. Inspecciona y restaura el circuito para recuperar su producción.`;
    case "water-plan": return !sim.expedition.collected.water ? "Recoge agua del reciclador en Soporte vital para estudiar cómo conservarla." : !sim.expedition.results.includes("water") ? "Lleva el agua al Laboratorio para comparar recuperación y gasto eléctrico." : "Elige en el Laboratorio cómo conservar agua con las reservas disponibles.";
    case "night-protection": return "Ve al Refugio y activa el protocolo para proteger a la tripulación.";
    case "soil-plan": return sim.expedition.results.includes("soil") ? "Elige en el Laboratorio cómo adaptar el sustrato a tus reservas." : "Analiza el sustrato en el Laboratorio para elegir cómo adaptar el cultivo.";
    case "verify-trial": return "Ve al Invernadero y pulsa Comprobar crecimiento para registrar cómo respondió la planta al cambio.";
    case "report": return sim.report === "pending" ? "Cuida las reservas mientras llega la confirmación de Tierra." : "Ve al enlace con Tierra en Control y transmite las evidencias de tu investigación.";
    default: return "Consulta a AURA para revisar el estado de la colonia.";
  }
}
export class MissionLearning {
  private seen = new Set<string>();
  private queue: MissionLesson[] = [];
  reset() { this.seen.clear(); this.queue = []; }
  observe(sim: Simulation) {
    if (!sim.campaign) return;
    for (const objective of sim.campaign.objectives(sim)) if (objective.done) this.add(objective.id, objective.title, sim, true);
  }
  action(action: string, sim: Simulation) {
    this.observe(sim);
  }
  private add(id: string, title: string, sim: Simulation, objective: boolean) {
    const copyId = id.startsWith("result-") ? `analyze-${id.slice(7)}` : id === "analyze-plant" && sim.campaign!.plantPlan ? "plant-plan" : id;
    const copy = missionLessonCopy[copyId], key = id.startsWith("result-") ? id : `${sim.campaign!.level}:${id}`;
    if (!copy || this.seen.has(key)) return;
    this.seen.add(key);
    this.queue.push({ key, title: completedTitles[id] || title, why: briefMessages[copyId] || copy[0], real: copy[1], source: copy[2], objective, effect: `Energía ${Math.ceil(sim.resources.energy)} · Agua ${Math.ceil(sim.resources.water)} · Comida ${Math.ceil(sim.resources.food)} / 100. ${sim.campaign!.decisions.join(". ") || "La muestra está guardada para continuar la investigación."}`, next: nextLessonStep(sim) });
  }
  take() { return this.queue.shift(); }
}
