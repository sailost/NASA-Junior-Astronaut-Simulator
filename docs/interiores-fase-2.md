# Interiores: fase 2

Rediseño visual de las seis salas y sus pasillos con los 20 PNG originales de `public/assets/world/interiors/`. Se conservan sus proporciones y transparencia. Ningún PNG original fue modificado.

## Recursos por sala

| Sala | Suelo | Equipos sobre las interacciones existentes |
| --- | --- | --- |
| Centro de control | `floor-control.png` | `console-control.png`, `machine-communications.png` |
| Soporte vital | `floor-life-support.png` | `machine-oxygen.png`; se conserva el equipo de agua original |
| Invernadero | `floor-greenhouse.png` | `hydroponics-bed.png`, en dos bandejas de la misma instalación existente |
| Laboratorio | `floor-laboratory.png` | `machine-lab-scanner.png` |
| Ingeniería | `floor-engineering.png` | `machine-generator.png`; se conserva el regulador original |
| Refugio | `floor-shelter.png` | `shelter-shield-panel.png` |

Todas las salas usan `wall-horizontal.png`, `wall-vertical.png`, `airlock-door.png` y `floor-vent.png`. Control, Ingeniería y Refugio incorporan `utility-crate.png` en las zonas periféricas de servicio. Ingeniería y Refugio utilizan `warning-stripe.png`. Los pasillos usan `floor-corridor.png` sobre la red transitable original.

## Implementación y archivos

- `src/game/world/InteriorAssets.ts`: catálogo, precarga con `BASE_URL`, asociación de suelos y marco de puerta derivado en memoria del PNG original.
- `src/game/world/InteriorRenderer.ts`: suelos anclados al mundo, paredes modulares, equipamiento, sombras de contacto, detalles periféricos y superposición del astronauta con los equipos.
- `src/game/world/StationRenderer.ts`: selecciona el nuevo renderizado cuando están disponibles los 20 recursos. El renderizado anterior queda como alternativa ante un fallo de carga; no se dibuja debajo del nuevo.
- `src/game/world/StationEquipment.ts`: dibujo original de las máquinas extraído sin alterar su lógica; reutilizado para los dos equipos sin sustituto PNG.
- `src/game/world/materials.ts`: evita generar los antiguos suelos cuando existen los nuevos recursos.
- `src/game/world/WorldEffects.ts`: hojas móviles y marco del acceso original, indicadores locales y posición del holograma adaptados al nuevo arte. Conserva las condiciones de proximidad y el estado de la simulación.
- `src/game/scenes/BaseScene.ts`: conecta precarga, renderizado y actualización visual; adapta la profundidad de las etiquetas e indicadores existentes.
- `tests/interior-renderer.test.ts`: seis pruebas específicas de carga, proporciones, huecos de puerta, sustitución del arte, capas, estado energético y conservación de rutas y simulación.
- `tests/support/InteriorArt.ts`, `tests/support/ArtScene.ts`: carga de PNG reales y soporte del adaptador Canvas para las nuevas texturas.
- `scripts/render-gameplay-preview.ts`: genera vistas del conjunto y de las seis salas con las rutinas de dibujo de producción.
- `docs/interiores-fase-2.md`: este registro de implementación y validación.

Se rasterizan una sola vez tres capas estáticas. Los ocho sprites de equipos cambian de profundidad y tinte únicamente cuando cambia el estado correspondiente. No se añaden filtros de desenfoque ni generación de geometría por fotograma. Las decoraciones permanecen fijas en coordenadas del mundo.

## Validación

- `npm test`: 96 pruebas aprobadas, incluidas las seis nuevas y las de movimiento, navegación, interacción, siete minijuegos, AURA, tutorial, recursos, eventos, victoria, derrota y menú.
- `npm run build`: correcto. Vite conserva el aviso de tamaño del paquete principal; no es un error de compilación.
- Los 20 PNG responden HTTP 200 en el servidor local. Las rutas relativas funcionan con la base de GitHub Pages.
- Comparación SHA-256: sin cambios en los 35 archivos protegidos al comienzo de esta fase, incluidos geometría, colisiones, movimiento, simulación, misiones, minijuegos, interfaz, AURA, tutorial y datos científicos.
- `npm run preview:art`: genera `test-results/interior-control.png`, `interior-life.png`, `interior-green.png`, `interior-lab.png`, `interior-engine.png`, `interior-shelter.png` y vistas generales. Se revisaron las seis salas, los accesos y la integración de los recursos. Se corrigió una superposición de una caja con la consola de Control y se recolocaron holograma e indicadores.

Las vistas son previsualizaciones Canvas fuera del navegador, no capturas de Phaser. El host de acceso al navegador no está disponible y la captura nativa de Opera agotó su tiempo de espera. Por ello, quedan pendientes la revisión manual de una partida completa y la medición de FPS en el navegador; no se afirma haberlas realizado.
