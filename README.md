# SOL-3: Base Aurora

**A browser-based Mars outpost survival game for ages 7–12.** Players balance power, water, oxygen, food, repairs, and radiation shelter while making mission decisions grounded in NASA science resources.

**Suggested repository name:** `sol-3-base-aurora`  
**GitHub description:** `A browser-based Mars outpost survival game for ages 7–12, where players balance life support, power, food, radiation protection, and mission choices using NASA science resources.`

[Play the game](https://sailost.github.io/NASA-Junior-Astronaut-Simulator/) · [View the source repository](https://github.com/sailost/NASA-Junior-Astronaut-Simulator)

## English

### About

SOL-3: Base Aurora is a 2D exploration and resource-management game set at a fictional Mars outpost. Across three simulated sols, players complete missions, diagnose equipment problems, and decide how to use the colony’s limited resources. Each campaign selects one of eight operation scenarios, changing the starting conditions and the system at risk.

Choices have consequences. A full repair restores production but costs energy and a spare part; a temporary bridge saves the part while leaving the system less productive. Growing crops faster uses more water, recovering more water adds an electrical load, and sheltering during a solar alert uses power that could support other equipment. Mission outcomes reflect the crew’s decisions and the condition of the base.

AURA, the onboard scripted companion, explains mission concepts in plain language. Cinematic story scenes, interactive locations, and a science archive connect gameplay with real mission-planning constraints.

### NASA science and data limits

The game separates source material from simulation values:

- The radiation calculator teaches **absorbed dose = dose rate × duration** using an approximately 210 μGy-per-sol historical reference associated with Curiosity’s RAD instrument. It is an educational calculation, not a live reading or forecast.
- The bundled NASA OSDR RadLab table contains eight historical DosTel readings from the International Space Station, recorded on April 1, 2022, in μGy/h. They are measurements from low Earth orbit.
- The 0–100 radiation exposure meter, resource rates, equipment failures, and mission outcomes are game parameters. They are not NASA measurements.
- DONKI is linked as a space-weather learning resource. The current bundled dataset contains no DONKI event records.

Sources: [NASA Radiation Measurements on Mars](https://science.nasa.gov/resource/radiation-measurements-on-mars/), [NASA OSDR RadLab overview](https://visualization.osdr.nasa.gov/radlab/gui/overview/), [NASA Open Science Data Repository](https://osdr.nasa.gov/), [NASA CCMC DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [NASA life-support subsystems](https://www.nasa.gov/reference/jsc-life-support-subsystems/), [NASA ISS water-recovery milestone](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/), [NASA Mars Relay Network](https://science.nasa.gov/mars/mars-relay-network/), [NASA Plants in Space](https://science.nasa.gov/eclips/videos/plants-in-space/), and [NASA PONDS](https://technology.nasa.gov/patent/KSC-TOPS-81). The game also references the [Canadian Space Agency food-production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/).

### Controls

- **Move:** `W`, `A`, `S`, `D` or the arrow keys
- **Interact:** `E`
- **Talk to AURA:** `C`
- **Close AURA / skip a cinematic:** `Esc`
- **Touchscreen:** use the on-screen joystick and interaction control

### Run locally

Requires Node.js 22 (the version used by the deployment workflow).

```bash
npm ci
npm run dev
```

Open the local address printed by Vite, usually `http://127.0.0.1:5173`.

Create and preview a production build:

```bash
npm run build
npm run preview
```

GitHub Actions publishes the `main` branch to GitHub Pages after a push.

### Refreshing the NASA data

The committed `public/data/science.json` works without an API key and is a historical snapshot. To refresh RadLab readings only, run:

```bash
npm run data:radlab
```

To request DONKI records as well, place `NASA_API_KEY`, `NASA_START_DATE`, and `NASA_END_DATE` in a local `.env.local` file, then run:

```bash
npm run data:fetch
```

Do not commit `.env.local` or an API key. The repository's `.gitignore` excludes local environment files.

### AI assistance disclosure

OpenAI Codex assisted with research and source interpretation, data interpretation, coding and debugging, interface layout, and editing or translating some project text. The game does not run an AI or machine-learning model. NASA measurements in the dataset remain NASA-sourced records and were not AI-generated.

### Credits and usage

The repository does not currently include a root-level license file. Check attribution and redistribution rights for the game code and all media before reusing them. Cinematic videos, soundtrack, and sound effects are bundled under [`public/assets`](https://github.com/sailost/NASA-Junior-Astronaut-Simulator/tree/main/public/assets). The team identified the menu confirmation effect as Persona 3 Reload audio; confirm permission to redistribute it or replace it with audio licensed for this use.

## Español

### Acerca del juego

SOL-3: Base Aurora es un juego 2D de exploración y gestión de recursos en una base ficticia de Marte. Durante tres soles simulados, el jugador completa misiones, diagnostica fallas y decide cómo administrar las reservas de la colonia. Cada partida elige una de ocho operaciones, que cambia las condiciones iniciales y el sistema en riesgo.

Las decisiones tienen consecuencias. Una reparación completa recupera la producción, pero cuesta energía y un repuesto; un puente temporal ahorra la pieza y deja el sistema con menor rendimiento. Acelerar el cultivo consume más agua, recuperar más agua exige energía y refugiarse durante una alerta solar usa energía que podría alimentar otros equipos. El resultado depende de las elecciones y del estado de la base.

AURA, una compañera con diálogos preescritos, explica los conceptos con lenguaje sencillo. Las cinemáticas, los lugares interactivos y el archivo científico conectan la historia con desafíos reales de planificación de misiones.

### Ciencia y límites de los datos

La calculadora enseña **dosis absorbida = tasa de dosis × duración** con una referencia histórica aproximada de 210 μGy por sol asociada al instrumento RAD de Curiosity. La tabla de NASA OSDR RadLab incluye ocho registros históricos de DosTel medidos en la Estación Espacial Internacional el 1 de abril de 2022, en μGy/h. La escala de exposición 0–100, las reservas, las averías y los resultados son parámetros del juego; no son mediciones NASA. DONKI aparece como recurso educativo de clima espacial, y el archivo actual no contiene eventos DONKI.

### Controles

- **Moverse:** `W`, `A`, `S`, `D` o flechas
- **Interactuar:** `E`
- **Hablar con AURA:** `C`
- **Cerrar AURA / omitir una cinemática:** `Esc`
- **Pantalla táctil:** joystick y control de interacción en pantalla

### Ejecutar en local

Se requiere Node.js 22:

```bash
npm ci
npm run dev
```

Abre la dirección local que indique Vite, normalmente `http://127.0.0.1:5173`. Para compilar y previsualizar:

```bash
npm run build
npm run preview
```

GitHub Actions publica la rama `main` en GitHub Pages al recibir un push.

### Declaración de asistencia de IA

OpenAI Codex ayudó con investigación e interpretación de fuentes, interpretación de datos, programación y depuración, disposición de la interfaz y edición o traducción de algunos textos. El juego no ejecuta un modelo de IA o aprendizaje automático. Las mediciones NASA del conjunto de datos siguen siendo registros de NASA; no fueron generadas por IA.

### Créditos y uso

El repositorio todavía no incluye un archivo de licencia en la raíz. Antes de reutilizar o redistribuir el código y los medios, confirma sus créditos y permisos. Las cinemáticas, la música y los efectos están en [`public/assets`](https://github.com/sailost/NASA-Junior-Astronaut-Simulator/tree/main/public/assets). El equipo identificó el sonido de confirmación del menú como audio de Persona 3 Reload; confirma que se permite redistribuirlo o reemplázalo por audio con licencia adecuada.
