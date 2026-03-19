import Highcharts from "highcharts/esm/highcharts.src.js";

// Bump this key whenever new modules are added to force a fresh load
const MODULES_FLAG = "__hc_modules_v3__";

const globalWithFlag = globalThis as typeof globalThis & {
  [MODULES_FLAG]?: boolean;
};

export const ensureHighchartsModules = async (): Promise<void> => {
  if (typeof window === "undefined" || globalWithFlag[MODULES_FLAG]) {
    return;
  }

  await Promise.all([
    import("highcharts/esm/highcharts-more.src.js"),
    import("highcharts/esm/modules/funnel.src.js"),
  ]);

  globalWithFlag[MODULES_FLAG] = true;
};

export default Highcharts;
