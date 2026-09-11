export interface OpenSkySnapshotPayload {
    time: number;
    states: unknown[][];
}

export interface CachedSnapshot {
    receivedAt: number;
    time: number;
    states: unknown[][];
    recordCount: number;
}

let latestSnapshot: CachedSnapshot | null = null;

export const setSnapshot = (payload: OpenSkySnapshotPayload): CachedSnapshot => {
    latestSnapshot = {
        receivedAt: Date.now(),
        time: payload.time,
        states: payload.states ?? [],
        recordCount: payload.states?.length ?? 0,
    };

    return latestSnapshot;
};

export const getSnapshot = (): CachedSnapshot | null => latestSnapshot;
