import type { Plane } from "../types/planes.js";

export interface PlaneProvider {
  name: string;
  getPlanesNear(lat: number, lon: number, radiusNm: number): Promise<Plane[]>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status: number | null = null, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProviderError';
  }
}