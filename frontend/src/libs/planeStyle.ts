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

export const PLANE_PATH = "M 60.1666,38L 60.0776,38C 60.0776,38 61.254,39.9002 47.2749,40.6107L 43.6589,45.9167L 44.2443,45.9167C 45.1187,45.9167 45.8276,46.6256 45.8276,47.5C 45.8276,48.3745 45.1187,49.0834 44.2443,49.0834L 41.4144,49.0834L 39.673,51.4584L 39.8901,51.4584C 40.7645,51.4584 41.4734,52.1672 41.4734,53.0417C 41.4734,53.9161 40.7645,54.625 39.8901,54.625L 37.2359,54.625C 35.1849,57.1943 33.2902,59.2888 31.9734,60.1667C 31.9734,60.1667 29.2026,60.1667 29.2026,58.5833C 29.2026,58.5833 35.6397,46.782 37.9164,40.8418C 23.6609,40.9597 23.6609,39.9792 23.6609,39.9792C 23.6609,39.9792 20.4943,45.9167 17.3276,45.9167L 19.7026,38L 19.7917,38L 17.4167,30.0833C 20.5833,30.0833 23.75,36.0208 23.75,36.0208C 23.75,36.0208 23.75,35.0403 38.0055,35.1582C 35.7288,29.218 29.2917,17.4167 29.2917,17.4167C 29.2917,15.8333 32.0625,15.8334 32.0625,15.8334C 33.3792,16.7112 35.2739,18.8058 37.325,21.375L 39.9792,21.375C 40.8536,21.375 41.5625,22.0839 41.5625,22.9583C 41.5625,23.8328 40.8536,24.5417 39.9792,24.5417L 39.7621,24.5417L 41.5034,26.9167L 44.3333,26.9167C 45.2078,26.9167 45.9167,27.6255 45.9167,28.5C 45.9167,29.3744 45.2078,30.0833 44.3333,30.0833L 43.7479,30.0833L 47.3639,35.3893C 61.343,36.0998 60.1666,38 60.1666,38 Z"

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