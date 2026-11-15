# Revisión de explicaciones y tiempos

Esta revisión sustituye las instrucciones anteriores sobre temporizadores en los tres niveles y explicaciones de avances parciales.

- El plazo de 20 segundos y su penalización de salud solo funcionan en el nivel 2. El indicador queda oculto en día y amanecer. Las consolas de los niveles 1 y 3 tampoco tienen cuenta atrás de minijuego.
- Las explicaciones se generan exclusivamente para objetivos completados. Calibrar un equipo, recoger un material que sea solo un paso de una misión mayor o recibir un resultado parcial no abre una explicación independiente.
- En campaña, el laboratorio entrega su comparación al acabar el minijuego. Se elimina la espera automática de 6–8 segundos y se muestran las decisiones en la misma consola.
- Plantar completa el objetivo de poner en marcha el cultivo al pulsar su control, sin esperar un crecimiento arbitrario del 10 %. La planta sigue necesitando tiempo y recursos para crecer.
- La comprobación final requiere pulsar **Comprobar crecimiento** en el Invernadero después de un cambio y de crecimiento observado. Ya no se completa automáticamente tras ocho segundos. Si no hay crecimiento, se explica lo que falta sin presentar el objetivo como terminado.
- Enviar el informe completa el objetivo de envío inmediatamente. La confirmación de Tierra sigue siendo necesaria para evaluar el desenlace y llega después; el cuadro de envío no afirma haberla recibido.
- Los textos definen los términos: una muestra vegetal es una pequeña parte de la planta; en el juego se recoge una hoja. El sustrato es el material donde crecen las raíces.
- El cuadro enseña directamente: qué se hizo, qué concepto explica esa acción y cuál es el siguiente paso. Se eliminan los controles «Cómo cambia mi partida», «Ver efecto en la colonia» y «Fuente para conocer más», así como sus equivalentes desplegables. Las referencias se conservan en los metadatos y en el archivo científico existente.
- La pausa de lectura y el bloqueo de cinco segundos antes de Continuar siguen vigentes. No se cobran recursos durante esa lectura.

## Persecución y guía de objetivos

- En el nivel 2 hay un marcianito ficticio por misión pendiente. Persiguen al astronauta por las zonas transitables, sin atravesar paredes ni máquinas. Cada misión completada hace desaparecer a su perseguidor inmediatamente.
- El contacto resta 1,1 puntos de salud por segundo y perseguidor, incluso antes del plazo de misión. Después del plazo sube a 1,65 y se mantiene la penalización nocturna existente. Correr permite mantener la distancia: la velocidad del jugador no cambia.
- Las explicaciones, las pausas y las consolas detienen la persecución y el daño por contacto. Al volver a explorar continúa desde la misma posición. Los plazos de las consolas siguen las reglas anteriores.
- La salud se resalta al recibir un ataque. La guía nocturna avisa de que se debe evitar el contacto. Si la salud llega a cero, se aplica la derrota existente con la explicación del ataque.
- La flecha sigue visible cuando el equipo entra en pantalla y al llegar a él. Apunta al objetivo actual hasta terminarlo y después señala el siguiente, incluidos los pasos del agua entre el reciclador y el laboratorio. Pulsar una misión futura no abandona la misión activa de campaña.
- Las rutas de persecución se recalculan como máximo cada 0,9 segundos por perseguidor, solo cuando es necesario, para evitar buscar caminos en cada fotograma.

## Base científica consultada

- NASA eClips, [Plants in Space](https://science.nasa.gov/eclips/videos/plants-in-space/): fotosíntesis y luces LED para cultivar. El texto explica fotosíntesis como el uso de luz para fabricar alimento.
- NASA, [Life Support Subsystems](https://www.nasa.gov/reference/jsc-life-support-subsystems/): funciones de los sistemas que mantienen un entorno habitable.
- NASA, [recuperación de agua en la ISS](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/): recuperación y reducción de reabastecimiento. No se atribuyen al juego las mediciones de la ISS.
- CSA, [Food production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/): producción de alimentos para el espacio y lugares remotos.

El lector y las comparaciones del laboratorio siguen siendo una representación educativa: no se afirma que escanear una hoja real determine por sí solo el riego adecuado, ni que el suelo ficticio sea una medición de Marte.

## Comprobaciones

Las pruebas operan los controles de la consola de laboratorio, terminan el minijuego, aplican una decisión y plantan. Verifican que la explicación aparezca en la acción que termina el objetivo, que no aparezcan cuadros después de unos segundos por avances parciales y que se reanude la partida tras la lectura. Otras pruebas verifican el temporizador nocturno y su ausencia funcional en los niveles 1 y 3.

La revisión automática del flujo no equivale a una comprobación visual en navegador.
