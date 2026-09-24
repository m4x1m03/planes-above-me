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

        if(!snapshot){
          return reply.code(200).send([]);
        }

        const planes: Plane[] = snapshot.states.map((state) => ({
          icao24 : state[0] as string,
          lon : state[5] as number,
          lat : state[6] as number,
          altitude: state[7] as number,
          on_ground: state[8] as boolean,
          velocity : state[9] as number,
          heading : state[10] as number,
          vertical_rate : state[11] as number,
          timestamp : snapshot.time
        }));

        const inBox : Plane[] = planes.filter((plane) => {
          return (plane.lat <= lat_max && plane.lat >= lat_min && plane.lon <= lon_max && plane.lon >= lon_min);
        });

        return reply.code(200).send(inBox);
    });
};