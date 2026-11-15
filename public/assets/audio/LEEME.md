# Sonido de SOL-3

Los WAV se cargan localmente después del primer gesto del jugador y funcionan sin servicios externos. `ambiente_estacion.wav` se repite como ambiente; `dia.wav` y `noche.wav` marcan los cambios del ciclo. Los efectos de clic, paso, éxito, fallo y advertencia sustituyen los tonos sintetizados; reparaciones, recolección, puertas, transmisión, alarma y chispa usan sus efectos dedicados. Si un WAV falla al cargar, los tonos básicos conservan el respaldo de Web Audio.
