# Arte pendiente: entrada a la noche

Pendientes: `sol2-01.png`, `sol2-02.png`, panorámicas 1672 × 941, sin cambios al prólogo.
La primera página muestra la puesta de Sol; la segunda anticipa tensión, sin afirmar una avería aún no activada.

Por ahora se utiliza una escena narrativa funcional de AURA con los sprites originales del generador y Control. Los recursos y decisiones se obtienen del simulador. Estas rutas pendientes no se solicitan por red.

Integración: `src/game/ui/CampaignStory.ts` define las páginas; el lector único de `Prologue.ts` admite una propiedad `image` en cada página. Al añadir un PNG definitivo, asignar ahí su ruta relativa y evitar incrustar en la ilustración afirmaciones variables sobre salud, averías o reservas. Los datos variables deben seguir en la capa narrativa de estado.
