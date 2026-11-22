/**
 * Map geometry, with no React in it.
 *
 * The projection, the camera and the path builders are pure functions over
 * numbers, and they are kept out of the component so they can be tested, and
 * reused, without dragging a renderer along.
 */
import { COUNTRIES, type Country } from "./world";

export interface LatLng {
  lat: number;
  lng: number;
}

/** The frame the map is projected into, in the 1920×1080 design space. */
export const MAP_FRAME = { width: 1920, height: 1080 };

/**
 * Spherical Mercator.
 *
 * The web map's projection: familiar, and the reason a route across the
 * Atlantic looks like a route across the Atlantic.
 */
export const project = (point: LatLng): { x: number; y: number } => {
  const { width, height } = MAP_FRAME;
  const x = ((point.lng + 180) / 360) * width;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, point.lat));
  const y =
    (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2 * height;
  return { x, y };
};

/** The camera: a zoom and a pan, applied as one transform to the map group. */
export interface Camera {
  /** How many times the map is magnified. */
  scale: number;
  /** Where the camera is centred, in projected pixels. */
  x: number;
  y: number;
}

/** The camera that frames the whole world. */
export const WORLD_CAMERA: Camera = { scale: 1, x: MAP_FRAME.width / 2, y: MAP_FRAME.height / 2 };

/** The camera that looks at one place, at one zoom. */
export const cameraAt = (point: LatLng, scale: number): Camera => {
  const p = project(point);
  return { scale, x: p.x, y: p.y };
};

/** The transform that puts the map group under the camera. */
export const cameraTransform = (camera: Camera): string => {
  const { width, height } = MAP_FRAME;
  return `translate(${width / 2} ${height / 2}) scale(${camera.scale}) translate(${-camera.x} ${-camera.y})`;
};

/**
 * The outline of a country as an SVG path.
 *
 * Mercator is a straight-line projection, so each edge between two points
 * is a straight line in the projected plane. That is why a Mercator map is
 * the right choice here and not a conic one: the boundaries stay honest.
 */
export const countryPath = (country: Country): string => {
  const parts: string[] = [];
  for (const ring of country.p) {
    if (ring.length < 3) continue;
    let d = "";
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const p = project({ lng, lat });
      d += `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    parts.push(`${d}Z`);
  }
  return parts.join("");
};

export interface RoutePoint {
  at: LatLng;
  label: string;
}
