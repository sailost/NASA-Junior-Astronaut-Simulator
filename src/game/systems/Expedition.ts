export const sampleOrder = ["plant", "water", "soil"] as const;
export type SampleId = typeof sampleOrder[number];
export const sampleNames: Record<SampleId, string> = {
  plant: "muestra vegetal", water: "agua reciclada", soil: "suelo marciano",
};
export class Expedition {
  collected: Record<SampleId, boolean> = { plant: false, water: false, soil: true };
  results: SampleId[] = [];
  loaded?: SampleId;
  processing?: SampleId;
  remaining = 0;
  batteriesReady = false;
  reserveMode = false;
  greenhouseTended = false;
  get nextSample(): SampleId | undefined {
    return sampleOrder.find((id) => !this.results.includes(id) && id !== this.processing);
  }
}
