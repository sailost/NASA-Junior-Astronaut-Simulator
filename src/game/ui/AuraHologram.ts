export type AuraMood = "idle" | "talking" | "thinking" | "happy" | "alert" | "emergency";
export const auraMoodLabels: Record<AuraMood, string> = { idle: "En línea", talking: "Hablando", thinking: "Analizando", happy: "Buen trabajo", alert: "Atención", emergency: "Emergencia" };
/** Original vector portrait inspired by the supplied cyan hologram reference. No agency insignia. */
export const auraHologram = (mood: AuraMood = "idle") => `<svg class="aura-hologram aura-portrait" data-mood="${mood}" viewBox="0 0 120 150" aria-hidden="true">
<ellipse class="aura-projector" cx="60" cy="140" rx="47" ry="6" fill="#67d9ee" fill-opacity=".08" stroke="currentColor" stroke-width="1.3"/><ellipse cx="60" cy="140" rx="34" ry="3" fill="none" stroke="currentColor" stroke-opacity=".45"/>
<g class="aura-bust"><path d="M23 81C8 73 18 36 24 23 35 0 68 3 79 12c27-4 34 26 25 48 5 16-4 25-16 24z" fill="#114568" stroke="currentColor" stroke-width="1.6"/>
<path d="M24 135 19 115q2-16 28-21l2-15h22l2 15q26 5 28 21l-5 20-36 7z" fill="#124b69" fill-opacity=".8" stroke="currentColor" stroke-width="1.6"/>
<path d="m47 94 13 8 13-8M35 100l6 34m44-34-6 34M25 111h70M24 121h72M35 103l50 29m0-29-50 29" fill="none" stroke="#70cfe5" stroke-opacity=".35" stroke-width=".8"/>
<path d="m49 84 1 12 10 6 10-6 1-12" fill="#3995b6" stroke="currentColor" stroke-width="1"/><path d="m47 92 13 9 13-9v9l-13 10-13-10z" fill="#103b55" stroke="#8adeea"/>
<path d="m54 122 6-12 7 12h-5l-2-5-2 5z" fill="#b4f5f4"/>
<path d="M31 48q-10-6-9 7 1 12 12 12m55-19q10-6 9 7-1 12-12 12" fill="#3191b5" stroke="#73d1e7"/>
<path d="M31 37q0-21 29-22 31 3 30 26l-3 25q-4 23-27 26-23-4-27-27z" fill="#3f9fc1" stroke="#a2e8ee" stroke-width="1.2"/>
<path d="M61 17Q48 39 29 45l3 21q-15-9-10-33Q32 8 60 10q28-3 38 25l-9 29-4-23Q66 31 61 17z" fill="#16537a" stroke="#6fd4ee" stroke-width="1.5"/>
<path d="M62 13Q47 32 25 37M66 14q9 18 24 23M31 24Q20 47 29 66M83 21q17 30 7 51" fill="none" stroke="#a0ebfb" stroke-opacity=".7" stroke-width="1.4"/>
<path class="aura-brows" d="m38 49 12-3m20 0 12 3" fill="none" stroke="#165273" stroke-width="2.5" stroke-linecap="round"/>
<g class="aura-eyes"><g class="aura-eye"><ellipse cx="45" cy="57" rx="8" ry="7" fill="#d3f3ed"/><ellipse cx="47" cy="57" rx="4.5" ry="6" fill="#197eae"/><ellipse cx="48" cy="57" rx="2" ry="4" fill="#102d50"/><circle cx="49" cy="54" r="1.7" fill="#edffff"/></g><g class="aura-eye"><ellipse cx="76" cy="57" rx="8" ry="7" fill="#d3f3ed"/><ellipse cx="74" cy="57" rx="4.5" ry="6" fill="#197eae"/><ellipse cx="73" cy="57" rx="2" ry="4" fill="#102d50"/><circle cx="74" cy="54" r="1.7" fill="#edffff"/></g></g>
<path class="aura-happy-eyes" d="M38 57q7-10 14 0m17 0q7-10 14 0" fill="none" stroke="#d5ffff" stroke-width="2.5" stroke-linecap="round"/>
<path d="m61 58-3 11 5 1" fill="none" stroke="#247a9d" stroke-width="1.2"/><path class="aura-mouth" d="M52 77q8 6 17-1" fill="none" stroke="#c3f7f2" stroke-width="1.7" stroke-linecap="round"/><ellipse class="aura-talk-mouth" cx="61" cy="78" rx="5" ry="3" fill="#154d69" stroke="#bdf6f2"/>
<path d="M36 67h7m35 0h7" stroke="#8cdce6" stroke-opacity=".5" stroke-width="2"/><path class="aura-thinking-hand" d="m84 128-9-17-10-20 2-13q5-4 5 2l1 10 4-6q4 0 3 6l-1 13 16 20" fill="#3a9cbe" stroke="#a1ebf1" stroke-width="1.3"/>
<path class="aura-scanline" d="M22 107h77" stroke="#befbfa" stroke-opacity=".5" stroke-width="1"/>
</g><g class="aura-waveform" fill="currentColor"><rect x="43" y="143" width="3" height="4"/><rect x="51" y="140" width="3" height="7"/><rect x="59" y="137" width="3" height="10"/><rect x="67" y="141" width="3" height="6"/><rect x="75" y="143" width="3" height="4"/></g><g class="aura-thoughts" fill="currentColor"><circle cx="98" cy="42" r="2"/><circle cx="105" cy="35" r="2"/><circle cx="110" cy="25" r="2"/></g><g class="aura-warning"><path d="m100 80 12 22H88z" fill="#173b50" stroke="currentColor" stroke-width="1.5"/><path d="M100 86v7m0 4v1" stroke="currentColor" stroke-width="2"/></g></svg>`;
