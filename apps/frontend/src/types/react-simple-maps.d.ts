declare module "react-simple-maps" {
  import * as React from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
      parallels?: [number, number];
    };
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
  }
  export function ComposableMap(props: ComposableMapProps): React.ReactElement;

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (data: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (data: { x: number; y: number; zoom: number; dragging: boolean }) => void;
    onMoveEnd?: (data: { coordinates: [number, number]; zoom: number }) => void;
    filterZoomEvent?: (event: WheelEvent | MouseEvent | TouchEvent) => boolean;
    children?: React.ReactNode;
  }
  export function ZoomableGroup(props: ZoomableGroupProps): React.ReactElement;

  export interface GeographiesProps {
    geography: string | object;
    parseGeographies?: (geographies: Geography[]) => Geography[];
    children: (props: { geographies: Geography[] }) => React.ReactNode;
  }
  export function Geographies(props: GeographiesProps): React.ReactElement;

  export interface Geography {
    rsmKey: string;
    type: string;
    properties: Record<string, unknown>;
    geometry: object;
  }

  export interface GeographyProps {
    geography: Geography;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    tabIndex?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
  }
  export function Geography(props: GeographyProps): React.ReactElement;

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
  }
  export function Marker(props: MarkerProps): React.ReactElement;

  export interface GraticuleProps {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    step?: [number, number];
    clipPath?: string;
  }
  export function Graticule(props: GraticuleProps): React.ReactElement;

  export interface SphereProps {
    id: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }
  export function Sphere(props: SphereProps): React.ReactElement;

  export interface LineProps {
    from?: [number, number];
    to?: [number, number];
    coordinates?: [number, number][];
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    className?: string;
    style?: React.CSSProperties;
  }
  export function Line(props: LineProps): React.ReactElement;
}
