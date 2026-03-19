import { chartColor } from "@/shared/charts/highcharts";

export type Deal = {
  company: string;
  contact: string;
  dealSize: number;
  stage: "Scoping" | "Proposal" | "Committed" | "Won";
  probability: number;
  expectedClose: string;
  lastActivity: string;
};

export type BubblePoint = {
  x: number;
  y: number;
  z: number;
  name: string;
  stage: string;
  probability: number;
};

const BASE_DEALS: Deal[] = [
  // ── Scoping (22) ─────────────────────────────────────────────────────────────
  { company: "Acme Corp",      contact: "James Harlow",   dealSize:  45000, stage: "Scoping",   probability: 20, expectedClose: "2026-05-30", lastActivity: "2 days ago"  },
  { company: "Cloudwave",      contact: "Sarah Lin",      dealSize: 120000, stage: "Scoping",   probability: 25, expectedClose: "2026-06-15", lastActivity: "5 days ago"  },
  { company: "Meridian Tech",  contact: "Tom Bradley",    dealSize: 280000, stage: "Scoping",   probability: 30, expectedClose: "2026-07-01", lastActivity: "1 day ago"   },
  { company: "Vaultify",       contact: "Elena Rossi",    dealSize:  55000, stage: "Scoping",   probability: 20, expectedClose: "2026-05-15", lastActivity: "3 days ago"  },
  { company: "Datastream",     contact: "Kevin Park",     dealSize: 195000, stage: "Scoping",   probability: 25, expectedClose: "2026-06-30", lastActivity: "1 week ago"  },
  { company: "Orbital Data",   contact: "Dan Walsh",      dealSize:  72000, stage: "Scoping",   probability: 15, expectedClose: "2026-08-15", lastActivity: "3 days ago"  },
  { company: "Terracycle",     contact: "Mei Zhang",      dealSize: 185000, stage: "Scoping",   probability: 20, expectedClose: "2026-07-30", lastActivity: "1 week ago"  },
  { company: "Pixelwave",      contact: "Sam Torres",     dealSize:  34000, stage: "Scoping",   probability: 15, expectedClose: "2026-09-01", lastActivity: "5 days ago"  },
  { company: "Luminary AI",    contact: "Rachel Ford",    dealSize: 420000, stage: "Scoping",   probability: 25, expectedClose: "2026-08-01", lastActivity: "2 days ago"  },
  { company: "Cascadio",       contact: "Ben Murray",     dealSize:  62000, stage: "Scoping",   probability: 20, expectedClose: "2026-07-15", lastActivity: "4 days ago"  },
  { company: "Driftwood",      contact: "Lena Kim",       dealSize: 148000, stage: "Scoping",   probability: 15, expectedClose: "2026-09-15", lastActivity: "1 week ago"  },
  { company: "Syntrex",        contact: "Omar Hassan",    dealSize: 290000, stage: "Scoping",   probability: 25, expectedClose: "2026-08-30", lastActivity: "1 day ago"   },
  { company: "Kaleidoscope",   contact: "Fiona Black",    dealSize:  48000, stage: "Scoping",   probability: 15, expectedClose: "2026-07-01", lastActivity: "6 days ago"  },
  { company: "Nexora",         contact: "Will Chen",      dealSize: 310000, stage: "Scoping",   probability: 20, expectedClose: "2026-09-30", lastActivity: "2 days ago"  },
  { company: "Fluxpoint",      contact: "Anna Reed",      dealSize:  95000, stage: "Scoping",   probability: 20, expectedClose: "2026-08-15", lastActivity: "3 days ago"  },
  { company: "Cobaltiq",       contact: "James Park",     dealSize: 175000, stage: "Scoping",   probability: 25, expectedClose: "2026-07-20", lastActivity: "5 days ago"  },
  { company: "Streamline AI",  contact: "Kate Walsh",     dealSize: 230000, stage: "Scoping",   probability: 20, expectedClose: "2026-09-01", lastActivity: "4 days ago"  },
  { company: "Vortex Labs",    contact: "Raj Patel",      dealSize:  88000, stage: "Scoping",   probability: 15, expectedClose: "2026-08-30", lastActivity: "1 week ago"  },
  { company: "Chromatic",      contact: "Lisa Chen",      dealSize: 445000, stage: "Scoping",   probability: 25, expectedClose: "2026-07-15", lastActivity: "2 days ago"  },
  { company: "Pathfinder",     contact: "Tom Shaw",       dealSize:  52000, stage: "Scoping",   probability: 15, expectedClose: "2026-09-20", lastActivity: "3 days ago"  },
  { company: "QuantumLeap",    contact: "Sarah Jones",    dealSize: 320000, stage: "Scoping",   probability: 20, expectedClose: "2026-08-01", lastActivity: "Today"       },
  { company: "Helix Corp",     contact: "Mike Davis",     dealSize: 110000, stage: "Scoping",   probability: 20, expectedClose: "2026-07-30", lastActivity: "5 days ago"  },

  // ── Proposal (22) ────────────────────────────────────────────────────────────
  { company: "NexusHQ",        contact: "Alex Morgan",    dealSize:  85000, stage: "Proposal",  probability: 45, expectedClose: "2026-04-30", lastActivity: "1 day ago"   },
  { company: "Synapse",        contact: "Priya Kapoor",   dealSize: 340000, stage: "Proposal",  probability: 55, expectedClose: "2026-04-15", lastActivity: "3 days ago"  },
  { company: "Pulsate",        contact: "Chris Waller",   dealSize:  67000, stage: "Proposal",  probability: 40, expectedClose: "2026-05-01", lastActivity: "2 days ago"  },
  { company: "CoreMetrics",    contact: "Dana Flores",    dealSize: 210000, stage: "Proposal",  probability: 60, expectedClose: "2026-03-31", lastActivity: "Today"       },
  { company: "Zenflow",        contact: "Mike Chen",      dealSize:  38000, stage: "Proposal",  probability: 40, expectedClose: "2026-05-30", lastActivity: "1 week ago"  },
  { company: "Neonlink",       contact: "Zara Ahmed",     dealSize:  95000, stage: "Proposal",  probability: 45, expectedClose: "2026-06-15", lastActivity: "1 day ago"   },
  { company: "Prismatic",      contact: "Carlos Rivera",  dealSize: 260000, stage: "Proposal",  probability: 50, expectedClose: "2026-05-30", lastActivity: "2 days ago"  },
  { company: "Ironclad",       contact: "Diana Wu",       dealSize:  78000, stage: "Proposal",  probability: 40, expectedClose: "2026-06-30", lastActivity: "3 days ago"  },
  { company: "Solaris HQ",     contact: "Peter Grant",    dealSize: 380000, stage: "Proposal",  probability: 55, expectedClose: "2026-05-15", lastActivity: "Today"       },
  { company: "Maplewood",      contact: "Nina Sharma",    dealSize:  43000, stage: "Proposal",  probability: 40, expectedClose: "2026-06-01", lastActivity: "4 days ago"  },
  { company: "Thunderbolt",    contact: "Austin Lee",     dealSize: 220000, stage: "Proposal",  probability: 50, expectedClose: "2026-06-15", lastActivity: "2 days ago"  },
  { company: "Crestview",      contact: "Holly Martin",   dealSize:  65000, stage: "Proposal",  probability: 45, expectedClose: "2026-05-01", lastActivity: "1 day ago"   },
  { company: "Archetype",      contact: "Evan White",     dealSize: 150000, stage: "Proposal",  probability: 50, expectedClose: "2026-06-30", lastActivity: "3 days ago"  },
  { company: "Cobaltus",       contact: "Maya Singh",     dealSize: 490000, stage: "Proposal",  probability: 55, expectedClose: "2026-05-20", lastActivity: "Today"       },
  { company: "Ripple Effect",  contact: "Chris Brown",    dealSize:  82000, stage: "Proposal",  probability: 40, expectedClose: "2026-06-01", lastActivity: "5 days ago"  },
  { company: "Stargate IO",    contact: "Amy Clark",      dealSize: 305000, stage: "Proposal",  probability: 60, expectedClose: "2026-05-15", lastActivity: "1 day ago"   },
  { company: "Tangent Labs",   contact: "Josh Moore",     dealSize:  55000, stage: "Proposal",  probability: 40, expectedClose: "2026-06-30", lastActivity: "1 week ago"  },
  { company: "Velo Systems",   contact: "Grace Kim",      dealSize: 175000, stage: "Proposal",  probability: 50, expectedClose: "2026-05-30", lastActivity: "2 days ago"  },
  { company: "Clearpath",      contact: "Daniel Fox",     dealSize: 430000, stage: "Proposal",  probability: 55, expectedClose: "2026-06-15", lastActivity: "Today"       },
  { company: "Mosaic Data",    contact: "Priya Mehta",    dealSize:  68000, stage: "Proposal",  probability: 45, expectedClose: "2026-05-01", lastActivity: "3 days ago"  },
  { company: "Amplitude",      contact: "Ryan Scott",     dealSize: 245000, stage: "Proposal",  probability: 50, expectedClose: "2026-06-30", lastActivity: "4 days ago"  },
  { company: "Nexbridge",      contact: "Tina Lopez",     dealSize:  38000, stage: "Proposal",  probability: 40, expectedClose: "2026-05-15", lastActivity: "1 week ago"  },

  // ── Committed (20) ───────────────────────────────────────────────────────────
  { company: "Bluepoint",      contact: "Rachel Kim",     dealSize: 155000, stage: "Committed", probability: 80, expectedClose: "2026-03-15", lastActivity: "Today"       },
  { company: "Quantifi",       contact: "David Santos",   dealSize:  95000, stage: "Committed", probability: 75, expectedClose: "2026-03-30", lastActivity: "2 days ago"  },
  { company: "Stackly",        contact: "Jessica Turner", dealSize: 490000, stage: "Committed", probability: 85, expectedClose: "2026-03-20", lastActivity: "Today"       },
  { company: "Gridlock",       contact: "Nathan Hill",    dealSize:  28000, stage: "Committed", probability: 70, expectedClose: "2026-04-01", lastActivity: "3 days ago"  },
  { company: "Brightside",     contact: "Leo Wang",       dealSize: 195000, stage: "Committed", probability: 80, expectedClose: "2026-04-15", lastActivity: "Today"       },
  { company: "Cyclone Tech",   contact: "Emma Davis",     dealSize:  85000, stage: "Committed", probability: 75, expectedClose: "2026-03-30", lastActivity: "1 day ago"   },
  { company: "Fortress IO",    contact: "Aaron Hill",     dealSize: 380000, stage: "Committed", probability: 85, expectedClose: "2026-04-01", lastActivity: "Today"       },
  { company: "Glowforge",      contact: "Isabelle Ross",  dealSize:  52000, stage: "Committed", probability: 70, expectedClose: "2026-04-15", lastActivity: "2 days ago"  },
  { company: "Halo Systems",   contact: "Marcus Chen",    dealSize: 275000, stage: "Committed", probability: 80, expectedClose: "2026-03-20", lastActivity: "Today"       },
  { company: "Ironwood",       contact: "Chloe Park",     dealSize: 115000, stage: "Committed", probability: 75, expectedClose: "2026-04-30", lastActivity: "3 days ago"  },
  { company: "Javelin HQ",     contact: "Derek Stone",    dealSize: 460000, stage: "Committed", probability: 90, expectedClose: "2026-03-25", lastActivity: "Today"       },
  { company: "Kinetic IO",     contact: "Sophia Lee",     dealSize:  72000, stage: "Committed", probability: 70, expectedClose: "2026-04-10", lastActivity: "2 days ago"  },
  { company: "Lattice AI",     contact: "Brandon Kim",    dealSize: 340000, stage: "Committed", probability: 85, expectedClose: "2026-03-30", lastActivity: "1 day ago"   },
  { company: "Mindgate",       contact: "Olivia Cruz",    dealSize:  95000, stage: "Committed", probability: 75, expectedClose: "2026-04-20", lastActivity: "3 days ago"  },
  { company: "Northstar",      contact: "Tyler Reed",     dealSize: 185000, stage: "Committed", probability: 80, expectedClose: "2026-03-15", lastActivity: "Today"       },
  { company: "Opticlear",      contact: "Zoe Hamilton",   dealSize:  68000, stage: "Committed", probability: 70, expectedClose: "2026-04-25", lastActivity: "4 days ago"  },
  { company: "Pangea Data",    contact: "Nathan Fox",     dealSize: 295000, stage: "Committed", probability: 85, expectedClose: "2026-03-20", lastActivity: "1 day ago"   },
  { company: "Quicksilver",    contact: "Riley Morgan",   dealSize:  42000, stage: "Committed", probability: 70, expectedClose: "2026-04-30", lastActivity: "5 days ago"  },
  { company: "Redpoint",       contact: "Claire Scott",   dealSize: 215000, stage: "Committed", probability: 80, expectedClose: "2026-03-25", lastActivity: "2 days ago"  },
  { company: "Silvertech",     contact: "Ian Walsh",      dealSize: 125000, stage: "Committed", probability: 75, expectedClose: "2026-04-15", lastActivity: "3 days ago"  },

  // ── Won (4) ──────────────────────────────────────────────────────────────────
  { company: "Hexaware",       contact: "Amanda Clark",   dealSize: 310000, stage: "Won",       probability: 100, expectedClose: "2026-02-15", lastActivity: "2026-02-15" },
  { company: "Pivotal",        contact: "Robert Evans",   dealSize:  75000, stage: "Won",       probability: 100, expectedClose: "2026-01-31", lastActivity: "2026-01-31" },
  { company: "LoopHQ",         contact: "Sophia Patel",   dealSize: 180000, stage: "Won",       probability: 100, expectedClose: "2026-02-10", lastActivity: "2026-02-10" },
  { company: "Specter",        contact: "Lucas Wright",   dealSize:  42000, stage: "Won",       probability: 100, expectedClose: "2026-02-05", lastActivity: "2026-02-05" },
];

const GENERATED_OPPORTUNITY_COUNT = 200;
const GENERATED_STAGE_DISTRIBUTION: Array<{ stage: Deal["stage"]; count: number }> = [
  { stage: "Scoping", count: 70 },
  { stage: "Proposal", count: 60 },
  { stage: "Committed", count: 50 },
  { stage: "Won", count: 20 },
];
const GENERATED_INDUSTRIES = [
  "Revenue Intelligence",
  "Cybersecurity",
  "Cloud Infrastructure",
  "Supply Chain",
  "Healthcare IT",
  "FinTech",
  "Data Engineering",
  "AI / ML Platform",
  "Compliance Tech",
  "DevTools",
  "Sales Enablement",
  "Workflow Automation",
  "Customer Success",
  "Analytics Platform",
];
const COMPANY_PREFIXES = [
  "Aster", "Beacon", "Cinder", "Delta", "Echo", "Falcon", "Granite", "Harbor", "Ion",
  "Juniper", "Keystone", "Lumen", "Merit", "Nimbus", "Orion", "Pioneer", "Quanta",
  "Rivet", "Summit", "Titan", "Union", "Vector", "Waypoint", "Xeno", "Yield", "Zenith",
];
const COMPANY_SUFFIXES = [
  "Labs", "Systems", "Cloud", "Data", "Works", "Dynamics", "Logic", "Forge", "Bridge",
  "Nexus", "Grid", "Flow", "Core", "Stack", "Signal", "Pilot", "Point",
];
const CONTACT_FIRST_NAMES = [
  "Ava", "Noah", "Emma", "Liam", "Mia", "Ethan", "Olivia", "Lucas", "Sophia", "Mason",
  "Isla", "Logan", "Amelia", "Aiden", "Charlotte", "Elijah", "Harper", "Jackson",
];
const CONTACT_LAST_NAMES = [
  "Adams", "Brooks", "Carter", "Diaz", "Edwards", "Foster", "Gibson", "Hayes", "Irwin",
  "Jordan", "Keller", "Lopez", "Mitchell", "Nguyen", "Owens", "Parker", "Quinn", "Reed",
  "Shaw", "Turner", "Underwood", "Vargas", "Walker", "Young",
];
const RELATIVE_ACTIVITY = [
  "Today",
  "1 day ago",
  "2 days ago",
  "3 days ago",
  "4 days ago",
  "5 days ago",
  "1 week ago",
];

function makeDataRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickOne<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function addDaysIso(baseIso: string, deltaDays: number): string {
  const d = new Date(`${baseIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function stageDealSize(stage: Deal["stage"], rng: () => number): number {
  const ranges: Record<Deal["stage"], [number, number]> = {
    Scoping:   [25000, 420000],
    Proposal:  [30000, 500000],
    Committed: [35000, 500000],
    Won:       [25000, 380000],
  };
  const [min, max] = ranges[stage];
  return Math.round(randInt(rng, min, max) / 1000) * 1000;
}

function stageProbability(stage: Deal["stage"], rng: () => number): number {
  if (stage === "Won") return 100;
  const options: Record<Exclude<Deal["stage"], "Won">, number[]> = {
    Scoping: [15, 20, 25, 30, 35],
    Proposal: [40, 45, 50, 55, 60, 65],
    Committed: [70, 75, 80, 85, 90, 95],
  };
  return pickOne(rng, options[stage]);
}

function stageExpectedClose(stage: Deal["stage"], rng: () => number): string {
  const base = "2026-02-20";
  const ranges: Record<Deal["stage"], [number, number]> = {
    Scoping:   [75, 260],
    Proposal:  [40, 190],
    Committed: [10, 100],
    Won:       [-90, -2],
  };
  const [min, max] = ranges[stage];
  return addDaysIso(base, randInt(rng, min, max));
}

function stageLastActivity(stage: Deal["stage"], expectedClose: string, rng: () => number): string {
  return stage === "Won" ? expectedClose : pickOne(rng, RELATIVE_ACTIVITY);
}

function stageContact(rng: () => number): string {
  return `${pickOne(rng, CONTACT_FIRST_NAMES)} ${pickOne(rng, CONTACT_LAST_NAMES)}`;
}

function buildGeneratedOpportunities(): Deal[] {
  const planned = GENERATED_STAGE_DISTRIBUTION.reduce((sum, item) => sum + item.count, 0);
  if (planned !== GENERATED_OPPORTUNITY_COUNT) {
    throw new Error(`Expected ${GENERATED_OPPORTUNITY_COUNT} generated opportunities, got ${planned}.`);
  }

  const rng = makeDataRng(0x5f3759df);
  const existingCompanies = new Set(BASE_DEALS.map((d) => d.company));
  const generated: Deal[] = [];
  let serial = 1;

  for (const { stage, count } of GENERATED_STAGE_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      let company = "";
      while (!company || existingCompanies.has(company)) {
        const suffixSerial = String(serial).padStart(3, "0");
        company = `${pickOne(rng, COMPANY_PREFIXES)} ${pickOne(rng, COMPANY_SUFFIXES)} ${suffixSerial}`;
        serial += 1;
      }
      existingCompanies.add(company);
      const expectedClose = stageExpectedClose(stage, rng);
      generated.push({
        company,
        contact: stageContact(rng),
        dealSize: stageDealSize(stage, rng),
        stage,
        probability: stageProbability(stage, rng),
        expectedClose,
        lastActivity: stageLastActivity(stage, expectedClose, rng),
      });
    }
  }
  return generated;
}

const GENERATED_OPPORTUNITIES: Deal[] = buildGeneratedOpportunities();
export const allDeals: Deal[] = [...BASE_DEALS, ...GENERATED_OPPORTUNITIES];

export const wonDeals      = allDeals.filter((d) => d.stage === "Won");
export const pipelineDeals = allDeals.filter((d) => d.stage !== "Won");

// ─── Bubble chart positions (per-stage packed physics) ────────────────────────

// Mirrors the funnel trapezoid from view.tsx: left (x=-0.5) → ±4.5, right (x=3.5) → ±1.5
function funnelBoundAtX(x: number): number {
  return 4.5 - 3.0 * (x + 0.5) / 4.0;
}

const X_MIN = -0.5;
const X_MAX = 3.5;
const Y_MIN = -5;
const Y_MAX = 5;

// Approximate plot size for layout calculations.
const PX_W     = 1050;
const PX_H     = 420;
const PX_PER_X = PX_W / (X_MAX - X_MIN);
const PX_PER_Y = PX_H / (Y_MAX - Y_MIN);

export const FUNNEL_BUBBLE_Z_MIN = 25000;
export const FUNNEL_BUBBLE_Z_MAX = 500000;

const DESIRED_MIN_SIZE_FRACTION = 0.05;
const DESIRED_MAX_SIZE_FRACTION = 0.24;
const HC_SMALLER = Math.min(PX_W, PX_H);
const Z_LO = FUNNEL_BUBBLE_Z_MIN;
const Z_HI = FUNNEL_BUBBLE_Z_MAX;

const PACK_GAP = 1;
const SECTION_X_INSET = 0.01;
const SECTION_Y_INSET = 0.975;
const TARGET_FILL_RATIO = 0.86;
const RELAX_STEPS = 600;
const OVERLAP_PUSH_BASE = 0.75;
const OVERLAP_PUSH_COOLING = 0.20;
const NEAR_GAP_ATTRACT_RANGE = 22;
const NEAR_GAP_ATTRACT_BASE = 0.002;
const NEAR_GAP_ATTRACT_COOLING = 0.001;
const FAR_FIELD_REPEL = 80;
const CENTER_GRAVITY = 0.0001;
const OUTWARD_COVERAGE_PUSH = 0.004;
const VELOCITY_DAMPING = 0.84;
const MAX_SPEED_PX = 16;
const TARGET_COVERAGE_X = 0.97;
const TARGET_COVERAGE_Y = 0.95;
const TARGET_MAX_RESIDUAL_OVERLAP_PX = 0.0005;
const DEOVERLAP_SWEEPS = 560;

interface SizeModel {
  minFraction: number;
  maxFraction: number;
  minPx: number;
  maxPx: number;
}

interface StageSeriesSizing {
  minSize: string;
  maxSize: string;
  zMin: number;
  zMax: number;
}

type StageXBoundsPx = { left: number; right: number };

interface PackedCircle {
  idx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rp: number;
}

const STAGE_ORDER: Deal["stage"][] = ["Scoping", "Proposal", "Committed", "Won"];
const STAGE_IDX: Record<Deal["stage"], number> = {
  Scoping: 0, Proposal: 1, Committed: 2, Won: 3,
};
const STAGE_DEALS: Record<Deal["stage"], Deal[]> = {
  Scoping: allDeals.filter((d) => d.stage === "Scoping"),
  Proposal: allDeals.filter((d) => d.stage === "Proposal"),
  Committed: allDeals.filter((d) => d.stage === "Committed"),
  Won: allDeals.filter((d) => d.stage === "Won"),
};

function makeSizeModel(scale: number): SizeModel {
  const minFraction = DESIRED_MIN_SIZE_FRACTION * scale;
  const maxFraction = DESIRED_MAX_SIZE_FRACTION * scale;
  return {
    minFraction,
    maxFraction,
    minPx: minFraction * HC_SMALLER / 2,
    maxPx: maxFraction * HC_SMALLER / 2,
  };
}

function rPx(z: number, size: SizeModel): number {
  const t = Math.max(0, Math.min(1, (z - Z_LO) / (Z_HI - Z_LO)));
  return size.minPx + t * (size.maxPx - size.minPx);
}

function stageXBoundsPx(stageIndex: number): StageXBoundsPx {
  return {
    left: (stageIndex - 0.5 + SECTION_X_INSET) * PX_PER_X,
    right: (stageIndex + 0.5 - SECTION_X_INSET) * PX_PER_X,
  };
}

function stageHalfHeightPxAtXPx(xPx: number): number {
  return funnelBoundAtX(xPx / PX_PER_X) * PX_PER_Y * SECTION_Y_INSET;
}

function clampCircleToStage(circle: PackedCircle, xBounds: StageXBoundsPx): void {
  circle.x = Math.max(xBounds.left + circle.rp, Math.min(xBounds.right - circle.rp, circle.x));
  const capY = Math.max(0, stageHalfHeightPxAtXPx(circle.x) - circle.rp);
  circle.y = Math.max(-capY, Math.min(capY, circle.y));
}

function expandCoverage(circles: PackedCircle[], xBounds: StageXBoundsPx, centerXPx: number): void {
  if (circles.length === 0) return;
  const widthAvailable = xBounds.right - xBounds.left;
  const xMin = Math.min(...circles.map((c) => c.x - c.rp));
  const xMax = Math.max(...circles.map((c) => c.x + c.rp));
  const currentWidth = xMax - xMin;
  const targetWidth = widthAvailable * TARGET_COVERAGE_X;

  if (currentWidth > 1e-3 && currentWidth < targetWidth) {
    let maxScale = Number.POSITIVE_INFINITY;
    for (const c of circles) {
      const dx = c.x - centerXPx;
      if (dx > 1e-4) {
        maxScale = Math.min(maxScale, (xBounds.right - c.rp - centerXPx) / dx);
      } else if (dx < -1e-4) {
        maxScale = Math.min(maxScale, (xBounds.left + c.rp - centerXPx) / dx);
      }
    }
    const needScale = targetWidth / currentWidth;
    const scale = Math.max(1, Math.min(needScale, maxScale * 0.998));
    if (scale > 1.0005) {
      for (const c of circles) {
        c.x = centerXPx + (c.x - centerXPx) * scale;
        clampCircleToStage(c, xBounds);
      }
    }
  }

  const centerCap = stageHalfHeightPxAtXPx(centerXPx);
  const targetHeight = 2 * centerCap * TARGET_COVERAGE_Y;
  const yMin = Math.min(...circles.map((c) => c.y - c.rp));
  const yMax = Math.max(...circles.map((c) => c.y + c.rp));
  const currentHeight = yMax - yMin;

  if (currentHeight > 1e-3 && currentHeight < targetHeight) {
    let maxScale = Number.POSITIVE_INFINITY;
    for (const c of circles) {
      const capY = Math.max(0, stageHalfHeightPxAtXPx(c.x) - c.rp);
      if (Math.abs(c.y) > 1e-4) {
        maxScale = Math.min(maxScale, capY / Math.abs(c.y));
      }
    }
    const needScale = targetHeight / currentHeight;
    const scale = Math.max(1, Math.min(needScale, maxScale * 0.998));
    if (scale > 1.0005) {
      for (const c of circles) {
        c.y *= scale;
        clampCircleToStage(c, xBounds);
      }
    }
  }
}

function makeSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function boundaryClearancePx(xPx: number, yPx: number, rp: number, xBounds: StageXBoundsPx): number {
  const capY = stageHalfHeightPxAtXPx(xPx) - rp;
  if (capY <= 0) return -1;
  const clearLeft = xPx - (xBounds.left + rp);
  const clearRight = (xBounds.right - rp) - xPx;
  const clearTop = capY - yPx;
  const clearBottom = yPx + capY;
  return Math.min(clearLeft, clearRight, clearTop, clearBottom);
}

function minPlacementSlackPx(
  xPx: number,
  yPx: number,
  rp: number,
  circles: PackedCircle[],
  xBounds: StageXBoundsPx,
): number {
  let minSlack = boundaryClearancePx(xPx, yPx, rp, xBounds);
  if (minSlack < 0) return minSlack;
  for (const c of circles) {
    const clear = Math.hypot(xPx - c.x, yPx - c.y) - (rp + c.rp + PACK_GAP);
    if (clear < minSlack) minSlack = clear;
    if (minSlack < 0) return minSlack;
  }
  return minSlack;
}

function sampleInitialPlacementPx(
  rp: number,
  circles: PackedCircle[],
  xBounds: StageXBoundsPx,
  centerXPx: number,
  rng: () => number,
): { x: number; y: number } {
  if (circles.length === 0) {
    const xPx = centerXPx + (rng() - 0.5) * 18;
    const capY = Math.max(0, stageHalfHeightPxAtXPx(xPx) - rp);
    return { x: xPx, y: (rng() * 2 - 1) * Math.min(capY, 20) };
  }

  const sampleCount = Math.max(900, circles.length * 56);
  let best: { x: number; y: number; score: number } | null = null;
  for (let s = 0; s < sampleCount; s++) {
    let xPx: number;
    let yPx: number;
    if (s < circles.length * 18) {
      const anchor = circles[Math.floor(rng() * circles.length)];
      const angle = rng() * Math.PI * 2;
      const dist = anchor.rp + rp + PACK_GAP + rng() * 24;
      xPx = anchor.x + Math.cos(angle) * dist;
      yPx = anchor.y + Math.sin(angle) * dist;
    } else {
      const freeWidth = Math.max(1, xBounds.right - xBounds.left - 2 * rp);
      xPx = xBounds.left + rp + rng() * freeWidth;
      const capY = Math.max(0, stageHalfHeightPxAtXPx(xPx) - rp);
      yPx = (rng() * 2 - 1) * capY;
    }

    const slack = minPlacementSlackPx(xPx, yPx, rp, circles, xBounds);
    if (slack < 0) continue;
    const centerDist = Math.hypot(xPx - centerXPx, yPx);
    const score = slack * 9 - centerDist * 0.05;
    if (!best || score < best.score) best = { x: xPx, y: yPx, score };
  }

  if (best) return { x: best.x, y: best.y };

  // Fallback: pick least-bad location deterministically.
  let fallbackX = centerXPx;
  let fallbackY = 0;
  let fallbackScore = Number.POSITIVE_INFINITY;
  for (let s = 0; s < 3200; s++) {
    const freeWidth = Math.max(1, xBounds.right - xBounds.left - 2 * rp);
    const xPx = xBounds.left + rp + rng() * freeWidth;
    const capY = Math.max(0, stageHalfHeightPxAtXPx(xPx) - rp);
    const yPx = (rng() * 2 - 1) * capY;
    const slack = minPlacementSlackPx(xPx, yPx, rp, circles, xBounds);
    const score = (slack >= 0 ? slack : -slack * 24) - Math.hypot(xPx - centerXPx, yPx) * 0.04;
    if (score < fallbackScore) {
      fallbackScore = score;
      fallbackX = xPx;
      fallbackY = yPx;
    }
  }
  return { x: fallbackX, y: fallbackY };
}

function stageAreaPx(stageIndex: number): number {
  const xBounds = stageXBoundsPx(stageIndex);
  const steps = 320;
  const dx = (xBounds.right - xBounds.left) / steps;
  let area = 0;
  for (let i = 0; i < steps; i++) {
    const x = xBounds.left + (i + 0.5) * dx;
    area += stageHalfHeightPxAtXPx(x) * 2 * dx;
  }
  return area;
}

function totalCircleAreaPx(deals: Deal[], size: SizeModel): number {
  return deals.reduce((sum, d) => {
    const rp = rPx(d.dealSize, size);
    return sum + Math.PI * rp * rp;
  }, 0);
}

function solveScaleForFill(deals: Deal[], stage: Deal["stage"]): number {
  const stageArea = stageAreaPx(STAGE_IDX[stage]);
  const targetCircleArea = stageArea * TARGET_FILL_RATIO;
  let low = 0.04;
  let high = 1.0;
  while (totalCircleAreaPx(deals, makeSizeModel(high)) < targetCircleArea && high < 2.8) {
    high *= 1.2;
  }
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (totalCircleAreaPx(deals, makeSizeModel(mid)) <= targetCircleArea) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

function residualOverlapPx(circles: PackedCircle[]): number {
  let worst = 0;
  for (let a = 0; a < circles.length; a++) {
    for (let b = a + 1; b < circles.length; b++) {
      const need = circles[a].rp + circles[b].rp + PACK_GAP;
      const dist = Math.hypot(circles[b].x - circles[a].x, circles[b].y - circles[a].y);
      worst = Math.max(worst, need - dist);
    }
  }
  return Math.max(0, worst);
}

type StagePackingResult = {
  points: BubblePoint[];
  maxResidualOverlapPx: number;
  size: SizeModel;
  success: boolean;
};

function packStageAtScale(stageDeals: Deal[], stage: Deal["stage"], scale: number): StagePackingResult {
  const size = makeSizeModel(scale);
  const stageIndex = STAGE_IDX[stage];
  const xBounds = stageXBoundsPx(stageIndex);
  const centerXPx = (xBounds.left + xBounds.right) / 2;
  const rng = makeSeededRng((0x9e3779b9 ^ ((stageIndex + 1) * 0x85ebca6b) ^ (stageDeals.length * 0xc2b2ae35)) >>> 0);
  const ordered = stageDeals
    .map((d, idx) => ({ deal: d, idx, rp: rPx(d.dealSize, size) }))
    .sort((a, b) => (b.rp - a.rp) || (a.idx - b.idx));

  const circles: PackedCircle[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const entry = ordered[i];
    const placement = sampleInitialPlacementPx(entry.rp, circles, xBounds, centerXPx, rng);
    const circle: PackedCircle = { idx: entry.idx, x: placement.x, y: placement.y, vx: 0, vy: 0, rp: entry.rp };
    clampCircleToStage(circle, xBounds);
    circles.push(circle);
  }

  const fx = new Array<number>(circles.length).fill(0);
  const fy = new Array<number>(circles.length).fill(0);

  for (let it = 0; it < RELAX_STEPS; it++) {
    fx.fill(0);
    fy.fill(0);
    const cool = 1 - it / RELAX_STEPS;

    for (let a = 0; a < circles.length; a++) {
      for (let b = a + 1; b < circles.length; b++) {
        const ca = circles[a];
        const cb = circles[b];
        let dx = cb.x - ca.x;
        let dy = cb.y - ca.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-4) {
          const angle = rng() * Math.PI * 2;
          dx = Math.cos(angle) * 1e-3;
          dy = Math.sin(angle) * 1e-3;
          dist = 1e-3;
        }
        const ux = dx / dist;
        const uy = dy / dist;
        const need = ca.rp + cb.rp + PACK_GAP;

        if (dist < need) {
          const push = (need - dist) * (OVERLAP_PUSH_BASE + OVERLAP_PUSH_COOLING * cool);
          fx[a] -= ux * push;
          fy[a] -= uy * push;
          fx[b] += ux * push;
          fy[b] += uy * push;
        } else if (dist < need + NEAR_GAP_ATTRACT_RANGE) {
          const pull = (dist - need) * (NEAR_GAP_ATTRACT_BASE + NEAR_GAP_ATTRACT_COOLING * cool);
          fx[a] += ux * pull;
          fy[a] += uy * pull;
          fx[b] -= ux * pull;
          fy[b] -= uy * pull;
        }

        const spread = FAR_FIELD_REPEL / (dist * dist + 800);
        fx[a] -= ux * spread;
        fy[a] -= uy * spread;
        fx[b] += ux * spread;
        fy[b] += uy * spread;
      }
    }

    const jitter = 0.9 * cool;
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      fx[i] += (centerXPx - c.x) * CENTER_GRAVITY + (c.x - centerXPx) * OUTWARD_COVERAGE_PUSH + (rng() - 0.5) * jitter;
      fy[i] += (0 - c.y) * CENTER_GRAVITY + c.y * OUTWARD_COVERAGE_PUSH + (rng() - 0.5) * jitter;

      c.vx = (c.vx + fx[i]) * VELOCITY_DAMPING;
      c.vy = (c.vy + fy[i]) * VELOCITY_DAMPING;
      const speed = Math.hypot(c.vx, c.vy);
      if (speed > MAX_SPEED_PX) {
        const scaleDown = MAX_SPEED_PX / speed;
        c.vx *= scaleDown;
        c.vy *= scaleDown;
      }
      c.x += c.vx;
      c.y += c.vy;
      clampCircleToStage(c, xBounds);
    }
  }

  expandCoverage(circles, xBounds, centerXPx);

  for (let pass = 0; pass < DEOVERLAP_SWEEPS; pass++) {
    let worst = 0;
    for (let a = 0; a < circles.length; a++) {
      for (let b = a + 1; b < circles.length; b++) {
        const ca = circles[a];
        const cb = circles[b];
        let dx = cb.x - ca.x;
        let dy = cb.y - ca.y;
        let dist = Math.hypot(dx, dy);
        const need = ca.rp + cb.rp + PACK_GAP;
        if (dist >= need) continue;
        if (dist < 1e-6) {
          const angle = rng() * Math.PI * 2;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1e-3;
        }
        const overlap = need - dist;
        worst = Math.max(worst, overlap);
        const ux = dx / dist;
        const uy = dy / dist;
        const push = overlap * 0.52 + 0.02;
        ca.x -= ux * push;
        ca.y -= uy * push;
        cb.x += ux * push;
        cb.y += uy * push;
        clampCircleToStage(ca, xBounds);
        clampCircleToStage(cb, xBounds);
      }
    }
    if (worst <= TARGET_MAX_RESIDUAL_OVERLAP_PX) break;
  }

  const maxResidualOverlapPx = residualOverlapPx(circles);

  const byIdx: Array<PackedCircle | undefined> = new Array(stageDeals.length);
  for (const c of circles) byIdx[c.idx] = c;
  const points = stageDeals.map((d, i) => ({
    x: parseFloat(((byIdx[i]?.x ?? centerXPx) / PX_PER_X).toFixed(5)),
    y: parseFloat(((byIdx[i]?.y ?? 0) / PX_PER_Y).toFixed(5)),
    z: d.dealSize,
    name: d.company,
    stage: d.stage,
    probability: d.probability,
  }));

  return {
    points,
    maxResidualOverlapPx,
    size,
    success: maxResidualOverlapPx <= TARGET_MAX_RESIDUAL_OVERLAP_PX,
  };
}

function solveStagePacking(stageDeals: Deal[], stage: Deal["stage"]): StagePackingResult {
  if (stageDeals.length === 0) {
    const size = makeSizeModel(1);
    return { points: [], maxResidualOverlapPx: 0, size, success: true };
  }

  const areaScale = solveScaleForFill(stageDeals, stage);
  let low = Math.max(0.05, areaScale * 0.38);
  let lowResult = packStageAtScale(stageDeals, stage, low);
  while (!lowResult.success && low > 0.01) {
    low *= 0.75;
    lowResult = packStageAtScale(stageDeals, stage, low);
  }
  if (!lowResult.success) return lowResult;

  const high = Math.max(low, areaScale);
  const highResult = packStageAtScale(stageDeals, stage, high);
  if (highResult.success) return highResult;

  let best = lowResult;
  let lo = low;
  let hi = high;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const midResult = packStageAtScale(stageDeals, stage, mid);
    if (midResult.success) {
      best = midResult;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

type FunnelPackingSolution = {
  points: BubblePoint[];
  stageSizes: Record<Deal["stage"], SizeModel>;
};

function solveFunnelPacking(): FunnelPackingSolution {
  const points: BubblePoint[] = [];
  const stageSizes = {} as Record<Deal["stage"], SizeModel>;

  for (const stage of STAGE_ORDER) {
    const solved = solveStagePacking(STAGE_DEALS[stage], stage);
    points.push(...solved.points);
    stageSizes[stage] = solved.size;
  }
  return { points, stageSizes };
}

const FUNNEL_PACKING = solveFunnelPacking();

export const FUNNEL_STAGE_BUBBLE_SIZES: Record<Deal["stage"], StageSeriesSizing> = {
  Scoping: {
    minSize: `${(FUNNEL_PACKING.stageSizes.Scoping.minFraction * 100).toFixed(4)}%`,
    maxSize: `${(FUNNEL_PACKING.stageSizes.Scoping.maxFraction * 100).toFixed(4)}%`,
    zMin: FUNNEL_BUBBLE_Z_MIN,
    zMax: FUNNEL_BUBBLE_Z_MAX,
  },
  Proposal: {
    minSize: `${(FUNNEL_PACKING.stageSizes.Proposal.minFraction * 100).toFixed(4)}%`,
    maxSize: `${(FUNNEL_PACKING.stageSizes.Proposal.maxFraction * 100).toFixed(4)}%`,
    zMin: FUNNEL_BUBBLE_Z_MIN,
    zMax: FUNNEL_BUBBLE_Z_MAX,
  },
  Committed: {
    minSize: `${(FUNNEL_PACKING.stageSizes.Committed.minFraction * 100).toFixed(4)}%`,
    maxSize: `${(FUNNEL_PACKING.stageSizes.Committed.maxFraction * 100).toFixed(4)}%`,
    zMin: FUNNEL_BUBBLE_Z_MIN,
    zMax: FUNNEL_BUBBLE_Z_MAX,
  },
  Won: {
    minSize: `${(FUNNEL_PACKING.stageSizes.Won.minFraction * 100).toFixed(4)}%`,
    maxSize: `${(FUNNEL_PACKING.stageSizes.Won.maxFraction * 100).toFixed(4)}%`,
    zMin: FUNNEL_BUBBLE_Z_MIN,
    zMax: FUNNEL_BUBBLE_Z_MAX,
  },
};

const globalMinFraction = Math.min(...STAGE_ORDER.map((stage) => FUNNEL_PACKING.stageSizes[stage].minFraction));
const globalMaxFraction = Math.max(...STAGE_ORDER.map((stage) => FUNNEL_PACKING.stageSizes[stage].maxFraction));

export const FUNNEL_BUBBLE_MIN_SIZE = `${(globalMinFraction * 100).toFixed(4)}%`;
export const FUNNEL_BUBBLE_MAX_SIZE = `${(globalMaxFraction * 100).toFixed(4)}%`;
export const allBubblePoints: BubblePoint[] = FUNNEL_PACKING.points;

export const MAX_DEAL_SIZE = Math.max(...allDeals.map((d) => d.dealSize));

export const FUNNEL_STAGE_COLORS: Record<string, string> = {
  Scoping:   chartColor(0),
  Proposal:  chartColor(2),
  Committed: chartColor(1),
  Won:       "#10b981",
};

// ─── Per-company detail cards ─────────────────────────────────────────────────

export type CompanyInfo = {
  industry: string;
  employees: string;
  employeeCount: number;   // midpoint, used for slider filtering
  yearlyRevenue: string;
  annualRevenue: number;   // $K (e.g. 8000 = $8M), used for slider filtering
  foundedYear: number;     // used to compute age
  description: string;
};

const BASE_COMPANY_INFO: Record<string, CompanyInfo> = {
  // Scoping
  "Acme Corp":      { industry: "Manufacturing SaaS",     employees: "80–150",      employeeCount:  115, yearlyRevenue: "$8M ARR",    annualRevenue:   8000, foundedYear: 2016, description: "Acme Corp modernises shop-floor operations for mid-market manufacturers with real-time OEE dashboards and predictive maintenance alerts." },
  "Cloudwave":      { industry: "Cloud Infrastructure",   employees: "120–200",     employeeCount:  160, yearlyRevenue: "$14M ARR",   annualRevenue:  14000, foundedYear: 2014, description: "Cloudwave provides multi-cloud cost optimisation and workload orchestration, cutting average cloud spend by 28% for enterprise teams." },
  "Meridian Tech":  { industry: "Data & Analytics",       employees: "300–500",     employeeCount:  400, yearlyRevenue: "$35M ARR",   annualRevenue:  35000, foundedYear: 2012, description: "Meridian Tech's unified data fabric connects disparate warehouses and lakes, enabling sub-second BI queries across petabyte-scale datasets." },
  "Vaultify":       { industry: "Cybersecurity",          employees: "40–80",       employeeCount:   60, yearlyRevenue: "$4M ARR",    annualRevenue:   4000, foundedYear: 2019, description: "Vaultify automates secrets management and zero-trust access policies for DevSecOps teams, integrating natively with all major CI/CD pipelines." },
  "Datastream":     { industry: "Data & Analytics",       employees: "200–350",     employeeCount:  275, yearlyRevenue: "$22M ARR",   annualRevenue:  22000, foundedYear: 2013, description: "Datastream delivers real-time event streaming and enrichment pipelines, processing over 50 billion events per day for global media and retail clients." },
  "Orbital Data":   { industry: "Geospatial Intelligence",employees: "60–120",      employeeCount:   90, yearlyRevenue: "$7M ARR",    annualRevenue:   7000, foundedYear: 2018, description: "Orbital Data specialises in satellite-derived geospatial intelligence, turning raw imagery into actionable supply-chain market signals." },
  "Terracycle":     { industry: "Sustainability Tech",    employees: "150–250",     employeeCount:  200, yearlyRevenue: "$18M ARR",   annualRevenue:  18000, foundedYear: 2015, description: "Terracycle tracks Scope 1–3 emissions across complex value chains, generating audit-ready ESG reports in minutes rather than months." },
  "Pixelwave":      { industry: "Creative SaaS",          employees: "25–60",       employeeCount:   43, yearlyRevenue: "$3M ARR",    annualRevenue:   3000, foundedYear: 2020, description: "Pixelwave gives in-house creative teams AI-assisted layout generation and brand-compliance checking, reducing design iteration cycles by 60%." },
  "Luminary AI":    { industry: "AI / ML Platform",       employees: "400–700",     employeeCount:  550, yearlyRevenue: "$48M ARR",   annualRevenue:  48000, foundedYear: 2011, description: "Luminary AI provides enterprise-grade LLM fine-tuning and deployment infrastructure with full data-residency controls for regulated industries." },
  "Cascadio":       { industry: "RevOps",                 employees: "50–90",       employeeCount:   70, yearlyRevenue: "$6M ARR",    annualRevenue:   6000, foundedYear: 2018, description: "Cascadio unifies CRM, billing, and support signals into a single revenue operations layer, surfacing churn risk and expansion opportunities automatically." },
  "Driftwood":      { industry: "HR Tech",                employees: "100–180",     employeeCount:  140, yearlyRevenue: "$11M ARR",   annualRevenue:  11000, foundedYear: 2016, description: "Driftwood streamlines contractor lifecycle management—from onboarding and compliance to payments—across 60+ countries." },
  "Syntrex":        { industry: "Supply Chain",           employees: "350–600",     employeeCount:  475, yearlyRevenue: "$38M ARR",   annualRevenue:  38000, foundedYear: 2011, description: "Syntrex connects procurement, logistics, and finance teams on a single control tower with AI-driven risk alerts and end-to-end visibility." },
  "Kaleidoscope":   { industry: "Marketing Tech",         employees: "30–70",       employeeCount:   50, yearlyRevenue: "$3.5M ARR",  annualRevenue:   3500, foundedYear: 2020, description: "Kaleidoscope makes personalised video at scale effortless—brands dynamically assemble thousands of unique video variants from a single template." },
  "Nexora":         { industry: "FinTech",                employees: "500–800",     employeeCount:  650, yearlyRevenue: "$55M ARR",   annualRevenue:  55000, foundedYear: 2010, description: "Nexora powers embedded lending infrastructure for SaaS platforms, enabling instant credit decisioning and white-label loan origination in under a day." },
  "Fluxpoint":      { industry: "DevTools",               employees: "80–140",      employeeCount:  110, yearlyRevenue: "$9M ARR",    annualRevenue:   9000, foundedYear: 2017, description: "Fluxpoint is a feature-flag and experimentation platform that lets engineering teams ship and test changes safely at any scale without deployment risk." },
  "Cobaltiq":       { industry: "Cybersecurity",          employees: "130–220",     employeeCount:  175, yearlyRevenue: "$16M ARR",   annualRevenue:  16000, foundedYear: 2015, description: "Cobaltiq's autonomous threat-hunting engine continuously scans dark-web sources and internal telemetry to deliver prioritised, remediation-ready alerts." },
  "Streamline AI":  { industry: "Legal Tech",             employees: "200–400",     employeeCount:  300, yearlyRevenue: "$26M ARR",   annualRevenue:  26000, foundedYear: 2013, description: "Streamline AI accelerates contract review and negotiation using purpose-built legal LLMs, cutting outside-counsel spend by an average of 35%." },
  "Vortex Labs":    { industry: "IoT Platform",           employees: "70–130",      employeeCount:  100, yearlyRevenue: "$8.5M ARR",  annualRevenue:   8500, foundedYear: 2017, description: "Vortex Labs connects millions of industrial IoT devices with an edge-computing layer that performs real-time anomaly detection without cloud dependency." },
  "Chromatic":      { industry: "Design Infrastructure",  employees: "500–900",     employeeCount:  700, yearlyRevenue: "$58M ARR",   annualRevenue:  58000, foundedYear: 2010, description: "Chromatic is the enterprise design-system platform, hosting UI component libraries and automating visual regression testing across every pull request." },
  "Pathfinder":     { industry: "Field Service",          employees: "40–80",       employeeCount:   60, yearlyRevenue: "$4.5M ARR",  annualRevenue:   4500, foundedYear: 2019, description: "Pathfinder optimises field-service dispatch and routing with ML scheduling that reduces travel time by 22% and improves first-time fix rates." },
  "QuantumLeap":    { industry: "EdTech",                 employees: "450–750",     employeeCount:  600, yearlyRevenue: "$42M ARR",   annualRevenue:  42000, foundedYear: 2011, description: "QuantumLeap delivers adaptive learning pathways for enterprise upskilling, connecting skills-gap analytics directly to measurable business outcomes." },
  "Helix Corp":     { industry: "Healthcare IT",          employees: "110–200",     employeeCount:  155, yearlyRevenue: "$12M ARR",   annualRevenue:  12000, foundedYear: 2016, description: "Helix Corp's clinical data interoperability layer harmonises HL7 and FHIR feeds across hospital systems, enabling real-time care coordination dashboards." },
  // Proposal
  "NexusHQ":        { industry: "Sales Intelligence",     employees: "90–160",      employeeCount:  125, yearlyRevenue: "$10M ARR",   annualRevenue:  10000, foundedYear: 2016, description: "NexusHQ surfaces buying-intent signals and contact intelligence in real time, helping enterprise sales teams engage the right prospects at exactly the right moment." },
  "Synapse":        { industry: "AI / ML Platform",       employees: "600–1,000",   employeeCount:  800, yearlyRevenue: "$72M ARR",   annualRevenue:  72000, foundedYear: 2009, description: "Synapse is an end-to-end MLOps platform that automates model training, monitoring, and redeployment—reducing time-to-production for ML pipelines by 70%." },
  "Pulsate":        { industry: "Customer Engagement",    employees: "55–100",      employeeCount:   78, yearlyRevenue: "$6.5M ARR",  annualRevenue:   6500, foundedYear: 2018, description: "Pulsate's mobile-first engagement platform drives hyper-personalised push campaigns and in-app messaging for retail banks and credit unions." },
  "CoreMetrics":    { industry: "Product Analytics",      employees: "250–400",     employeeCount:  325, yearlyRevenue: "$28M ARR",   annualRevenue:  28000, foundedYear: 2013, description: "CoreMetrics gives product teams session replay, funnel analytics, and cohort analysis in one platform, with no-code instrumentation that works in under an hour." },
  "Zenflow":        { industry: "Workflow Automation",    employees: "35–70",       employeeCount:   53, yearlyRevenue: "$3.8M ARR",  annualRevenue:   3800, foundedYear: 2020, description: "Zenflow is a no-code workflow builder that connects 400+ enterprise apps, automating multi-step processes with approval chains and audit trails built in." },
  "Neonlink":       { industry: "B2B Commerce",           employees: "85–150",      employeeCount:  118, yearlyRevenue: "$10.5M ARR", annualRevenue:  10500, foundedYear: 2016, description: "Neonlink powers B2B e-commerce catalogues for distributors with real-time inventory sync, tiered pricing rules, and EDI integration for enterprise buyers." },
  "Prismatic":      { industry: "Integration Platform",   employees: "280–450",     employeeCount:  365, yearlyRevenue: "$32M ARR",   annualRevenue:  32000, foundedYear: 2013, description: "Prismatic is an embedded iPaaS that lets SaaS companies ship native integrations to their own customers without maintaining a sprawling connector codebase." },
  "Ironclad":       { industry: "Legal Tech",             employees: "75–130",      employeeCount:  103, yearlyRevenue: "$8M ARR",    annualRevenue:   8000, foundedYear: 2017, description: "Ironclad's digital contracting platform eliminates paper-based processes for mid-market procurement, accelerating contract cycle times from weeks to hours." },
  "Solaris HQ":     { industry: "Energy Tech",            employees: "700–1,200",   employeeCount:  950, yearlyRevenue: "$85M ARR",   annualRevenue:  85000, foundedYear: 2009, description: "Solaris HQ provides commercial solar asset management software, optimising fleet performance and automating utility interconnection filings for C&I portfolios." },
  "Maplewood":      { industry: "Real Estate Tech",       employees: "30–65",       employeeCount:   48, yearlyRevenue: "$3.2M ARR",  annualRevenue:   3200, foundedYear: 2020, description: "Maplewood automates lease abstraction and CAM reconciliation for commercial real estate operators, turning hundreds of PDF leases into structured data overnight." },
  "Thunderbolt":    { industry: "Logistics Tech",         employees: "220–380",     employeeCount:  300, yearlyRevenue: "$25M ARR",   annualRevenue:  25000, foundedYear: 2013, description: "Thunderbolt's freight-intelligence platform provides real-time carrier rate benchmarking and automated tender management, cutting logistics costs by up to 18%." },
  "Crestview":      { industry: "Financial Services",     employees: "60–110",      employeeCount:   85, yearlyRevenue: "$6.8M ARR",  annualRevenue:   6800, foundedYear: 2018, description: "Crestview delivers regulatory reporting automation for community banks, generating HMDA, CRA, and CECL submissions with a single-click reconciliation workflow." },
  "Archetype":      { industry: "Brand Strategy",         employees: "100–180",     employeeCount:  140, yearlyRevenue: "$12.5M ARR", annualRevenue:  12500, foundedYear: 2016, description: "Archetype's brand analytics platform measures message resonance and competitive share-of-voice across earned, owned, and paid channels in real time." },
  "Cobaltus":       { industry: "Cloud Infrastructure",   employees: "800–1,400",   employeeCount: 1100, yearlyRevenue: "$95M ARR",   annualRevenue:  95000, foundedYear: 2008, description: "Cobaltus is a cloud cost governance platform providing chargebacks, anomaly detection, and rightsizing recommendations across AWS, Azure, and GCP." },
  "Ripple Effect":  { industry: "Social Impact Tech",     employees: "70–120",      employeeCount:   95, yearlyRevenue: "$7.5M ARR",  annualRevenue:   7500, foundedYear: 2018, description: "Ripple Effect connects corporate volunteering programmes with nonprofits, tracking participation, skills deployed, and measurable community impact at scale." },
  "Stargate IO":    { industry: "API Management",         employees: "550–900",     employeeCount:  725, yearlyRevenue: "$65M ARR",   annualRevenue:  65000, foundedYear: 2010, description: "Stargate IO is an API gateway and developer portal that helps platform teams publish, monetise, and govern APIs across hybrid cloud environments." },
  "Tangent Labs":   { industry: "Research Tools",         employees: "28–55",       employeeCount:   42, yearlyRevenue: "$2.8M ARR",  annualRevenue:   2800, foundedYear: 2021, description: "Tangent Labs accelerates primary research with AI-assisted survey design, automated transcript analysis, and instant insight synthesis for UX and strategy teams." },
  "Velo Systems":   { industry: "Transportation Tech",    employees: "160–280",     employeeCount:  220, yearlyRevenue: "$19M ARR",   annualRevenue:  19000, foundedYear: 2015, description: "Velo Systems manages last-mile delivery fleets with dynamic routing, driver-performance coaching, and proof-of-delivery automation for 3PL operators." },
  "Clearpath":      { industry: "Compliance Tech",        employees: "750–1,300",   employeeCount: 1025, yearlyRevenue: "$88M ARR",   annualRevenue:  88000, foundedYear: 2008, description: "Clearpath automates GDPR, CCPA, and SOC 2 compliance programmes with continuous control monitoring and one-click evidence collection for auditors." },
  "Mosaic Data":    { industry: "Data Engineering",       employees: "55–100",      employeeCount:   78, yearlyRevenue: "$5.8M ARR",  annualRevenue:   5800, foundedYear: 2019, description: "Mosaic Data simplifies data-lakehouse migrations with schema inference, automated pipeline generation, and lineage tracking for data engineering teams." },
  "Amplitude":      { industry: "Product Analytics",      employees: "300–500",     employeeCount:  400, yearlyRevenue: "$36M ARR",   annualRevenue:  36000, foundedYear: 2012, description: "Amplitude's digital optimisation platform connects product behaviour data to business outcomes, helping teams prioritise features that drive retention and revenue." },
  "Nexbridge":      { industry: "FinTech",                employees: "22–50",       employeeCount:   36, yearlyRevenue: "$2.2M ARR",  annualRevenue:   2200, foundedYear: 2021, description: "Nexbridge provides instant cross-border treasury settlements for mid-market importers, bypassing correspondent banking delays with a fully automated FX layer." },
  // Committed
  "Bluepoint":      { industry: "Healthcare IT",          employees: "140–250",     employeeCount:  195, yearlyRevenue: "$17M ARR",   annualRevenue:  17000, foundedYear: 2015, description: "Bluepoint's revenue cycle management platform automates prior-authorisation and claims processing for multi-specialty medical groups, reducing denials by 34%." },
  "Quantifi":       { industry: "Risk Analytics",         employees: "90–160",      employeeCount:  125, yearlyRevenue: "$11M ARR",   annualRevenue:  11000, foundedYear: 2017, description: "Quantifi delivers real-time credit and market risk analytics for asset managers, with stress-testing scenarios that update continuously as market conditions shift." },
  "Stackly":        { industry: "DevOps Platform",        employees: "900–1,500",   employeeCount: 1200, yearlyRevenue: "$110M ARR",  annualRevenue: 110000, foundedYear: 2008, description: "Stackly is an internal developer platform that standardises golden paths for infrastructure provisioning, making self-serve Kubernetes deployments accessible to all engineers." },
  "Gridlock":       { industry: "Network Security",       employees: "25–55",       employeeCount:   40, yearlyRevenue: "$2.5M ARR",  annualRevenue:   2500, foundedYear: 2021, description: "Gridlock provides microsegmentation and east-west traffic inspection for on-premise data centres, delivering zero-trust networking without a costly forklift upgrade." },
  "Brightside":     { industry: "Employee Benefits",      employees: "200–350",     employeeCount:  275, yearlyRevenue: "$24M ARR",   annualRevenue:  24000, foundedYear: 2014, description: "Brightside's financial wellness platform pairs employees with certified coaches and offers payroll-integrated savings tools, measurably reducing financial stress." },
  "Cyclone Tech":   { industry: "Climate Tech",           employees: "80–140",      employeeCount:  110, yearlyRevenue: "$9M ARR",    annualRevenue:   9000, foundedYear: 2017, description: "Cyclone Tech's renewable energy forecasting engine helps grid operators and energy traders optimise dispatch schedules using high-resolution weather modelling." },
  "Fortress IO":    { industry: "Cybersecurity",          employees: "600–950",     employeeCount:  775, yearlyRevenue: "$78M ARR",   annualRevenue:  78000, foundedYear: 2009, description: "Fortress IO is an extended detection and response (XDR) platform that correlates signals across endpoint, network, and identity layers to stop breaches in real time." },
  "Glowforge":      { industry: "E-commerce Tech",        employees: "45–80",       employeeCount:   63, yearlyRevenue: "$4.8M ARR",  annualRevenue:   4800, foundedYear: 2019, description: "Glowforge automates product-page creation and SEO enrichment for large-catalogue retailers, generating structured listings from raw supplier data instantly." },
  "Halo Systems":   { industry: "Public Safety Tech",     employees: "380–650",     employeeCount:  515, yearlyRevenue: "$45M ARR",   annualRevenue:  45000, foundedYear: 2012, description: "Halo Systems deploys AI-powered gunshot detection and crowd analytics for smart-city programmes, integrating with existing CCTV and dispatch infrastructure." },
  "Ironwood":       { industry: "Construction Tech",      employees: "120–210",     employeeCount:  165, yearlyRevenue: "$13.5M ARR", annualRevenue:  13500, foundedYear: 2016, description: "Ironwood digitises jobsite management for general contractors, connecting RFI workflows, daily reports, and subcontractor billing on a single mobile-first platform." },
  "Javelin HQ":     { industry: "Sales Enablement",       employees: "1,000–1,800", employeeCount: 1400, yearlyRevenue: "$120M ARR",  annualRevenue: 120000, foundedYear: 2007, description: "Javelin HQ is the enterprise sales-content management and guided-selling platform, ensuring every rep delivers a consistent, compliant story at every stage." },
  "Kinetic IO":     { industry: "Manufacturing SaaS",     employees: "65–115",      employeeCount:   90, yearlyRevenue: "$7.2M ARR",  annualRevenue:   7200, foundedYear: 2018, description: "Kinetic IO connects CNC machines and assembly lines to a cloud historian, turning raw sensor streams into OEE scores, waste reports, and maintenance tickets." },
  "Lattice AI":     { industry: "AI / ML Platform",       employees: "700–1,100",   employeeCount:  900, yearlyRevenue: "$92M ARR",   annualRevenue:  92000, foundedYear: 2009, description: "Lattice AI provides foundation-model customisation and RAG infrastructure for enterprises that need private, hallucination-resistant AI assistants." },
  "Mindgate":       { industry: "Mental Health Tech",     employees: "85–155",      employeeCount:  120, yearlyRevenue: "$10M ARR",   annualRevenue:  10000, foundedYear: 2017, description: "Mindgate's EAP platform gives employees on-demand access to therapists and coaches, with anonymised population health analytics for HR teams." },
  "Northstar":      { industry: "Revenue Intelligence",   employees: "220–380",     employeeCount:  300, yearlyRevenue: "$26M ARR",   annualRevenue:  26000, foundedYear: 2014, description: "Northstar captures and analyses every sales interaction—calls, emails, and meetings—turning conversation data into forecast accuracy and coaching recommendations." },
  "Opticlear":      { industry: "Optical Networking",     employees: "55–100",      employeeCount:   78, yearlyRevenue: "$6.2M ARR",  annualRevenue:   6200, foundedYear: 2018, description: "Opticlear's network performance management suite monitors optical transport layers for telcos, predicting fibre degradation before it causes customer-impacting outages." },
  "Pangea Data":    { industry: "Data Governance",        employees: "420–700",     employeeCount:  560, yearlyRevenue: "$52M ARR",   annualRevenue:  52000, foundedYear: 2011, description: "Pangea Data automates data-quality monitoring, lineage documentation, and privacy-impact assessments across modern data stacks, keeping governance teams ahead of regulations." },
  "Quicksilver":    { industry: "Payments Tech",          employees: "30–65",       employeeCount:   48, yearlyRevenue: "$3M ARR",    annualRevenue:   3000, foundedYear: 2021, description: "Quicksilver provides embedded payment orchestration for vertical SaaS platforms, routing transactions across acquirers to maximise acceptance rates." },
  "Redpoint":       { industry: "Customer Data Platform", employees: "280–460",     employeeCount:  370, yearlyRevenue: "$32M ARR",   annualRevenue:  32000, foundedYear: 2013, description: "Redpoint's real-time CDP unifies online and offline customer data, enabling personalised cross-channel orchestration that responds to behaviour in under 50ms." },
  "Silvertech":     { industry: "AgriTech",               employees: "100–180",     employeeCount:  140, yearlyRevenue: "$13M ARR",   annualRevenue:  13000, foundedYear: 2016, description: "Silvertech's precision-agriculture platform combines satellite imagery, soil sensors, and weather forecasts to generate field-level irrigation and fertilisation recommendations." },
  // Won
  "Hexaware":       { industry: "IT Services",            employees: "2,000–5,000", employeeCount: 3500, yearlyRevenue: "$280M ARR",  annualRevenue: 280000, foundedYear: 2000, description: "Hexaware delivers cloud migration, digital engineering, and AI-automation services to Fortune 500 clients across banking, healthcare, and travel verticals." },
  "Pivotal":        { industry: "DevOps Platform",        employees: "180–300",     employeeCount:  240, yearlyRevenue: "$20M ARR",   annualRevenue:  20000, foundedYear: 2014, description: "Pivotal's cloud-native application platform accelerates software delivery for enterprises transitioning from legacy monoliths to microservices architectures." },
  "LoopHQ":         { industry: "Customer Success",       employees: "110–200",     employeeCount:  155, yearlyRevenue: "$14M ARR",   annualRevenue:  14000, foundedYear: 2016, description: "LoopHQ's customer-success platform uses product-usage telemetry and health scoring to help CS teams prioritise interventions and automate renewal playbooks." },
  "Specter":        { industry: "Threat Intelligence",    employees: "40–75",       employeeCount:   58, yearlyRevenue: "$4.2M ARR",  annualRevenue:   4200, foundedYear: 2020, description: "Specter aggregates adversary-infrastructure data from dark-web forums and honeypots, giving threat-intel teams early warning of targeted attack campaigns." },
};

function formatEmployeeBand(employeeCount: number): string {
  const lower = Math.max(20, Math.round(employeeCount * 0.72 / 5) * 5);
  const upper = Math.max(lower + 10, Math.round(employeeCount * 1.28 / 5) * 5);
  return `${lower.toLocaleString()}–${upper.toLocaleString()}`;
}

function formatAnnualRevenueLabel(annualRevenue: number): string {
  const millions = annualRevenue / 1000;
  const text = millions >= 100
    ? millions.toFixed(0)
    : millions.toFixed(1).replace(/\.0$/, "");
  return `$${text}M ARR`;
}

function buildGeneratedCompanyInfo(deals: Deal[]): Record<string, CompanyInfo> {
  const rng = makeDataRng(0x7f4a7c15);
  const generatedInfo: Record<string, CompanyInfo> = {};
  for (const deal of deals) {
    if (generatedInfo[deal.company]) continue;
    const industry = pickOne(rng, GENERATED_INDUSTRIES);
    const foundedYear = randInt(rng, 2007, 2024);
    const revenueMultiplier = randInt(rng, 22, 135);
    const annualRevenueRaw = Math.round((deal.dealSize / 1000) * revenueMultiplier);
    const annualRevenue = Math.max(2200, Math.min(180000, Math.round(annualRevenueRaw / 100) * 100));
    const baseHeadcount = Math.round(annualRevenue / randInt(rng, 75, 190));
    const employeeCount = Math.max(24, Math.min(2200, baseHeadcount + randInt(rng, -20, 20)));
    generatedInfo[deal.company] = {
      industry,
      employees: formatEmployeeBand(employeeCount),
      employeeCount,
      yearlyRevenue: formatAnnualRevenueLabel(annualRevenue),
      annualRevenue,
      foundedYear,
      description: `${deal.company} provides ${industry.toLowerCase()} software for revenue teams, combining automation and analytics to improve pipeline velocity and close outcomes.`,
    };
  }
  return generatedInfo;
}

const GENERATED_COMPANY_INFO = buildGeneratedCompanyInfo(GENERATED_OPPORTUNITIES);
export const COMPANY_INFO: Record<string, CompanyInfo> = {
  ...BASE_COMPANY_INFO,
  ...GENERATED_COMPANY_INFO,
};

// Precomputed ranges used by filter-dimension sliders
export const FILTER_RANGES = {
  maxAnnualRevenue: Math.max(...Object.values(COMPANY_INFO).map((c) => c.annualRevenue)),
  maxEmployeeCount: Math.max(...Object.values(COMPANY_INFO).map((c) => c.employeeCount)),
  maxYearsInBiz:    2026 - Math.min(...Object.values(COMPANY_INFO).map((c) => c.foundedYear)),
} as const;

// ─── KPI totals ───────────────────────────────────────────────────────────────

const pipelineTotal = pipelineDeals.reduce((s, d) => s + d.dealSize, 0);
const wonTotal      = wonDeals.reduce((s, d) => s + d.dealSize, 0);
const avgDealSize   = Math.round(pipelineTotal / pipelineDeals.length);

function fmtVal(n: number): string {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${Math.round(n / 1000)}K`;
}

export const salesPipelineKpis = [
  {
    title: "Total Pipeline Value",
    value: fmtVal(pipelineTotal),
    subtitle: `${pipelineDeals.length} active deals`,
    trend: `${fmtVal(pipelineTotal)} in pipe`,
    positive: true,
  },
  {
    title: "Deals in Pipe",
    value: String(pipelineDeals.length),
    subtitle: "Scoping · Proposal · Committed",
    trend: `${allDeals.length} total tracked`,
    positive: true,
  },
  {
    title: "Avg Deal Size",
    value: fmtVal(avgDealSize),
    subtitle: "Pipeline average",
    trend: `${fmtVal(Math.round(wonTotal / wonDeals.length))} avg on closed`,
    positive: true,
  },
  {
    title: "Win Rate",
    value: `${Math.round((wonDeals.length / allDeals.length) * 100)}%`,
    subtitle: `${wonDeals.length} closed of ${allDeals.length}`,
    trend: `${fmtVal(wonTotal)} closed this quarter`,
    positive: true,
  },
];

// ─── Stage monthly adds (mock — "added this month" per stage) ─────────────────

export type StageMonthlyAdd = {
  stage: "Scoping" | "Proposal" | "Committed" | "Won";
  dealsAdded: number;
  valueAdded: string;
  valueDelta: string;   // vs last month, e.g. "+12%"
  positive: boolean;
};

// Won totals are derived from real data; others are mock.
const wonMtdTotal = wonDeals
  .filter((d) => d.expectedClose.startsWith("2026-02"))
  .reduce((s, d) => s + d.dealSize, 0);

export const STAGE_MONTHLY_ADDS: StageMonthlyAdd[] = [
  { stage: "Scoping",   dealsAdded: 14, valueAdded: fmtVal(1_840_000), valueDelta: "+8%",  positive: true  },
  { stage: "Proposal",  dealsAdded: 9,  valueAdded: fmtVal(1_320_000), valueDelta: "+5%",  positive: true  },
  { stage: "Committed", dealsAdded: 6,  valueAdded: fmtVal(920_000),   valueDelta: "-3%",  positive: false },
  { stage: "Won",       dealsAdded: wonDeals.filter((d) => d.expectedClose.startsWith("2026-02")).length, valueAdded: fmtVal(wonMtdTotal), valueDelta: "+21%", positive: true },
];
