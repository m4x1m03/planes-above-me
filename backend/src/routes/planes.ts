import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Plane } from '../types/planes.js';
import type { Airline } from '../airlines/types.js';
import { resolveAirline } from '../airlines/resolve.js';

type PlaneResponse = Plane & { airline: Airline | null };

interface PlanesQuery {
    lamin: number;
    lomin: number;
    lamax: number;
    lomax: number;
}

const querySchema = {
  type: 'object',
  required: ['lamin', 'lomin', 'lamax', 'lomax'],
  properties: {
    lamin: { type: 'number', minimum: -90, maximum: 90 },
    lamax: { type: 'number', minimum: -90, maximum: 90 },
    lomin: { type: 'number', minimum: -180, maximum: 180 },
    lomax: { type: 'number', minimum: -180, maximum: 180 },
  },
} as const;

export const planesRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.get<{ Querystring: PlanesQuery }>('/planes', { schema: { querystring: querySchema } }, async (request, reply) => {
        const { lamin, lomin, lamax, lomax } = request.query;
        if(lamin > lamax || lomin > lomax) return reply.code(400).send({ error: 'lamin must be ≤ lamax and lomin ≤ lomax' });

        const centerLat = (lamin + lamax) / 2;
        const centerLon = (lomin + lomax) / 2;
        let planes: Plane[];
        try {
            planes = await app.planeCache.getPlanesAround(centerLat, centerLon);
        } catch (err) {
            request.log.warn({ err }, 'live data unavailable');
            return reply.code(200).send([]);
        }

        const inBox = planes.filter(
            (plane) =>
                plane.lat >= lamin && plane.lat <= lamax &&
                plane.lon >= lomin && plane.lon <= lomax,
        );

        const withAirlines: PlaneResponse[] = inBox.map((plane) => ({
            ...plane,
            airline: resolveAirline(plane.callsign, app.airlines),
        }));

        return reply.code(200).send(withAirlines);
    });
};