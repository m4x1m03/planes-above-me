import type { Plane } from './types/planes.js';

export interface OpenSkySnapshotPayload {
    time: number;
    states: unknown[][];
}

export interface CachedSnapshot {
    receivedAt: number;
    time: number;
    planes: Plane[];          // was: states: unknown[][]
    recordCount: number;
}

let latestSnapshot: CachedSnapshot | null = null;

// The mapping that used to live in planes.ts, now run once per snapshot
const toPlane = (state: unknown[], time: number): Plane | null => {
    const lon = state[5];
    const lat = state[6];
    // Skip planes with no position instead of letting null slip into the bbox filter
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;

    return {
        icao24: state[0] as string,
        callsign: typeof state[1] === 'string' ? state[1].trim() || null : null,
        lon,
        lat,
        altitude: state[7] as number | null,
        on_ground: state[8] as boolean,
        velocity: state[9] as number | null,
        heading: state[10] as number | null,
        vertical_rate: state[11] as number | null,
        timestamp: time,
    };
};

export const setSnapshot = (payload: OpenSkySnapshotPayload): CachedSnapshot => {
    const planes = (payload.states ?? [])
        .map((state) => toPlane(state, payload.time))
        .filter((plane): plane is Plane => plane !== null);

    latestSnapshot = {
        receivedAt: Date.now(),
        time: payload.time,
        planes,
        recordCount: planes.length,
    };

    return latestSnapshot;
};

export const getSnapshot = (): CachedSnapshot | null => latestSnapshot;