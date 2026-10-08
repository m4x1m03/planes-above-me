import type { ExpressionSpecification } from 'maplibre-gl';
import { scaleLinear } from 'd3-scale';
import { interpolateHcl } from 'd3-interpolate';

export const SELECTED_COLOR = '#fbd100';

export const ALTITUDE_STOPS = [
  [0,    '#ff3838'],
  [3000, '#b6ff38'],
  [6000, '#38ffee'],
  [9000, '#7738ff'],
] as const;

export function altitudeColorExpression(): ExpressionSpecification {
  return [
    'interpolate-hcl',
    ['linear'],
    ['coalesce', ['get', 'baro_altitude'], 0],
    ...ALTITUDE_STOPS.flatMap(([alt, color]) => [alt, color]),
  ] as ExpressionSpecification;
}

const altitudeScale = scaleLinear<string>()
  .domain(ALTITUDE_STOPS.map(([alt]) => alt))
  .range(ALTITUDE_STOPS.map(([, color]) => color))
  .interpolate(interpolateHcl)
  .clamp(true);

export function altitudeColor(altitudeM: number | null): string {
  return altitudeScale(altitudeM ?? 0);
}

export function planeColor(altitudeM: number | null, selected: boolean): string {
  return selected ? SELECTED_COLOR : altitudeColor(altitudeM);
}