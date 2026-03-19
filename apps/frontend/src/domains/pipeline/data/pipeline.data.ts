import { type PipelineStageBucket, type SfOpportunityPipelineDeal } from "@contracts/sales";

import { chartColor } from "@/shared/charts/highcharts";

export const STAGE_NAMES = [
  "Scoping",
  "Proposal",
  "Committed",
  "Won",
] as const satisfies readonly PipelineStageBucket[];

export type StageName = (typeof STAGE_NAMES)[number];
export type StatusFilter = "all" | "open" | "won";

export type RangeFilterKey =
  | "dealSize"
  | "probability"
  | "daysOpen"
  | "timeOpen"
  | "lastActivityDays";

export type RangeFilterState = Record<RangeFilterKey, [number, number]>;

export type DealFilterBounds = {
  maxDealSize: number;
  maxProbability: number;
  maxDaysOpen: number;
  maxTimeOpen: number;
  maxLastActivityDays: number;
};

export type BubblePoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  name: string;
  stage: StageName;
  stageName: string;
  probability: number;
};

export type StageSeriesSizing = {
  minSize: string;
  maxSize: string;
  zMin: number;
  zMax: number;
};

export type FunnelPackingLayout = {
  points: BubblePoint[];
  stageBubbleSizes: Record<StageName, StageSeriesSizing>;
  bubbleMinSize: string;
  bubbleMaxSize: string;
  zMin: number;
  zMax: number;
};

type SizeModel = {
  minFraction: number;
  maxFraction: number;
  minPx: number;
  maxPx: number;
};

type StageXBoundsPx = { left: number; right: number };

type PackedCircle = {
  idx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rp: number;
};

type ZDomain = {
  zMin: number;
  zMax: number;
};

type StagePackingResult = {
  points: BubblePoint[];
  maxResidualOverlapPx: number;
  size: SizeModel;
  success: boolean;
};

const DEFAULT_FILTER_BOUNDS: DealFilterBounds = {
  maxDealSize: 100_000,
  maxProbability: 100,
  maxDaysOpen: 30,
  maxTimeOpen: 30,
  maxLastActivityDays: 30,
};

const X_MIN = -0.5;
const X_MAX = 3.5;
const Y_MIN = -5;
const Y_MAX = 5;
const PX_W = 1050;
const PX_H = 420;
const PX_PER_X = PX_W / (X_MAX - X_MIN);
const PX_PER_Y = PX_H / (Y_MAX - Y_MIN);
const DESIRED_MIN_SIZE_FRACTION = 0.05;
const DESIRED_MAX_SIZE_FRACTION = 0.24;
const HC_SMALLER = Math.min(PX_W, PX_H);
const PACK_GAP = 1;
const SECTION_X_INSET = 0.01;
const SECTION_Y_INSET = 0.975;
const TARGET_FILL_RATIO = 0.86;
const RELAX_STEPS = 600;
const OVERLAP_PUSH_BASE = 0.75;
const OVERLAP_PUSH_COOLING = 0.2;
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

const STAGE_IDX: Record<StageName, number> = {
  Scoping: 0,
  Proposal: 1,
  Committed: 2,
  Won: 3,
};

function roundUp(value: number, step: number, minimum: number): number {
  if (value <= 0) {
    return minimum;
  }

  return Math.max(minimum, Math.ceil(value / step) * step);
}

function funnelBoundAtX(x: number): number {
  return 4.5 - 3.0 * (x + 0.5) / 4.0;
}

function compareQuarterLabels(left: string, right: string): number {
  const leftMatch = left.match(/^Q(\d)\s+(\d{4})$/);
  const rightMatch = right.match(/^Q(\d)\s+(\d{4})$/);

  if (!leftMatch || !rightMatch) {
    return left.localeCompare(right);
  }

  const leftYear = Number(leftMatch[2]);
  const rightYear = Number(rightMatch[2]);

  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  return Number(leftMatch[1]) - Number(rightMatch[1]);
}

function makeSizeModel(scale: number): SizeModel {
  const minFraction = DESIRED_MIN_SIZE_FRACTION * scale;
  const maxFraction = DESIRED_MAX_SIZE_FRACTION * scale;

  return {
    minFraction,
    maxFraction,
    minPx: (minFraction * HC_SMALLER) / 2,
    maxPx: (maxFraction * HC_SMALLER) / 2,
  };
}

function rPx(z: number, size: SizeModel, zDomain: ZDomain): number {
  if (zDomain.zMax <= zDomain.zMin) {
    return (size.minPx + size.maxPx) / 2;
  }

  const t = Math.max(0, Math.min(1, (z - zDomain.zMin) / (zDomain.zMax - zDomain.zMin)));
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

function expandCoverage(
  circles: PackedCircle[],
  xBounds: StageXBoundsPx,
  centerXPx: number,
): void {
  if (circles.length === 0) {
    return;
  }

  const widthAvailable = xBounds.right - xBounds.left;
  const xMin = Math.min(...circles.map((circle) => circle.x - circle.rp));
  const xMax = Math.max(...circles.map((circle) => circle.x + circle.rp));
  const currentWidth = xMax - xMin;
  const targetWidth = widthAvailable * TARGET_COVERAGE_X;

  if (currentWidth > 1e-3 && currentWidth < targetWidth) {
    let maxScale = Number.POSITIVE_INFINITY;

    for (const circle of circles) {
      const dx = circle.x - centerXPx;

      if (dx > 1e-4) {
        maxScale = Math.min(maxScale, (xBounds.right - circle.rp - centerXPx) / dx);
      } else if (dx < -1e-4) {
        maxScale = Math.min(maxScale, (xBounds.left + circle.rp - centerXPx) / dx);
      }
    }

    const needScale = targetWidth / currentWidth;
    const scale = Math.max(1, Math.min(needScale, maxScale * 0.998));

    if (scale > 1.0005) {
      for (const circle of circles) {
        circle.x = centerXPx + (circle.x - centerXPx) * scale;
        clampCircleToStage(circle, xBounds);
      }
    }
  }

  const centerCap = stageHalfHeightPxAtXPx(centerXPx);
  const targetHeight = 2 * centerCap * TARGET_COVERAGE_Y;
  const yMin = Math.min(...circles.map((circle) => circle.y - circle.rp));
  const yMax = Math.max(...circles.map((circle) => circle.y + circle.rp));
  const currentHeight = yMax - yMin;

  if (currentHeight > 1e-3 && currentHeight < targetHeight) {
    let maxScale = Number.POSITIVE_INFINITY;

    for (const circle of circles) {
      const capY = Math.max(0, stageHalfHeightPxAtXPx(circle.x) - circle.rp);
      if (Math.abs(circle.y) > 1e-4) {
        maxScale = Math.min(maxScale, capY / Math.abs(circle.y));
      }
    }

    const needScale = targetHeight / currentHeight;
    const scale = Math.max(1, Math.min(needScale, maxScale * 0.998));

    if (scale > 1.0005) {
      for (const circle of circles) {
        circle.y *= scale;
        clampCircleToStage(circle, xBounds);
      }
    }
  }
}

function makeSeededRng(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function boundaryClearancePx(
  xPx: number,
  yPx: number,
  rp: number,
  xBounds: StageXBoundsPx,
): number {
  const capY = stageHalfHeightPxAtXPx(xPx) - rp;

  if (capY <= 0) {
    return -1;
  }

  const clearLeft = xPx - (xBounds.left + rp);
  const clearRight = xBounds.right - rp - xPx;
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

  if (minSlack < 0) {
    return minSlack;
  }

  for (const circle of circles) {
    const clear = Math.hypot(xPx - circle.x, yPx - circle.y) - (rp + circle.rp + PACK_GAP);

    if (clear < minSlack) {
      minSlack = clear;
    }

    if (minSlack < 0) {
      return minSlack;
    }
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

  for (let sample = 0; sample < sampleCount; sample += 1) {
    let xPx: number;
    let yPx: number;

    if (sample < circles.length * 18) {
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

    if (slack < 0) {
      continue;
    }

    const centerDist = Math.hypot(xPx - centerXPx, yPx);
    const score = slack * 9 - centerDist * 0.05;

    if (!best || score < best.score) {
      best = { x: xPx, y: yPx, score };
    }
  }

  if (best) {
    return { x: best.x, y: best.y };
  }

  let fallbackX = centerXPx;
  let fallbackY = 0;
  let fallbackScore = Number.POSITIVE_INFINITY;

  for (let sample = 0; sample < 3200; sample += 1) {
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

  for (let index = 0; index < steps; index += 1) {
    const x = xBounds.left + (index + 0.5) * dx;
    area += stageHalfHeightPxAtXPx(x) * 2 * dx;
  }

  return area;
}

function totalCircleAreaPx(
  deals: readonly SfOpportunityPipelineDeal[],
  size: SizeModel,
  zDomain: ZDomain,
): number {
  return deals.reduce((sum, deal) => {
    const rp = rPx(deal.amount, size, zDomain);
    return sum + Math.PI * rp * rp;
  }, 0);
}

function solveScaleForFill(
  deals: readonly SfOpportunityPipelineDeal[],
  stage: StageName,
  zDomain: ZDomain,
): number {
  const stageArea = stageAreaPx(STAGE_IDX[stage]);
  const targetCircleArea = stageArea * TARGET_FILL_RATIO;
  let low = 0.04;
  let high = 1;

  while (totalCircleAreaPx(deals, makeSizeModel(high), zDomain) < targetCircleArea && high < 2.8) {
    high *= 1.2;
  }

  for (let index = 0; index < 24; index += 1) {
    const mid = (low + high) / 2;
    if (totalCircleAreaPx(deals, makeSizeModel(mid), zDomain) <= targetCircleArea) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

function residualOverlapPx(circles: PackedCircle[]): number {
  let worst = 0;

  for (let left = 0; left < circles.length; left += 1) {
    for (let right = left + 1; right < circles.length; right += 1) {
      const need = circles[left].rp + circles[right].rp + PACK_GAP;
      const dist = Math.hypot(circles[right].x - circles[left].x, circles[right].y - circles[left].y);
      worst = Math.max(worst, need - dist);
    }
  }

  return Math.max(0, worst);
}

function packStageAtScale(
  stageDeals: readonly SfOpportunityPipelineDeal[],
  stage: StageName,
  scale: number,
  zDomain: ZDomain,
): StagePackingResult {
  const size = makeSizeModel(scale);
  const stageIndex = STAGE_IDX[stage];
  const xBounds = stageXBoundsPx(stageIndex);
  const centerXPx = (xBounds.left + xBounds.right) / 2;
  const rng = makeSeededRng(
    (0x9e3779b9 ^ ((stageIndex + 1) * 0x85ebca6b) ^ (stageDeals.length * 0xc2b2ae35)) >>> 0,
  );
  const ordered = stageDeals
    .map((deal, idx) => ({ deal, idx, rp: rPx(deal.amount, size, zDomain) }))
    .sort((left, right) => right.rp - left.rp || left.idx - right.idx);

  const circles: PackedCircle[] = [];

  for (const entry of ordered) {
    const placement = sampleInitialPlacementPx(entry.rp, circles, xBounds, centerXPx, rng);
    const circle: PackedCircle = {
      idx: entry.idx,
      x: placement.x,
      y: placement.y,
      vx: 0,
      vy: 0,
      rp: entry.rp,
    };
    clampCircleToStage(circle, xBounds);
    circles.push(circle);
  }

  const fx = new Array<number>(circles.length).fill(0);
  const fy = new Array<number>(circles.length).fill(0);

  for (let iteration = 0; iteration < RELAX_STEPS; iteration += 1) {
    fx.fill(0);
    fy.fill(0);
    const cool = 1 - iteration / RELAX_STEPS;

    for (let left = 0; left < circles.length; left += 1) {
      for (let right = left + 1; right < circles.length; right += 1) {
        const leftCircle = circles[left];
        const rightCircle = circles[right];
        let dx = rightCircle.x - leftCircle.x;
        let dy = rightCircle.y - leftCircle.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 1e-4) {
          const angle = rng() * Math.PI * 2;
          dx = Math.cos(angle) * 1e-3;
          dy = Math.sin(angle) * 1e-3;
          dist = 1e-3;
        }

        const ux = dx / dist;
        const uy = dy / dist;
        const need = leftCircle.rp + rightCircle.rp + PACK_GAP;

        if (dist < need) {
          const push = (need - dist) * (OVERLAP_PUSH_BASE + OVERLAP_PUSH_COOLING * cool);
          fx[left] -= ux * push;
          fy[left] -= uy * push;
          fx[right] += ux * push;
          fy[right] += uy * push;
        } else if (dist < need + NEAR_GAP_ATTRACT_RANGE) {
          const pull = (dist - need) * (NEAR_GAP_ATTRACT_BASE + NEAR_GAP_ATTRACT_COOLING * cool);
          fx[left] += ux * pull;
          fy[left] += uy * pull;
          fx[right] -= ux * pull;
          fy[right] -= uy * pull;
        }

        const spread = FAR_FIELD_REPEL / (dist * dist + 800);
        fx[left] -= ux * spread;
        fy[left] -= uy * spread;
        fx[right] += ux * spread;
        fy[right] += uy * spread;
      }
    }

    const jitter = 0.9 * cool;

    for (let index = 0; index < circles.length; index += 1) {
      const circle = circles[index];
      fx[index] +=
        (centerXPx - circle.x) * CENTER_GRAVITY +
        (circle.x - centerXPx) * OUTWARD_COVERAGE_PUSH +
        (rng() - 0.5) * jitter;
      fy[index] += (0 - circle.y) * CENTER_GRAVITY + circle.y * OUTWARD_COVERAGE_PUSH + (rng() - 0.5) * jitter;

      circle.vx = (circle.vx + fx[index]) * VELOCITY_DAMPING;
      circle.vy = (circle.vy + fy[index]) * VELOCITY_DAMPING;
      const speed = Math.hypot(circle.vx, circle.vy);

      if (speed > MAX_SPEED_PX) {
        const scaleDown = MAX_SPEED_PX / speed;
        circle.vx *= scaleDown;
        circle.vy *= scaleDown;
      }

      circle.x += circle.vx;
      circle.y += circle.vy;
      clampCircleToStage(circle, xBounds);
    }
  }

  expandCoverage(circles, xBounds, centerXPx);

  for (let pass = 0; pass < DEOVERLAP_SWEEPS; pass += 1) {
    let worst = 0;

    for (let left = 0; left < circles.length; left += 1) {
      for (let right = left + 1; right < circles.length; right += 1) {
        const leftCircle = circles[left];
        const rightCircle = circles[right];
        let dx = rightCircle.x - leftCircle.x;
        let dy = rightCircle.y - leftCircle.y;
        let dist = Math.hypot(dx, dy);
        const need = leftCircle.rp + rightCircle.rp + PACK_GAP;

        if (dist >= need) {
          continue;
        }

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

        leftCircle.x -= ux * push;
        leftCircle.y -= uy * push;
        rightCircle.x += ux * push;
        rightCircle.y += uy * push;
        clampCircleToStage(leftCircle, xBounds);
        clampCircleToStage(rightCircle, xBounds);
      }
    }

    if (worst <= TARGET_MAX_RESIDUAL_OVERLAP_PX) {
      break;
    }
  }

  const maxResidualOverlapPx = residualOverlapPx(circles);
  const byIdx: Array<PackedCircle | undefined> = new Array(stageDeals.length);

  for (const circle of circles) {
    byIdx[circle.idx] = circle;
  }

  const points = stageDeals.map((deal, index) => ({
    id: deal.id,
    x: Number((((byIdx[index]?.x ?? centerXPx) / PX_PER_X)).toFixed(5)),
    y: Number((((byIdx[index]?.y ?? 0) / PX_PER_Y)).toFixed(5)),
    z: deal.amount,
    name: deal.company,
    stage,
    stageName: deal.stageName,
    probability: deal.probability,
  }));

  return {
    points,
    maxResidualOverlapPx,
    size,
    success: maxResidualOverlapPx <= TARGET_MAX_RESIDUAL_OVERLAP_PX,
  };
}

function solveStagePacking(
  stageDeals: readonly SfOpportunityPipelineDeal[],
  stage: StageName,
  zDomain: ZDomain,
): StagePackingResult {
  if (stageDeals.length === 0) {
    const size = makeSizeModel(1);
    return { points: [], maxResidualOverlapPx: 0, size, success: true };
  }

  const areaScale = solveScaleForFill(stageDeals, stage, zDomain);
  let low = Math.max(0.05, areaScale * 0.38);
  let lowResult = packStageAtScale(stageDeals, stage, low, zDomain);

  while (!lowResult.success && low > 0.01) {
    low *= 0.75;
    lowResult = packStageAtScale(stageDeals, stage, low, zDomain);
  }

  if (!lowResult.success) {
    return lowResult;
  }

  const high = Math.max(low, areaScale);
  const highResult = packStageAtScale(stageDeals, stage, high, zDomain);

  if (highResult.success) {
    return highResult;
  }

  let best = lowResult;
  let lo = low;
  let hi = high;

  for (let index = 0; index < 14; index += 1) {
    const mid = (lo + hi) / 2;
    const midResult = packStageAtScale(stageDeals, stage, mid, zDomain);

    if (midResult.success) {
      best = midResult;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return best;
}

function buildZDomain(deals: readonly SfOpportunityPipelineDeal[]): ZDomain {
  if (deals.length === 0) {
    return {
      zMin: 25_000,
      zMax: 500_000,
    };
  }

  const values = deals.map((deal) => Math.max(0, deal.amount));
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max <= min) {
    const padded = Math.max(5_000, max || 100_000);
    return {
      zMin: Math.max(0, padded - 5_000),
      zMax: padded + 5_000,
    };
  }

  return {
    zMin: Math.max(0, Math.floor(min / 5_000) * 5_000),
    zMax: Math.max(5_000, Math.ceil(max / 5_000) * 5_000),
  };
}

export function buildDealFilterBounds(deals: readonly SfOpportunityPipelineDeal[]): DealFilterBounds {
  if (deals.length === 0) {
    return DEFAULT_FILTER_BOUNDS;
  }

  return {
    maxDealSize: roundUp(
      deals.reduce((max, deal) => Math.max(max, deal.amount), 0),
      50_000,
      DEFAULT_FILTER_BOUNDS.maxDealSize,
    ),
    maxProbability: 100,
    maxDaysOpen: roundUp(
      deals.reduce((max, deal) => Math.max(max, deal.daysOpen), 0),
      10,
      DEFAULT_FILTER_BOUNDS.maxDaysOpen,
    ),
    maxTimeOpen: roundUp(
      deals.reduce((max, deal) => Math.max(max, deal.timeOpen), 0),
      10,
      DEFAULT_FILTER_BOUNDS.maxTimeOpen,
    ),
    maxLastActivityDays: roundUp(
      deals.reduce((max, deal) => Math.max(max, deal.lastActivityDays ?? 0), 0),
      5,
      DEFAULT_FILTER_BOUNDS.maxLastActivityDays,
    ),
  };
}

export function createDefaultRangeFilters(bounds: DealFilterBounds): RangeFilterState {
  return {
    dealSize: [0, bounds.maxDealSize],
    probability: [0, bounds.maxProbability],
    daysOpen: [0, bounds.maxDaysOpen],
    timeOpen: [0, bounds.maxTimeOpen],
    lastActivityDays: [0, bounds.maxLastActivityDays],
  };
}

export function clampRangeFilters(
  current: RangeFilterState,
  bounds: DealFilterBounds,
): RangeFilterState {
  return {
    dealSize: [Math.max(0, current.dealSize[0]), Math.min(bounds.maxDealSize, current.dealSize[1])],
    probability: [Math.max(0, current.probability[0]), Math.min(bounds.maxProbability, current.probability[1])],
    daysOpen: [Math.max(0, current.daysOpen[0]), Math.min(bounds.maxDaysOpen, current.daysOpen[1])],
    timeOpen: [Math.max(0, current.timeOpen[0]), Math.min(bounds.maxTimeOpen, current.timeOpen[1])],
    lastActivityDays: [
      Math.max(0, current.lastActivityDays[0]),
      Math.min(bounds.maxLastActivityDays, current.lastActivityDays[1]),
    ],
  };
}

export function formatCompactCurrency(value: number): string {
  if (value <= 0) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function stageBadgeClass(stage: StageName): string {
  if (stage === "Scoping") return "sp-stage-scoping";
  if (stage === "Proposal") return "sp-stage-proposal";
  if (stage === "Committed") return "sp-stage-committed";
  return "sp-stage-won";
}

export function sortRange(values: number[]): [number, number] {
  const [left = 0, right = 0] = values;
  return left <= right ? [left, right] : [right, left];
}

export function valueInRange(value: number, [min, max]: [number, number]): boolean {
  return value >= min && value <= max;
}

export function buildCloseQuarterOptions(
  deals: readonly SfOpportunityPipelineDeal[],
): string[] {
  return Array.from(
    new Set(
      deals
        .map((deal) => deal.closeQuarter)
        .filter((quarter) => quarter && quarter !== "Unknown"),
    ),
  ).sort(compareQuarterLabels);
}

export function buildFunnelPacking(
  deals: readonly SfOpportunityPipelineDeal[],
): FunnelPackingLayout {
  const zDomain = buildZDomain(deals);
  const points: BubblePoint[] = [];
  const stageSizes = {} as Record<StageName, SizeModel>;

  for (const stage of STAGE_NAMES) {
    const stageDeals = deals.filter((deal) => deal.stageBucket === stage);
    const solved = solveStagePacking(stageDeals, stage, zDomain);
    points.push(...solved.points);
    stageSizes[stage] = solved.size;
  }

  const bubbleMinSize = `${(
    Math.min(...STAGE_NAMES.map((stage) => stageSizes[stage].minFraction)) * 100
  ).toFixed(4)}%`;
  const bubbleMaxSize = `${(
    Math.max(...STAGE_NAMES.map((stage) => stageSizes[stage].maxFraction)) * 100
  ).toFixed(4)}%`;

  return {
    points,
    stageBubbleSizes: {
      Scoping: {
        minSize: `${(stageSizes.Scoping.minFraction * 100).toFixed(4)}%`,
        maxSize: `${(stageSizes.Scoping.maxFraction * 100).toFixed(4)}%`,
        zMin: zDomain.zMin,
        zMax: zDomain.zMax,
      },
      Proposal: {
        minSize: `${(stageSizes.Proposal.minFraction * 100).toFixed(4)}%`,
        maxSize: `${(stageSizes.Proposal.maxFraction * 100).toFixed(4)}%`,
        zMin: zDomain.zMin,
        zMax: zDomain.zMax,
      },
      Committed: {
        minSize: `${(stageSizes.Committed.minFraction * 100).toFixed(4)}%`,
        maxSize: `${(stageSizes.Committed.maxFraction * 100).toFixed(4)}%`,
        zMin: zDomain.zMin,
        zMax: zDomain.zMax,
      },
      Won: {
        minSize: `${(stageSizes.Won.minFraction * 100).toFixed(4)}%`,
        maxSize: `${(stageSizes.Won.maxFraction * 100).toFixed(4)}%`,
        zMin: zDomain.zMin,
        zMax: zDomain.zMax,
      },
    },
    bubbleMinSize,
    bubbleMaxSize,
    zMin: zDomain.zMin,
    zMax: zDomain.zMax,
  };
}

export const FUNNEL_STAGE_COLORS: Record<StageName, string> = {
  Scoping: chartColor(0),
  Proposal: chartColor(2),
  Committed: chartColor(1),
  Won: "#10b981",
};
