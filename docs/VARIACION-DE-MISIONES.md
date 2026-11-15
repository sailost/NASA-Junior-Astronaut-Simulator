# Operaciones variables y decisiones de campaña

Cada partida selecciona una de ocho operaciones con la semilla de la simulación. La selección es repetible dentro de esa partida, pero cambia el presupuesto de recursos, el escenario de trabajo y el circuito que puede fallar durante la noche.

| Operación | Presión principal | Incidencia nocturna | Referencia científica |
| --- | --- | --- | --- |
| Polvo sobre los paneles | Menor captación solar | Baterías | NASA · clima de Marte |
| Reserva de agua limitada | Menor reserva inicial | Reciclador | NASA · recuperación de agua en la ISS |
| Noche fría simulada | Más carga eléctrica nocturna | Baterías | NASA · clima de Marte |
| Alerta en el circuito de aire | Menor reserva de oxígeno | Válvula de oxígeno | NASA · sistemas de soporte vital |
| Invernadero con riego irregular | Producción solar ligeramente reducida | Riego e iluminación del cultivo | NASA eClips · plantas en el espacio |
| Ventana de comunicación con Tierra | Menos energía inicial | Antena de retransmisión | NASA · red de relés de Marte |
| Rutina de salud de la tripulación | Menos alimentos iniciales | Válvula de oxígeno | NASA OSDR · salud y biología espacial |
| Vigila el entorno solar | Carga nocturna adicional | Baterías; después, ejercicio preventivo | NASA CCMC · DONKI |

Las condiciones de reserva, averías, carga y producción son del simulador, no cifras atribuidas a NASA. La avería nocturna pasa por cinco sistemas, cada uno con su equipo y minijuego correspondiente; la inspección permite diagnosticar antes de gastar recursos.

## Decisiones y consecuencias

- **Cultivo:** ahorrar agua ralentiza el crecimiento; priorizar crecimiento consume más agua.
- **Energía nocturna:** guardar energía mejora la reserva nocturna y ralentiza el cultivo; optimizar paneles cuesta energía y repuestos, pero eleva la captación durante el día.
- **Mantenimiento:** la reparación completa cuesta 5 de energía y un repuesto y restaura toda la producción. El puente temporal cuesta 3 de energía y no consume un repuesto, pero mantiene el equipo al 55 %.
- **Agua:** aumentar la recuperación también aumenta la carga eléctrica; reducir la demanda conserva la reserva sin producir agua adicional.
- **Aviso solar:** el refugio cuesta 6 de energía y protege a la tripulación en la simulación. Mantener los equipos activos fuera del refugio suma 18 puntos a la escala abstracta 0–100 y limita el desenlace a parcial. Esa escala no es una dosis física.
- **Ensayo de cultivo:** aislar el circuito y acondicionar el sustrato tienen costes distintos; la misión incluye comprobar el efecto después de aplicar la elección.
- **Informe:** se puede transmitir el informe completo o registrar una conclusión parcial si faltan evidencias.

El tablero agrupa recolección, análisis y aplicación en una misma misión de investigación. Así el objetivo termina después de una decisión con consecuencia, no al pulsar una secuencia repetida de tareas simples.

## Referencias para el juego

Las operaciones enlazan con NASA y CSA como contexto educativo: [recuperación de agua en la ISS](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/), [sistemas de soporte vital](https://www.nasa.gov/reference/jsc-life-support-subsystems/), [plantas en el espacio](https://science.nasa.gov/eclips/videos/plants-in-space/), [red de retransmisión de Marte](https://science.nasa.gov/mars/mars-relay-network/), [OSDR](https://osdr.nasa.gov/) y [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/). Los enlaces explican la relación científica; no significan que los parámetros simulados sean mediciones NASA ni que OSDR determine el estado de la tripulación ficticia.

`public/data/science.json` conserva ocho observaciones históricas de DosTel1/2 obtenidas de la API pública de RadLab (ISS, 1 de abril de 2022, μGy/h) y explica que no son lecturas de Marte. El archivo mantiene `solarEvents` vacío: no se recibió un registro DONKI verificable para esta versión, por lo que no se inventa ni se presenta un evento como dato real. La calculadora RAD de Curiosity sigue separada de las lecturas de la ISS.
