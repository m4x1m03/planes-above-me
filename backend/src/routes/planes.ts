import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getSnapshot } from '../cache.js';
import type { Plane } from '../types/planes.js';

interface PlanesQuery {
    lamin: string;
    lomin: string;
    lamax: string;
    lomax: string;
}

export const planesRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.get<{ Querystring: PlanesQuery }>('/planes', async (request, reply) => {
        const { lamin, lomin, lamax, lomax } = request.query;

        const lat_min = parseFloat(lamin);
        const lat_max = parseFloat(lamax);
        const lon_min = parseFloat(lomin);
        const lon_max = parseFloat(lomax);

        const snapshot = getSnapshot();

        if (!snapshot) {
            return reply.code(200).send([]);
        }

        const inBox = snapshot.planes.filter(
            (plane) =>
                plane.lat >= lat_min && plane.lat <= lat_max &&
                plane.lon >= lon_min && plane.lon <= lon_max,
        );

        return reply.code(200).send(inBox);
    });
};