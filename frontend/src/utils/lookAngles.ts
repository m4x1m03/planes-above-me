export type GeoPoint = { lat: number; lon: number; height: number }; // degrees, degrees, meters
export type LookAngles = { azimuthDeg: number; elevationDeg: number; slantRangeM: number };
export type ENU = { e: number; n: number; u: number };

const toRad = (deg: number) => deg * (Math.PI / 180);
const toDeg = (rad: number) => rad * (180 / Math.PI);

// WGS-84 constants
const a = 6378137;
const f = 1 / 298.257223563;
const e2 = f*(2-f);

function geodeticToECEF(geodetic: GeoPoint){
  const phi = toRad(geodetic.lat);
  const lambda = toRad(geodetic.lon);
  const h = geodetic.height;

  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const x = (N+h) * Math.cos(phi) * Math.cos(lambda);
  const y = (N+h) * Math.cos(phi) * Math.sin(lambda);
  const z = (N * (1 - e2) + h) * Math.sin(phi);

  return {x,y,z};
}

//split up diff and rotation
function ECEFToENU(dx:number, dy:number, dz:number, observer: GeoPoint){
  //local coords
  const phi = toRad(observer.lat);
  const lambda = toRad(observer.lon);

  const e = -Math.sin(lambda)*dx + Math.cos(lambda)*dy;
  const n = -Math.sin(phi)*Math.cos(lambda)*dx - Math.sin(phi)*Math.sin(lambda)*dy + Math.cos(phi)*dz;
  const u = Math.cos(phi)*Math.cos(lambda)*dx + Math.cos(phi)*Math.sin(lambda)*dy + Math.sin(phi)*dz;

  return{e,n,u};
}

export function computeENU(observer: GeoPoint, plane: GeoPoint): ENU {
  const o = geodeticToECEF(observer);
  const p = geodeticToECEF(plane);
  return ECEFToENU(p.x - o.x, p.y - o.y, p.z - o.z, observer);
}

export function computeLookAngles(observer: GeoPoint, plane:GeoPoint): LookAngles{
  const { e, n, u } = computeENU(observer, plane);

  const azimuth = Math.atan2(e, n);
  const elevation = Math.atan2(u, Math.hypot(e, n));
  const slantRange = Math.hypot(e, n, u);


  return{
    azimuthDeg: (toDeg(azimuth)+360)%360,
    elevationDeg: toDeg(elevation),
    slantRangeM: slantRange
  }
}