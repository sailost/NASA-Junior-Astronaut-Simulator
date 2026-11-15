# Cinemáticas de SOL-3

| Archivo | Momento de reproducción |
| --- | --- |
| `intro.mp4` | Después de iniciar desde el menú |
| `sol1_night.mp4` | Transición de la preparación diurna a la noche |
| `solar_alert.mp4` | Primer aviso del protocolo solar preventivo |
| `sol3_start.mp4` | Transición de la noche al amanecer |
| `ending_success.mp4` | Desenlace de victoria |
| `ending_partial.mp4` | Desenlace parcial |
| `ending_failure.mp4` | Desenlace de derrota |

Los clips se sirven desde Vite y GitHub Pages. El service worker no los descarga todos al instalarse; cada uno se solicita al reproducirlo. La campaña puede continuar si un clip falla o se omite.

Las versiones dobladas se copiaron desde `cinematics dub`: `intro.mp4`, `sol1_night.mp4`, `sol3_start.mp4`, `ending_partial.mp4` y `ending_failure_s.mp4`. El final de victoria `ending_access.mp4` se publica como `ending_success.mp4`, y `ending_failure_s.mp4` como `ending_failure.mp4`, para conservar los nombres que usa la campaña. `solar_alert.mp4` sigue siendo la versión anterior porque no hay un doblaje de ese clip en la carpeta fuente. En pantallas táctiles se puede tocar la cinemática para omitirla; en PC se mantiene Escape.
