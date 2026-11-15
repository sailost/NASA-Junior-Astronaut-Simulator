# Cinemáticas y cálculo educativo de radiación

## Cinemáticas

Los siete MP4 de `public/assets/cinematics/` sustituyen el lector de páginas en el flujo de producción: intro, transición a noche, aviso solar, amanecer y tres desenlaces. `CampaignCinematic.ts` reproduce cada clip automáticamente a pantalla completa. Al terminar continúa la historia; pulsar **Esc** es la única forma de omitirlo. No hay controles ni botones superpuestos. Si el navegador bloquea audio automático, intenta reproducción silenciada; si no puede decodificar el clip, continúa la misión. Los videos se sirven bajo demanda y no se precargan en la caché offline inicial.

## Dosis de referencia en Marte

La calculadora de la consola del Refugio enseña la relación:

`dosis absorbida = tasa de dosis absorbida × duración`

Utiliza como ejemplo una tasa cercana a **210 μGy por sol** observada por el instrumento RAD del rover Curiosity durante sus primeras mediciones en la superficie marciana. El control permite practicar con 1–10 soles y actualiza el resultado en μGy. Es una extrapolación aritmética de una media histórica de Gale Crater, no una observación actual, pronóstico, medición de Base Aurora ni recomendación de protección.

El indicador de exposición 0–100 del juego sigue siendo abstracto. Los datos de NASA RadLab del archivo son de la ISS y se mantienen separados de las mediciones de Curiosity/RAD. No se convierte μGy a mSv automáticamente.

Fuente de contexto: [NASA Science · Radiation Measurements on Mars](https://science.nasa.gov/resource/radiation-measurements-on-mars/). La página explica que RAD mide radiación natural en la superficie, principalmente rayos cósmicos galácticos en el periodo representado, y que la atmósfera produce variaciones diurnas/nocturnas.
