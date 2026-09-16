import type { Plane } from "../types/planes";

interface Bbox{
  lamin : number;
  lamax : number;
  lomin : number;
  lomax : number;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function fetchPlanes(bbox: Bbox): Promise<Plane[]> {
    const url = `${BACKEND_URL}/planes?lamin=${bbox.lamin}&lamax=${bbox.lamax}&lomin=${bbox.lomin}&lomax=${bbox.lomax}`;

    const response = await fetch(url);
    if(!response.ok){
      return [];
    }

    return await response.json() as Plane[]
}