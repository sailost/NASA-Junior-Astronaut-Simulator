# SOL-3: Base Aurora — auditoría de diseño y encargo de corrección

Auditoría del código local. No se modificaron las mecánicas para elaborar este documento. Los hallazgos describen la implementación; las propuestas posteriores son trabajo pendiente. No se realizó una nueva verificación externa de las fuentes científicas ni una prueba visual de usuario durante esta auditoría.

## Estado real

- Motor: Phaser 3, TypeScript y Vite, con recursos locales y rutas relativas para GitHub Pages. Sin servicios de IA de pago.
- Presentación: menú ilustrado con zonas interactivas, respuesta al clic y transición; prólogo de tres páginas con giro curvado, navegación, botón ilustrado funcional y entrada cinematográfica.
- Mundo: seis salas, pasillos, exterior marciano, interiores PNG, astronauta cenital, colisiones e interacciones con E.
- Sistemas: energía, oxígeno, agua, alimentos, salud y exposición simulada; repuestos, ciclos diurnos/nocturnos, cultivos, prioridades de consumo, averías y refugio.
- Interacciones: siete minijuegos de aire, agua, circuito, laboratorio, antena, invernadero y refugio.
- Ayuda: AURA con bienvenida central, glosario interactivo de recursos, conversaciones locales ligadas al estado, recomendaciones y orientación. Tutorial y ayuda contextual.
- Ciencia: archivo local con registros históricos DONKI, lecturas RadLab identificadas como ISS y referencias NASA/CSA. El archivo y las conversaciones separan mediciones reales de la simulación.
- Progresión: una operación de tres soles de 180 segundos. No existe una campaña de niveles diferenciados ni guardado de una partida en curso; se conservan preferencias, progreso del tutorial y mejor puntuación.
- Victoria: llegar a 540 segundos con tres investigaciones y el informe confirmado. Derrota por supervivencia o por incumplir los requisitos al terminar el plazo.

## Hallazgos prioritarios

### 1. Investigar incrementa un contador; no produce conocimiento utilizable

`Expedition.results` almacena identificadores de muestras. `Simulation` incrementa `research` al terminar su procesamiento. No hay una hipótesis, medición interpretada, comparación, incertidumbre o recomendación que el jugador tenga que aplicar. Las tres muestras cambian los objetivos del escáner, pero no constituyen tres problemas científicos diferentes.

### 2. Hay dependencias de orden sin justificación visible

`objectives.ts` y `Simulation.loadSample()` condicionan los análisis posteriores a `batteriesReady`. No basta con disponer de electricidad: se exige haber marcado esa preparación. Falta explicar una necesidad real del experimento o retirar esa barrera. El suelo está en el inventario desde el inicio; esto se explica en la terminal, pero no añade una decisión científica propia.

### 3. NASA está integrada documentalmente, pero apenas dirige lo que se juega

`science.json`, `ScienceArchive.ts` y `AuraDialogue.ts` contienen ciencia y referencias. No sería correcto afirmar que no hay integración. El problema es que resulta mayormente consultiva: completar la investigación no exige interpretar una evidencia ligada a esas fuentes.

La selección de un registro DONKI aporta contexto y cambia la duración simulada del episodio solar según FLR/CME, pero no implementa una inferencia de amenaza marciana basada en observaciones. Esto no debe presentarse como predicción real. RadLab contiene datos de la ISS, no dosis de Marte.

En `Interface.launchPuzzle()`, un análisis correcto cierra la consola antes de mostrar la pantalla común de resultado y explicación. Las demás actividades pueden mostrar una nota y una fuente plegable. La experiencia científica principal es precisamente una de las que menos conclusiones presenta.

### 4. Los soles no son niveles

Son divisiones del reloj dentro de una misma operación. No hay una pregunta central por etapa, un cierre que demuestre aprendizaje, nuevas capacidades derivadas de resultados ni una siguiente operación jugable desbloqueada.

### 5. La condición final puede convertir el cierre en una espera

La victoria exige alcanzar el final del tercer sol aunque los análisis y la transmisión ya estén listos. Quedan mantenimiento y eventos, pero no un nuevo objetivo principal que dé sentido al tiempo restante.

### 6. Las averías dependen principalmente de un guion temporal

Hay disparadores a los 80, 145, 218, 335 y 400 segundos, con algunas variantes por semilla o estado. No existe un sistema general de síntomas y diagnóstico que explique anticipadamente por qué se degrada un equipo. Las emergencias sí afectan a las reservas; lo que falta es hacer legible y enseñable esa relación causal.

### 7. Parte de las acciones tiene poca necesidad estratégica

La comida comienza en 72 y su consumo base es 0,065 por segundo. En 540 segundos supone 35,1 unidades: quedaría en 36,9 sin cosechar, considerando ese consumo y sin otros cambios. Así, el cultivo opcional no es necesario por ese recurso en una operación normal. No es una demostración de que toda la partida sea trivial; sí explica por qué esa actividad puede parecer accesoria.

Las terminales permiten mantenimiento de aire, agua y baterías incluso estando operativas, cobrando energía y repuestos. Esto necesita un motivo observable o una restricción: reparar algo sano resulta confuso.

### 8. Los minijuegos verifican manipulación más que comprensión

Girar válvulas hasta una marca, unir A con A o alinear anillos comprueba controles, pero apenas exige decidir a partir de una observación. Hay efectos reales sobre la simulación; falta que la elección y el resultado enseñen algo aplicable al siguiente problema.

### 9. Ya hay orientación espacial; falta orientación causal

Existen rutas, marcadores, mapa y flecha hacia objetivos fuera de cámara. No hay que duplicarlos con más flechas permanentes. Faltan señales de estado: qué cambió, por qué importa, qué evidencia lo indica y qué ocurrirá si no se actúa. También faltan comunicaciones que conecten los resultados con la evolución de la operación.

### 10. La puntuación no demuestra aprendizaje

La evaluación final suma salud, investigaciones, reparaciones, cosechas y mejoras. No registra si el jugador formuló una hipótesis útil, interpretó una evidencia o justificó una decisión. Las pruebas técnicas pueden confirmar que el código aplica esas reglas, pero no que las reglas resulten interesantes o educativas.

## Archivos que debe revisar la corrección

`src/game/systems/Simulation.ts`, `objectives.ts`, `Expedition.ts`, `events.ts`; `src/game/config/balance.json`; `src/game/minigames/Minigame.ts` y `puzzles.ts`; `src/game/ui/Interface.ts`, `MachineTerminal.ts`, `MissionTracker.ts`, `AuraDialogue.ts`, `AuraCoach.ts`, `ResourceHelp.ts`, `ScienceArchive.ts`; `src/game/tutorial/`; `src/game/data/Science.ts`; `public/data/science.json`; y las pruebas relacionadas. El renderizado del mundo y el prólogo son infraestructura a conservar.

---

## PROMPT PARA COPIAR Y ENCARGAR LA CORRECCIÓN

Actúa como diseñador senior de videojuegos educativos y desarrollador de Phaser 3, TypeScript y Vite. Trabaja directamente en el proyecto existente SOL-3: Base Aurora.

Primero lee `docs/AUDITORIA-Y-PROMPT-GAMEPLAY.md` y contrasta sus hallazgos con el código actual. No confundas propuestas con funciones ya implementadas. No quiero otra mejora cosmética ni una lista mayor de recados: quiero una progresión jugable con propósito científico, consecuencias y cierre.

### Objetivo de diseño

El jugador debe comprender por qué actúa, observar un resultado, tomar una decisión informada y ver cómo esa decisión cambia la colonia y permite avanzar. El ciclo central será: señal o problema → pregunta → evidencia → decisión → intervención → consecuencia observable → siguiente desafío.

### 1. Reorganiza la operación en tres etapas jugables

Reutiliza la base y sus sistemas. Implementa etapas realmente distintas, con entrada, objetivo, desafío, resultado y transición funcional:

1. **Comprender y estabilizar:** conocer las dependencias entre electricidad, agua, aire y alimentos; diagnosticar un problema concreto mediante indicadores y tomar una decisión que recupere el sistema.
2. **Investigar y decidir:** obtener una muestra con un propósito, compararla con una referencia adecuada, interpretar el resultado simulado y aplicar una decisión de cultivo, reciclaje o distribución energética. El resultado debe cambiar la estrategia disponible.
3. **Demostrar autonomía:** afrontar una situación que exija aplicar lo aprendido, justificar el protocolo elegido, elaborar un informe con resultados concretos y obtener una respuesta que evalúe esa evidencia.

Los ciclos de día y noche deben seguir importando. No conviertas el paso del tiempo en el único requisito para desbloquear etapas. Elimina el tramo de espera sin objetivo después de enviar un informe. Da un desenlace por objetivos demostrables y una siguiente operación funcional o una variante desbloqueada con un desafío distinto; no coloques un botón de continuación sin contenido.

### 2. Rediseña las misiones mediante una estructura explícita

Cada misión debe declarar su problema, motivo, ubicación, equipo, evidencia inicial, hipótesis o elección, requisitos justificados, coste, éxito observable, consecuencias, concepto educativo y relación con la siguiente misión. Usa estados explícitos y datos estructurados, no dependencias ocultas en textos o contadores dispersos.

Elimina las barreras arbitrarias. Si un análisis requiere alimentación estable, muestra la necesidad y compruébala en el sistema. Si las baterías no son realmente un requisito de ese experimento, no uses un booleano de preparación para bloquearlo.

Evita pedir reparaciones de equipos sanos. Si existe mantenimiento preventivo, muestra desgaste, diagnóstico y beneficio real. Todas las tareas obligatorias deben tener una función demostrable en la misión principal.

### 3. Convierte los análisis en resultados útiles

No basta con guardar `plant`, `water` o `soil` ni sumar uno a `research`. Cada experimento debe producir un resultado comprensible y persistente en la partida: observación, comparación, interpretación, limitaciones y decisión disponible.

Ejemplo de diseño, no dato científico real: un experimento simulado puede comparar dos configuraciones de riego y mostrar su crecimiento y consumo, para que el jugador elija una estrategia compatible con sus reservas. Las cifras inventadas deben identificarse como simuladas.

No obligues a fallar un cuestionario de trivia para avanzar. Evalúa comprensión mediante elecciones con consecuencias y oportunidades de corregirlas.

### 4. Integra NASA y CSA dentro de la experiencia

Audita y verifica las fuentes oficiales antes de incorporar nuevas afirmaciones. Reutiliza el archivo existente cuando sea pertinente. Para cada actividad explica qué fuente aporta contexto, qué se observó realmente, qué parte se simplifica y qué inventa el juego.

Muestra una explicación breve en el momento oportuno y deja los detalles y enlaces disponibles. No escondas toda la enseñanza en el archivo opcional. El laboratorio debe devolver conclusiones visibles sin exigir buscar un menú secundario.

No conviertas los datos RadLab de la ISS en radiación marciana. No conviertas registros DONKI en una predicción automática para Base Aurora. No atribuyas resultados inventados a OSD-37 ni extrapoles vuelo espacial a cultivo marciano sin justificación. Si faltan datos adecuados, utiliza un experimento claramente simulado con una referencia conceptual correcta. No uses logotipos como aval institucional.

### 5. Introduce señales y comunicaciones con función real

Antes de una emergencia presenta síntomas legibles: caudal, consumo, tendencia, alimentación, estado de conexión u otro indicador coherente con el modelo. El jugador debe poder identificar el problema y comprender qué cambió después de intervenir.

Reutiliza rutas y marcadores existentes. Identifica la sala y la máquina sin saturar la pantalla. Distingue aviso, diagnóstico, acción disponible y consecuencia. Añade mensajes o respuestas de Tierra que nazcan de resultados reales y decisiones de la partida; no señales arbitrarias para fabricar otra tarea. No presentes comunicaciones ficticias como datos recibidos de NASA.

### 6. Revisa minijuegos y balance

Conserva los controles útiles de los siete minijuegos, pero permite cambiar sus reglas cuando sea necesario para vincular observación, decisión y resultado. Una coincidencia de colores o letras no debe presentarse como explicación suficiente de ingeniería o ciencia.

Haz que fallar explique la causa y permita reintentar con información. Revisa reservas, consumos, costes y duración para que haya decisiones viables, alternativas y consecuencias legibles. No hagas obligatoria una cosecha mediante un bloqueo artificial: diseña su necesidad a través del desafío. Evita tanto la espera vacía como la escasez que produzca derrotas inevitables.

### 7. Conserva a AURA como compañera

Mantén la bienvenida central, la consulta de recursos y la conversación contextual. AURA debe explicar el porqué de la misión, ayudar a leer evidencias y comentar la consecuencia de la decisión. Debe seguir el estado real, evitar repetir el cómic y graduar las pistas sin resolver todo automáticamente. No crear otro tutorial paralelo.

### 8. Autoridad y límites de esta corrección

Autorizo modificar misiones, requisitos, eventos, balance, progresión y condiciones de victoria cuando sea necesario para este rediseño. Las antiguas restricciones de cambios exclusivamente visuales no impiden esta fase.

Conserva Phaser 3, TypeScript, Vite, GitHub Pages, funcionamiento local y ausencia de servicios de IA de pago. Preserva el menú, el cómic, las imágenes originales, el arte de interiores y exterior, la perspectiva cenital, el movimiento, las posiciones de salas y las colisiones, salvo un error concreto que impida la nueva experiencia y que debas documentar. No rehagas el motor ni añadas dependencias pesadas sin necesidad.

### 9. Implementación y validación

Antes de programar, resume el diseño final y una tabla de misiones con problema, evidencia, decisión, efecto y fuente. Después implementa sin detenerte a pedir confirmación entre etapas.

Prueba el recorrido completo desde menú y prólogo hasta el desenlace, transiciones de etapa, consecuencias de elecciones distintas, pistas de AURA, reintentos, pausa, reinicio y derrota. Verifica que cada resultado se use después, que no queden bloqueos inexplicables ni tareas obligatorias irrelevantes y que una etapa no pueda completarse solo esperando.

Añade pruebas de estados, dependencias, resultados e integración; actualiza las anteriores cuando cambien las reglas deliberadamente y explica esos cambios. Ejecuta `npm test` y `npm run build`. Realiza una revisión visual y una partida completa si tienes acceso al navegador. Distingue expresamente pruebas automáticas de una revisión visual; si existe un bloqueo, descríbelo sin afirmar que se comprobó lo que no se pudo comprobar.

Al finalizar entrega: qué enseñan las etapas, cómo se conectan las misiones, qué decisiones cambian la colonia, dónde aparecen NASA/CSA, qué reglas cambiaron, archivos modificados, resultados de validación y limitaciones pendientes.

No consideres terminada la corrección por cambiar textos, añadir insignias, mostrar fuentes o crear botones de niveles. Debe existir una cadena funcional de evidencia, decisión, consecuencia y progresión.
