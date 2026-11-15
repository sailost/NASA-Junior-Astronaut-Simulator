# Misiones conectadas y noche marciana

La operación presenta cuatro misiones de día, tres nocturnas y tres de amanecer. El análisis y la elección posterior son pasos de una misma investigación; recoger, analizar y decidir sobre el agua forman un único problema nocturno. Los controles siguen siendo funcionales y conservan sus requisitos.

Tras cada explicación se muestra siempre el siguiente paso con su razón, no solo una dirección. Ejemplo: llevar la muestra vegetal al Laboratorio permite preparar una comparación de riego y crecimiento antes de gastar un cultivo entero. La muestra no se presenta como una semilla que se planta en el escáner. Las fuentes conceptuales NASA/CSA y las limitaciones del modelo siguen disponibles.

## Plazos y salud

Cada objetivo activo dispone de 20 segundos de simulación. Al vencer el plazo, la salud baja progresivamente: 0,3 unidades/s de penalización base y 0,12 adicionales por cada marcianito activo de noche. Las demás reglas de recuperación y supervivencia siguen aplicándose. El tiempo no se reinicia al abrir una consola ni al consultar a AURA. Las explicaciones protegidas, el tutorial y la pausa detienen el simulador y, con él, el plazo y el daño.

La primera práctica de un minijuego conserva su protección para aprender. El contador aparece en el panel de misión actual. La confirmación del informe tarda 8 segundos en campaña para que la propia espera obligatoria no supere el plazo de 20; el simulador independiente conserva su demora anterior.

## Tres problemas nocturnos

1. Diagnosticar y restaurar el circuito averiado. Su señal y avería aparecen al comenzar la noche.
2. Asegurar el agua: recoger, estudiar y aplicar una estrategia de recuperación o ahorro.
3. Proteger a la tripulación durante el protocolo preventivo.

Hay un adversario visible de Phaser por cada misión nocturna pendiente. La cantidad pasa de 3 a 0 al resolverlas. No tienen colisiones adicionales ni alteran las rutas. La desaparición se deriva del resultado de la acción, antes de la explicación protegida. El daño aumenta con los adversarios pendientes cuando el objetivo activo está fuera de plazo.

Los adversarios son ficción explícita y no evidencia de vida en Marte, una afirmación NASA ni una causa científica de las averías. La capa científica sigue explicando energía, aire, agua y protección; la amenaza ficticia aporta presión jugable.

La noche utiliza una sombra azul más intensa (opacidad objetivo 0,57), con transición suave y equipos todavía legibles. Resolver las tres misiones termina el ejercicio y habilita el cómic de amanecer sin esperar el antiguo temporizador solar. En la siguiente etapa se retiran los adversarios y vuelve la iluminación diurna.

## Validación

`tests/night-survival.test.ts` comprueba cantidad de misiones, propósito del siguiente destino, plazo exacto, daño y pausa, reducción inmediata de adversarios, condición de amanecer y visibilidad de sus objetos Phaser. Los recorridos de campaña mantienen pruebas con desplazamientos y sin inyección de recursos. Las pruebas de aprendizaje comprueban la explicación, fuentes, bloqueo de cierre durante cinco segundos y reanudación.

La revisión automatizada de objetos Phaser no equivale a una comprobación visual de una partida ni a una medición de FPS en el navegador.
