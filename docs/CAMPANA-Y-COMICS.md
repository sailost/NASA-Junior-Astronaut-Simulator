# Campaña de autonomía y cómics de SOL-3

> **Nota de estado (15 de noviembre de 2026):** este documento registra la versión anterior con páginas narrativas. En la aplicación actual, las escenas de producción se reproducen desde `public/assets/cinematics/` mediante `CampaignCinematic.ts`; este historial ya no define el flujo audiovisual activo.

## Flujo implementado

Menú → prólogo original → nivel 1 (día) → escena de noche → nivel 2 (noche) → escena de amanecer → nivel 3 (amanecer) → desenlace de victoria / éxito parcial / derrota → informe de resultados.

Las imágenes originales del prólogo permanecen en `public/assets/world/intro/`. `Prologue.ts` es el único lector: conserva el giro de papel curvado y ahora admite secuencias de distinta longitud, ilustraciones y páginas narrativas provisionales. No se añadió otra biblioteca.

## Objetivos y consecuencias

| Etapa | Evidencia y decisión | Condición para avanzar |
| --- | --- | --- |
| Día | Recoger y analizar planta; escoger ahorro de agua o crecimiento intensivo; cultivar; preparar reserva nocturna o captación solar. | Perfil aplicado, crecimiento observado de al menos 10 %, preparación energética y previsión viable. |
| Noche | Identificar la señal de un circuito, inspeccionarlo y restaurarlo; analizar agua y elegir más recuperación eléctrica o menor demanda; afrontar el protocolo preventivo. | Diagnóstico, reparación, decisión de agua y fin del protocolo; no basta con dejar pasar el tiempo. |
| Amanecer | Analizar el sustrato experimental; escoger circuito aislado o acondicionamiento; comprobar crecimiento tras la intervención y transmitir las evidencias. | Ensayo verificado e informe confirmado para el cierre completo; el jugador puede declarar un informe parcial con sus limitaciones. |

Los perfiles cambian realmente el modelo: ahorro de riego (agua de cultivo ×0,65; crecimiento ×0,8), crecimiento intensivo (riego ×1,25; crecimiento ×1,2), recuperación de agua (×1,2 con carga eléctrica adicional de 0,04/s), demanda reducida (consumo de tripulación ×0,8). El sustrato tiene dos costes y factores de crecimiento distintos. Todos son parámetros educativos inventados, no valores medidos por NASA/CSA.

La previsión de noche contempla 90 segundos sin generación y provisiones para los costes de análisis de agua, protección y mantenimiento aún pendientes. Es una estimación legible, no una garantía ante decisiones posteriores o demoras. La reserva inicial de alimentos de campaña es 38; el simulador independiente conserva su configuración anterior.

La operación ya no exige esperar al antiguo límite de 540 segundos después de completar el trabajo. Durante la campaña, día/noche/amanecer dependen de la etapa; las averías del antiguo guion temporal no se ejecutan en paralelo. El circuito nocturno se selecciona según reservas reales, presenta un síntoma, falla después de su aviso y permite un diagnóstico. El ejercicio solar se activa tras restaurar y diagnosticar el circuito. El registro DONKI es contexto histórico, nunca una predicción de exposición marciana.

## Conservación del estado y finales

La campaña trabaja sobre la misma instancia de `Simulation`. Antes de los interludios guarda instantáneas independientes de recursos, sistemas, decisiones y evidencias. Al leer, la simulación queda pausada y el astronauta sin controles. Avanzar y omitir llaman a la misma continuación protegida contra duplicados. Ninguna lectura otorga recursos ni reinicia misiones.

Estas instantáneas son registros de la partida en memoria y se incluyen en el informe JSON exportado; no se ha añadido un sistema de reanudación de partidas tras recargar el navegador.

- Victoria: tres evidencias, decisiones y ensayo aplicado, protección durante el ejercicio, recepción confirmada y estabilidad suficiente.
- Éxito parcial: recepción confirmada pero investigación o estabilidad incompleta, incluida la decisión explícita de enviar un informe parcial.
- Derrota: la condición real de supervivencia impide continuar, aunque suceda antes del tercer nivel.

Los cómics leen reservas, daños pendientes, historial de averías, historial de valores críticos, decisiones y recepción del informe. No afirman que todo funcione si hay daños. Después se abre el resumen existente, ampliado con evidencias, fuentes y comprobación del ensayo.

## Ilustraciones pendientes

Se han preparado `public/assets/story/intro/`, `sol2/`, `sol3/` y `endings/` con sus instrucciones. La carpeta intro documenta la ubicación original, sin duplicar imágenes.

Faltan diez ilustraciones: dos de noche, dos de amanecer y dos por cada uno de los tres finales. El manifiesto `pendingStoryArt` de `CampaignStory.ts` enumera nombres y no genera solicitudes de red. Mientras tanto, hay páginas funcionales de AURA con sprites existentes de equipos y diálogos breves, marcadas como provisionales. No se han generado ilustraciones sustitutas.

Para incorporar una ilustración final, asignar `image` a su página de la definición. El lector mantiene relación de aspecto y giro; revisar el contenido para no incrustar estados variables falsos.

## Referencias científicas

Consultadas en esta implementación:

- [CSA: herramientas sobre producción de alimentos](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/): contexto de alimentación espacial y actividades educativas.
- [NASA: recuperación de agua en la ISS](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/): sistemas de recuperación y reducción del reabastecimiento; no se trasladan cifras de la ISS a Marte.
- [NASA Technology Transfer: sistemas de habitabilidad y PONDS](https://technology.nasa.gov/advancing-commercial-space/habitation_systems): gestión de agua/nutrientes en cultivo. No caracteriza la composición real de nuestras muestras.
- [NASA CCMC: DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/): observaciones y análisis de actividad solar; no equivalen a dosis en una colonia ficticia.

Las evidencias se consultan en Laboratorio, Control, la antena y AURA. Su interpretación y decisión persisten en la partida. Los datos históricos originales, el contexto ISS de RadLab y las referencias previas se mantienen.

## Archivos principales

- `src/game/systems/Campaign.ts`: etapas, evidencias, decisiones, previsión, diagnóstico, instantáneas y evaluación.
- `src/game/systems/Simulation.ts`: conexión con las tasas existentes, modo campaña y desenlace parcial.
- `src/game/systems/objectives.ts`: objetivos contextuales de la campaña y conservación del simulador independiente.
- `src/game/ui/Prologue.ts`, `prologue.css`: lector reutilizable para todas las escenas.
- `src/game/ui/CampaignStory.ts`: secuencias adaptadas al estado y manifiesto de arte pendiente.
- `src/game/ui/CampaignTerminal.ts`, `MachineTerminal.ts`: evidencias, fuentes y decisiones funcionales; reparación de equipos sanos deshabilitada en campaña.
- `src/game/ui/Interface.ts`: flujo, pausa, transiciones únicas, desenlaces y resumen.
- `src/game/ui/AuraDialogue.ts`: interpretación de evidencias y consecuencias de etapa.
- `src/game/ui/ScienceArchive.ts`: elimina la referencia a un ciclo fijo de 180 segundos para no describir incorrectamente la campaña.
- `tests/campaign.test.ts`: recorridos con desplazamiento por rutas reales sin inyectar recursos, alternativas, estados, controles y lector.

Las pruebas existentes de interfaz, tutorial, entrada y AURA pueden seleccionar `{ campaign: false }` para conservar cobertura del simulador independiente. Producción activa la campaña por defecto y sus pruebas nuevas verifican ese flujo, incluidos los tres desenlaces. No es una opción visible en el producto.

## Validación y límites

Los recorridos automáticos comprueban objetivos, costes, conservación de estado, fin de etapa, omisión, recepción, derrota temprana y ensayo tras cosecha. Las pruebas del lector comprueban avance, retroceso, malla curvada y limpieza sin depender de ilustraciones pendientes. Las pruebas de producción operan los botones reales de decisiones y comprueban que el desenlace precede al resumen.

Las pruebas DOM y del modelo no sustituyen una partida visual en Phaser ni una medición de FPS. El arte final de las escenas nuevas sigue pendiente deliberadamente. El modo campaña añade una operación de tres etapas; no implementa una segunda campaña posterior con nuevos mapas.
