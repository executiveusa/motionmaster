import React from "react";
import { COUNTRIES, type Country } from "./world";
import {
  cameraAt,
  cameraTransform,
  countryPath,
  project,
  MAP_FRAME,
  type Camera,
  type LatLng,
  type RoutePoint,
} from "./geo";

export {
  cameraAt,
  cameraTransform,
  countryPath,
  project,
  MAP_FRAME,
  WORLD_CAMERA,
  type Camera,
  type LatLng,
} from "./geo";

/**
 * Vector maps, drawn in code.
 *
 * The editorial map look: a camera that flies over a base map, a route that
 * draws itself, a pin that drops, a label that calls it out, and a vignette
 * that says *here*.
 *
 * Everything shares one projection, so a pin, a route and a label all live in
 * the same coordinate space and the camera can move all of them at once. The
 * projection is written out here rather than pulled from a library: a
 * Mercator is twenty lines, and a skill that needs no install works in every
 * host we ship to.
 */

export interface VectorMapProps {
  /** Where the camera is. */
  camera: Camera;
  /** The countries to draw. */
  countries?: Country[];
  /** The fill for the land. */
  land?: string;
  /** The stroke for the coastlines. */
  coast?: string;
  /** A route to draw across the map. */
  route?: RoutePoint[];
  /** How much of the route has been drawn, 0 to 1. */
  routeProgress?: number;
  /** A pin to drop at the end of the route. */
  pin?: { at: LatLng; progress: number };
  /** A callout: a label, an arrow to a place, and how far it has arrived. */
  callout?: {
    at: LatLng;
    label: string;
    /** Where the label sits, in projected pixels before the camera transform. */
    labelAt: { x: number; y: number };
    /** How far the callout has arrived, 0 to 1. */
    progress: number;
  };
  /** A highlighted place: the vignette says *here*. */
  highlight?: { at: LatLng; radius: number; progress: number };
  /** The colour of the route, the pin and the callout. */
  accent?: string;
  style?: React.CSSProperties;
}

/**
 * The map.
 *
 * Draw order matters: land, then coast, then the highlight vignette over the
 * land, then the route, then the pin, then the callout on top of everything.
 */
export const VectorMap: React.FC<VectorMapProps> = ({
  camera,
  countries = COUNTRIES,
  land = "#E3DED2",
  coast = "#111113",
  route,
  routeProgress = 0,
  pin,
  callout,
  highlight,
  accent = "#FF4A1C",
  style,
}) => {
  const paths = countries.map((country) => (
    <path
      key={`${country.c}-${country.n}`}
      d={countryPath(country)}
      fill={land}
      stroke={coast}
      strokeWidth={1.15}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  ));

  // The route is a gentle arc between the points, so it reads as a flight
  // path rather than a straight line between two dots.
  let routePath = "";
  if (route && route.length > 1) {
    const pts = route.map((r) => project(r.at));
    const mid = pts[Math.floor((pts.length - 1) / 2)];
    const lift = Math.min(120, 40 + pts.length * 30);
    routePath = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const p = pts[i];
      const mx = (prev.x + p.x) / 2;
      const my = (prev.y + p.y) / 2 - lift * (i % 2 === 0 ? 1 : 0.6);
      void mid;
      routePath += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
  }

  const routeLength = routePath.length * 6.2; // a good enough dash length estimate

  return (
    <svg
      width={MAP_FRAME.width}
      height={MAP_FRAME.height}
      viewBox={`0 0 ${MAP_FRAME.width} ${MAP_FRAME.height}`}
      style={{ position: "absolute", inset: 0, ...style }}
    >
      <g transform={cameraTransform(camera)}>
        {/* land and coast */}
        <g>{paths}</g>

        {/* the highlight: a vignette that says here */}
        {highlight ? (
          <g opacity={0.75 * highlight.progress}>
            <defs>
              <radialGradient id="mm-highlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
                <stop offset="58%" stopColor={accent} stopOpacity="0.12" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle
              cx={project(highlight.at).x}
              cy={project(highlight.at).y}
              r={highlight.radius * (0.7 + 0.3 * highlight.progress)}
              fill="url(#mm-highlight)"
            />
            <circle
              cx={project(highlight.at).x}
              cy={project(highlight.at).y}
              r={highlight.radius * (0.7 + 0.3 * highlight.progress)}
              fill="none"
              stroke={accent}
              strokeWidth={3}
              strokeDasharray="14 10"
              opacity={0.8}
            />
          </g>
        ) : null}

        {/* the route, drawing itself */}
        {routePath ? (
          <path
            d={routePath}
            fill="none"
            stroke={accent}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={routeLength}
            strokeDashoffset={routeLength * (1 - routeProgress)}
          />
        ) : null}

        {/* the pin, dropping */}
        {pin ? (
          <g
            opacity={pin.progress}
            transform={`translate(${project(pin.at).x} ${project(pin.at).y})`}
          >
            <circle r={26 * pin.progress} fill={accent} opacity={0.22} />
            <circle r={9} fill={accent} />
            <circle r={15} fill="none" stroke={accent} strokeWidth={3} />
          </g>
        ) : null}
      </g>

      {/* the callout rides above the camera, so the label stays level */}
      {callout ? (
        <g opacity={callout.progress}>
          <Callout
            at={callout.at}
            label={callout.label}
            labelAt={callout.labelAt}
            camera={camera}
            accent={accent}
            progress={callout.progress}
          />
        </g>
      ) : null}
    </svg>
  );
};

interface CalloutProps {
  at: LatLng;
  label: string;
  labelAt: { x: number; y: number };
  camera: Camera;
  accent: string;
  progress: number;
}

/**
 * A label and an arrow pointing at a place.
 *
 * The label sits on the screen; the arrow reaches from the label to the point
 * on the map. The arrow is drawn in screen space, so the point is projected
 * and then pushed through the camera transform by hand.
 */
const Callout: React.FC<CalloutProps> = ({ at, label, labelAt, camera, accent, progress }) => {
  const target = project(at);
  const screen = {
    x: (target.x - camera.x) * camera.scale + MAP_FRAME.width / 2,
    y: (target.y - camera.y) * camera.scale + MAP_FRAME.height / 2,
  };

  // The arrow points at the target, but stops short of it so the head does
  // not cover the pin.
  const dx = screen.x - labelAt.x;
  const dy = screen.y - labelAt.y;
  const len = Math.hypot(dx, dy) || 1;
  const stop = 26;
  const endX = screen.x - (dx / len) * stop;
  const endY = screen.y - (dy / len) * stop;
  const head = 16;
  const angle = Math.atan2(dy, dx);

  const reveal = Math.min(1, progress);

  return (
    <g>
      {/* the arrow */}
      <line
        x1={labelAt.x}
        y1={labelAt.y}
        x2={endX}
        y2={endY}
        stroke={accent}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - reveal)}
      />
      <polygon
        points={`${endX},${endY} ${endX - head * Math.cos(angle - 0.42)},${
          endY - head * Math.sin(angle - 0.42)
        } ${endX - head * Math.cos(angle + 0.42)},${endY - head * Math.sin(angle + 0.42)}`}
        fill={accent}
        opacity={reveal}
      />

      {/* the label */}
      <g opacity={reveal} transform={`translate(${labelAt.x} ${labelAt.y})`}>
        <rect
          x={0}
          y={-38}
          width={label.length * 23 + 44}
          height={76}
          rx={8}
          fill="#111113"
        />
        <text
          x={22}
          y={12}
          fill="#F4F4F2"
          fontFamily="IBM Plex Sans, system-ui, sans-serif"
          fontSize={44}
          fontWeight={700}
          letterSpacing={-1}
        >
          {label}
        </text>
      </g>
    </g>
  );
};
