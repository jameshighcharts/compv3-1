"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Continent = "World" | "Europe" | "Asia" | "Oceania" | "USA";

const CONTINENT_VIEWS: Record<
  Continent,
  { center: [number, number]; zoom: number }
> = {
  World:   { center: [0, 20],    zoom: 1.6 },
  Europe:  { center: [15, 52],   zoom: 4   },
  Asia:    { center: [90, 35],   zoom: 2.5 },
  Oceania: { center: [140, -25], zoom: 3.5 },
  USA:     { center: [-98, 38],  zoom: 3.5 },
};

export type WorldMapPin = {
  label: string;
  country: string;
  state?: string;
  scope: "country" | "us-state";
  users: number;
  revenue?: number;
};

const DEFAULT_USER_PINS: { name: string; coordinates: [number, number]; users: number; revenue?: number }[] = [
  { name: "New York",      coordinates: [-74.006,    40.7128  ], users: 320 },
  { name: "Los Angeles",   coordinates: [-118.2437,  34.0522  ], users: 210 },
  { name: "Chicago",       coordinates: [-87.6298,   41.8781  ], users: 180 },
  { name: "San Francisco", coordinates: [-122.4194,  37.7749  ], users: 160 },
  { name: "Toronto",       coordinates: [-79.3832,   43.6532  ], users: 195 },
  { name: "London",        coordinates: [-0.1276,    51.5074  ], users: 290 },
  { name: "Paris",         coordinates: [2.3522,     48.8566  ], users: 150 },
  { name: "Berlin",        coordinates: [13.405,     52.52    ], users: 120 },
  { name: "Amsterdam",     coordinates: [4.9041,     52.3676  ], users: 130 },
  { name: "Stockholm",     coordinates: [18.0686,    59.3293  ], users: 90  },
  { name: "Zurich",        coordinates: [8.5417,     47.3769  ], users: 110 },
  { name: "Tokyo",         coordinates: [139.6917,   35.6895  ], users: 410 },
  { name: "Shanghai",      coordinates: [121.4737,   31.2304  ], users: 380 },
  { name: "Singapore",     coordinates: [103.8198,   1.3521   ], users: 200 },
  { name: "Seoul",         coordinates: [126.978,    37.5665  ], users: 220 },
  { name: "Mumbai",        coordinates: [72.8777,    19.076   ], users: 175 },
  { name: "Bangkok",       coordinates: [100.5018,   13.7563  ], users: 160 },
  { name: "Dubai",         coordinates: [55.2708,    25.2048  ], users: 145 },
  { name: "Sydney",        coordinates: [151.2093,  -33.8688  ], users: 160 },
  { name: "Melbourne",     coordinates: [144.9631,  -37.8136  ], users: 110 },
  { name: "São Paulo",     coordinates: [-46.6333,  -23.5505  ], users: 140 },
  { name: "Mexico City",   coordinates: [-99.1332,   19.4326  ], users: 120 },
  { name: "Cairo",         coordinates: [31.2357,    30.0444  ], users: 80  },
  { name: "Lagos",         coordinates: [3.3792,     6.5244   ], users: 65  },
  { name: "Nairobi",       coordinates: [36.8219,   -1.2921   ], users: 55  },
];

const CONTINENTS: Continent[] = ["World", "Europe", "Asia", "Oceania", "USA"];

const COUNTRY_COORDINATES = new Map<string, [number, number]>([
  ["united states", [-98, 38]],
  ["canada", [-106.3468, 56.1304]],
  ["mexico", [-102.5528, 23.6345]],
  ["brazil", [-51.9253, -14.235]],
  ["argentina", [-63.6167, -38.4161]],
  ["united kingdom", [-3.435973, 55.378051]],
  ["france", [2.2137, 46.2276]],
  ["germany", [10.4515, 51.1657]],
  ["netherlands", [5.2913, 52.1326]],
  ["sweden", [18.6435, 60.1282]],
  ["norway", [8.4689, 60.472]],
  ["switzerland", [8.2275, 46.8182]],
  ["italy", [12.5674, 41.8719]],
  ["spain", [-3.7492, 40.4637]],
  ["portugal", [-8.2245, 39.3999]],
  ["poland", [19.1451, 51.9194]],
  ["czech republic", [15.473, 49.8175]],
  ["austria", [14.5501, 47.5162]],
  ["belgium", [4.4699, 50.5039]],
  ["greece", [21.8243, 39.0742]],
  ["turkey", [35.2433, 38.9637]],
  ["india", [78.9629, 20.5937]],
  ["china", [104.1954, 35.8617]],
  ["japan", [138.2529, 36.2048]],
  ["south korea", [127.7669, 35.9078]],
  ["singapore", [103.8198, 1.3521]],
  ["thailand", [100.9925, 15.87]],
  ["indonesia", [113.9213, -0.7893]],
  ["philippines", [121.774, 12.8797]],
  ["malaysia", [101.9758, 4.2105]],
  ["hong kong", [114.1694, 22.3193]],
  ["taiwan", [120.9605, 23.6978]],
  ["australia", [133.7751, -25.2744]],
  ["new zealand", [174.886, -40.9006]],
  ["egypt", [30.8025, 26.8206]],
  ["nigeria", [8.6753, 9.082]],
  ["kenya", [37.9062, -0.0236]],
  ["south africa", [22.9375, -30.5595]],
  ["chile", [-71.543, -35.6751]],
  ["colombia", [-74.2973, 4.5709]],
  ["argentina", [-63.6167, -38.4161]],
  ["united arab emirates", [53.8478, 23.4241]],
]);

const US_STATE_COORDINATES = new Map<string, [number, number]>([
  ["alabama", [-86.7911, 32.8067]],
  ["alaska", [-152.4044, 61.3707]],
  ["arizona", [-111.4312, 33.7298]],
  ["arkansas", [-92.3731, 34.9697]],
  ["california", [-119.6816, 36.1162]],
  ["colorado", [-105.3111, 39.0598]],
  ["connecticut", [-72.7554, 41.5978]],
  ["delaware", [-75.5071, 39.3185]],
  ["district of columbia", [-77.0369, 38.9072]],
  ["florida", [-81.6868, 27.7663]],
  ["georgia", [-83.6431, 33.0406]],
  ["hawaii", [-157.4983, 21.0943]],
  ["idaho", [-114.4788, 44.2405]],
  ["illinois", [-88.9861, 40.3495]],
  ["indiana", [-86.2583, 39.8494]],
  ["iowa", [-93.2105, 42.0115]],
  ["kansas", [-96.7265, 38.5266]],
  ["kentucky", [-84.6701, 37.6681]],
  ["louisiana", [-91.8678, 31.1695]],
  ["maine", [-69.3819, 44.6939]],
  ["maryland", [-76.8021, 39.0639]],
  ["massachusetts", [-71.5301, 42.2302]],
  ["michigan", [-84.5361, 43.3266]],
  ["minnesota", [-93.9002, 45.6945]],
  ["mississippi", [-89.6787, 32.7416]],
  ["missouri", [-92.2884, 38.4561]],
  ["montana", [-110.4544, 46.9219]],
  ["nebraska", [-98.2681, 41.1254]],
  ["nevada", [-117.0554, 38.3135]],
  ["new hampshire", [-71.5639, 43.4525]],
  ["new jersey", [-74.521, 40.2989]],
  ["new mexico", [-106.2485, 34.8405]],
  ["new york", [-74.9481, 42.1657]],
  ["north carolina", [-79.8064, 35.6301]],
  ["north dakota", [-99.784, 47.5289]],
  ["ohio", [-82.7649, 40.3888]],
  ["oklahoma", [-96.9289, 35.5653]],
  ["oregon", [-122.0709, 44.572]],
  ["pennsylvania", [-77.2098, 40.5908]],
  ["rhode island", [-71.5118, 41.6809]],
  ["south carolina", [-80.945, 33.8569]],
  ["south dakota", [-99.4388, 44.2998]],
  ["tennessee", [-86.6923, 35.7478]],
  ["texas", [-97.5635, 31.0545]],
  ["utah", [-111.8624, 40.150]],
  ["vermont", [-72.7107, 44.0459]],
  ["virginia", [-78.1699, 37.7693]],
  ["washington", [-121.4905, 47.4009]],
  ["west virginia", [-80.9545, 38.4912]],
  ["wisconsin", [-89.6165, 44.2685]],
  ["wyoming", [-107.3025, 42.756]],
]);

const normalizeLabel = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const resolveCoordinates = (
  pin: WorldMapPin,
): [number, number] | null => {
  if (pin.scope === "us-state" && pin.state) {
    const stateCoordinates = US_STATE_COORDINATES.get(normalizeLabel(pin.state));

    if (stateCoordinates) {
      return stateCoordinates;
    }
  }

  return COUNTRY_COORDINATES.get(normalizeLabel(pin.country)) ?? null;
};

const buildPinTooltip = ({
  name,
  users,
  revenue,
}: {
  name: string;
  users: number;
  revenue?: number;
}): string =>
  [
    name,
    `Orders: ${users.toLocaleString("en-US")}`,
    revenue === undefined ? null : `Revenue: ${CURRENCY_FORMATTER.format(revenue)}`,
  ]
    .filter(Boolean)
    .join("\n");

export function WorldMap({
  pins,
}: {
  pins?: WorldMapPin[];
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [active, setActive]   = React.useState<Continent>("World");
  const [zoom, setZoom]       = React.useState(1.6);
  const [center, setCenter]   = React.useState<[number, number]>([0, 20]);
  const [hoveredPin, setHoveredPin] = React.useState<{
    name: string;
    users: number;
    revenue?: number;
    x: number;
    y: number;
  } | null>(null);

  const selectContinent = (c: Continent) => {
    setActive(c);
    setCenter(CONTINENT_VIEWS[c].center);
    setZoom(CONTINENT_VIEWS[c].zoom);
  };

  const updateHoveredPin = (
    event: React.MouseEvent<SVGGElement>,
    pin: {
      name: string;
      users: number;
      revenue?: number;
    },
  ) => {
    const bounds = containerRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    setHoveredPin({
      ...pin,
      x: event.clientX - bounds.left + 12,
      y: event.clientY - bounds.top - 12,
    });
  };

  React.useEffect(() => {
    setHoveredPin(null);
  }, [active, pins]);

  // ── Theme-aware palette ─────────────────────────────────────────────────────
  const colors = dark
    ? {
        wrap:         "#0a0c13",
        wrapBorder:   "#1e2230",
        headerBorder: "#1e2230",
        label:        "#ffffff",
        sublabel:     "#5a6078",
        btnActive:    "rgba(0,229,160,0.12)",
        btnActiveBdr: "#00e5a0",
        btnActiveTxt: "#00e5a0",
        btnBdr:       "#2a2f45",
        btnTxt:       "#6b7494",
        zoomBdr:      "#2a2f45",
        zoomTxt:      "#6b7494",
        mapBg:        "#0a0c13",
        sphere:       "#0a0c13",
        sphereBdr:    "#151929",
        graticule:    "#151929",
        geoFill:      "#1c2130",
        geoBdr:       "#28304a",
        geoHover:     "#242b42",
        dot:          "#00e5a0",
      }
    : {
        wrap:         "#ffffff",
        wrapBorder:   "#e2e8f0",
        headerBorder: "#f1f5f9",
        label:        "#0f172a",
        sublabel:     "#94a3b8",
        btnActive:    "rgba(16,185,129,0.1)",
        btnActiveBdr: "#10b981",
        btnActiveTxt: "#059669",
        btnBdr:       "#e2e8f0",
        btnTxt:       "#94a3b8",
        zoomBdr:      "#e2e8f0",
        zoomTxt:      "#94a3b8",
        mapBg:        "#dbeafe",
        sphere:       "#dbeafe",
        sphereBdr:    "#93c5fd",
        graticule:    "#bfdbfe",
        geoFill:      "#f1f5f9",
        geoBdr:       "#c8d9ea",
        geoHover:     "#e2ecf6",
        dot:          "#059669",
      };

  return (
    <div
      style={{
        background: colors.wrap,
        border: `1px solid ${colors.wrapBorder}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${colors.headerBorder}`,
          padding: "14px 18px",
          flexShrink: 0,
        }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <p style={{ color: colors.label, fontWeight: 600, fontSize: 14, margin: 0 }}>
            User Locations
          </p>
          <p style={{ color: colors.sublabel, fontSize: 12, margin: 0, marginTop: 2 }}>
            User locations around the world
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {CONTINENTS.map((c) => (
            <button
              key={c}
              onClick={() => selectContinent(c)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: 6,
                border: active === c
                  ? `1px solid ${colors.btnActiveBdr}`
                  : `1px solid ${colors.btnBdr}`,
                background: active === c ? colors.btnActive : "transparent",
                color: active === c ? colors.btnActiveTxt : colors.btnTxt,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {c}
            </button>
          ))}

          {/* Zoom */}
          <div
            style={{
              display: "flex",
              marginLeft: 6,
              border: `1px solid ${colors.zoomBdr}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {[
              { label: "+", action: () => setZoom((z) => Math.min(z * 1.6, 24)) },
              { label: "−", action: () => setZoom((z) => Math.max(z / 1.6, 0.8)) },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  fontSize: 16,
                  lineHeight: 1,
                  width: 28,
                  height: 28,
                  background: "transparent",
                  border: "none",
                  color: colors.zoomTxt,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pins && pins.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${colors.headerBorder}`,
            padding: "8px 18px",
            color: colors.sublabel,
            fontSize: 11,
          }}
        >
          Geography dots sized by order count
        </div>
      )}

      {/* Map — fills remaining height */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative" }}
        onMouseLeave={() => setHoveredPin(null)}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130 }}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            inset: 0,
            background: colors.mapBg,
          }}
        >
          <ZoomableGroup center={center} zoom={zoom} minZoom={0.8} maxZoom={24}>
            <Sphere id="rsm-sphere" fill={colors.sphere} stroke={colors.sphereBdr} strokeWidth={0.3} />
            <Graticule stroke={colors.graticule} strokeWidth={0.3} />
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={colors.geoFill}
                    stroke={colors.geoBdr}
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: colors.geoHover, outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {(pins?.length
              ? pins
                  .map((pin) => {
                    const coordinates = resolveCoordinates(pin);

                    if (!coordinates) {
                      return null;
                    }

                    return {
                      name: pin.scope === "us-state" && pin.state
                        ? `${pin.state}, ${pin.country}`
                        : pin.label,
                      coordinates,
                      users: pin.users,
                      revenue: pin.revenue,
                    };
                  })
                  .filter((pin): pin is { name: string; coordinates: [number, number]; users: number; revenue: number | undefined } => pin !== null)
              : DEFAULT_USER_PINS).map(({ name, coordinates, users, revenue }) => {
              const r = Math.min(2.5 + users / 160, 5.5);
              const tooltip = buildPinTooltip({ name, users, revenue });

              return (
                <Marker key={name} coordinates={coordinates}>
                  <g
                    aria-label={tooltip}
                    onMouseEnter={(event) => updateHoveredPin(event, { name, users, revenue })}
                    onMouseMove={(event) => updateHoveredPin(event, { name, users, revenue })}
                    onMouseLeave={() => setHoveredPin(null)}
                    style={{ cursor: "default" }}
                  >
                    <title>{tooltip}</title>
                    <circle r={r * 2.2} fill={colors.dot} opacity={0.12} />
                    <circle r={r * 1.4} fill={colors.dot} opacity={0.25} />
                    <circle r={r * 0.75} fill={colors.dot} opacity={0.95} />
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
        {hoveredPin ? (
          <div
            style={{
              position: "absolute",
              left: hoveredPin.x,
              top: hoveredPin.y,
              transform: "translateY(-100%)",
              pointerEvents: "none",
              zIndex: 2,
              minWidth: 160,
              maxWidth: 220,
              borderRadius: 10,
              border: `1px solid ${colors.wrapBorder}`,
              background: dark ? "rgba(10,12,19,0.96)" : "rgba(255,255,255,0.96)",
              boxShadow: dark
                ? "0 10px 30px rgba(0,0,0,0.45)"
                : "0 10px 30px rgba(15,23,42,0.12)",
              padding: "10px 12px",
              backdropFilter: "blur(8px)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: colors.label,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {hoveredPin.name}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                color: colors.sublabel,
                fontSize: 11,
              }}
            >
              Orders: {hoveredPin.users.toLocaleString("en-US")}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                color: colors.sublabel,
                fontSize: 11,
              }}
            >
              Revenue: {CURRENCY_FORMATTER.format(hoveredPin.revenue ?? 0)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
