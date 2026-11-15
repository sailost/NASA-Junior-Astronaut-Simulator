# Recursos narrativos históricos: desenlaces

Los finales activos de producción reproducen `../../cinematics/ending_success.mp4`, `ending_partial.mp4` o `ending_failure.mp4`, según el resultado. Las páginas PNG descritas abajo ya no son necesarias para el flujo de la aplicación.

Dos páginas por variante, 1672 × 941:

- `victory-01.png`, `victory-02.png`: autonomía y ciencia demostradas.
- `partial-01.png`, `partial-02.png`: supervivencia con limitaciones científicas o de estabilidad.
- `defeat-01.png`, `defeat-02.png`: fallo de supervivencia, también antes del tercer nivel.

Las escenas provisionales utilizan AURA y sprites existentes. El resultado, la confirmación del informe, las averías, las decisiones y los recursos se leen del estado real. No añadir diálogos fijos que contradigan esos valores. `src/game/ui/CampaignStory.ts` contiene el manifiesto de archivos pendientes sin cargarlos.
