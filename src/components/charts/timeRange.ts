const SINGLE_SAMPLE_WINDOW = 300;

// uPlot pads an x-scale whose min equals its max by years, so a chart holding
// one sample shows it on a five-minute window instead.
export function timeRange(min: number, max: number): [number, number] {
  return min === max ? [min - SINGLE_SAMPLE_WINDOW, max] : [min, max];
}
