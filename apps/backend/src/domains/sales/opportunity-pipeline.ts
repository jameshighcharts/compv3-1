import {
  sfOpportunityPipelineResponseSchema,
  type PipelineClosedRange,
  type PipelineStageBucket,
  type SfOpportunityPipelineResponse,
} from "@contracts/sales";

import { querySalesforce } from "../../platform/salesforce/client";
import { formatDateOnlyUtc } from "./revenue-window";

type CacheEntry<T> = {
  payload: T;
  expiresAt: number;
};

type OpportunityPipelineServiceResult<T> = {
  payload: T;
  cacheHit: boolean;
};

type OpportunityPipelineOptions = {
  closedRange?: PipelineClosedRange;
};

type OpportunityPipelineRecord = {
  Id?: unknown;
  Name?: unknown;
  Account?: {
    Name?: unknown;
  } | null;
  OwnerId?: unknown;
  Owner?: {
    Name?: unknown;
  } | null;
  Amount?: unknown;
  Probability?: unknown;
  StageName?: unknown;
  Stage_Status__c?: unknown;
  ForecastCategoryName?: unknown;
  CloseDate?: unknown;
  QuoteExpirationDate__c?: unknown;
  CreatedDate?: unknown;
  Days_since_open__c?: unknown;
  Time_Open__c?: unknown;
  FiscalQuarter?: unknown;
  IsClosed?: unknown;
  IsWon?: unknown;
  LastActivityDate?: unknown;
  LossReason__c?: unknown;
  WooOrderId__c?: unknown;
  w_Probable_company_name_o__c?: unknown;
};

const CORE_PIPELINE_QUERY_FIELDS = [
  "Id",
  "Name",
  "Account.Name",
  "OwnerId",
  "Owner.Name",
  "Amount",
  "Probability",
  "StageName",
  "ForecastCategoryName",
  "CloseDate",
  "CreatedDate",
  "FiscalQuarter",
  "IsClosed",
  "IsWon",
  "LastActivityDate",
] as const;

const OPTIONAL_PIPELINE_QUERY_FIELDS = [
  "Stage_Status__c",
  "QuoteExpirationDate__c",
  "LossReason__c",
  "WooOrderId__c",
  "w_Probable_company_name_o__c",
] as const;

const CACHE_TTL_MS = Number(process.env.SF_PIPELINE_CACHE_TTL_MS ?? 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = 12;
const DEFAULT_CLOSED_RANGE: PipelineClosedRange = "ytd";

const opportunityPipelineCache = new Map<string, CacheEntry<SfOpportunityPipelineResponse>>();
const opportunityPipelineInFlight = new Map<string, Promise<SfOpportunityPipelineResponse>>();
const unsupportedOpportunityFields = new Set<string>();

const startOfUtcYear = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), 0, 1));

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInteger = (value: unknown): number => Math.trunc(toNumber(value));

const toBoolean = (value: unknown): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const toDateOnly = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const dateOnly = value.trim().slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
};

const normalizeLabel = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const includesAny = (value: string, tokens: readonly string[]): boolean =>
  tokens.some((token) => value.includes(token));

const toQuarterLabel = (
  closeDate: string | null,
  fiscalQuarter: number,
): string => {
  if (fiscalQuarter >= 1 && fiscalQuarter <= 4 && closeDate) {
    return `Q${fiscalQuarter} ${closeDate.slice(0, 4)}`;
  }

  if (!closeDate) {
    return "Unknown";
  }

  const month = Number(closeDate.slice(5, 7));

  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return "Unknown";
  }

  return `Q${Math.floor((month - 1) / 3) + 1} ${closeDate.slice(0, 4)}`;
};

const diffDateOnly = (fromDate: string, toDate: string): number => {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);

  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
};

const resolveStageBucket = (record: OpportunityPipelineRecord): PipelineStageBucket => {
  if (toBoolean(record.IsWon)) {
    return "Won";
  }

  const normalized = normalizeLabel(
    [
      cleanText(record.Stage_Status__c),
      cleanText(record.StageName),
      cleanText(record.ForecastCategoryName),
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (
    includesAny(normalized, [
      "commit",
      "committed",
      "contract",
      "legal",
      "signature",
      "signed",
      "verbal",
      "procurement",
      "purchase order",
      "decision",
    ])
  ) {
    return "Committed";
  }

  if (
    includesAny(normalized, [
      "proposal",
      "quote",
      "pricing",
      "negotiation",
      "review",
      "business case",
      "rfp",
    ])
  ) {
    return "Proposal";
  }

  if (
    includesAny(normalized, [
      "scoping",
      "scope",
      "discovery",
      "discover",
      "qualif",
      "demo",
      "evaluation",
      "prospect",
      "lead",
      "contact",
      "new",
      "open",
    ])
  ) {
    return "Scoping";
  }

  const probability = toNumber(record.Probability);

  if (probability >= 70) {
    return "Committed";
  }

  if (probability >= 40) {
    return "Proposal";
  }

  return "Scoping";
};

const buildOpportunityPipelineQuery = (
  now: Date,
  fields: readonly string[],
  closedRange: PipelineClosedRange,
): string => {
  const asOfDate = formatDateOnlyUtc(now);
  const ytdClosedFrom = formatDateOnlyUtc(startOfUtcYear(now));
  const closedRangeClause =
    closedRange === "all"
      ? "(IsClosed = false OR IsClosed = true)"
      : `(IsClosed = false OR (IsClosed = true AND CloseDate >= ${ytdClosedFrom} AND CloseDate <= ${asOfDate}))`;

  return [
    `SELECT ${fields.join(", ")}`,
    "FROM Opportunity",
    "WHERE IsDeleted = false",
    "AND Amount != null",
    "AND StageName != null",
    `AND ${closedRangeClause}`,
    "ORDER BY IsClosed ASC, IsWon DESC, CloseDate DESC NULLS LAST, Amount DESC NULLS LAST",
  ].join(" ");
};

const extractMissingFieldName = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/No such column '([^']+)'/i);

  return match?.[1] ?? null;
};

const buildPayload = (
  rows: OpportunityPipelineRecord[],
  now: Date,
): SfOpportunityPipelineResponse => {
  const asOfDate = formatDateOnlyUtc(now);

  return sfOpportunityPipelineResponseSchema.parse({
    asOfDate,
    deals: rows.map((row) => {
      const id = cleanText(row.Id);
      const dealName = cleanText(row.Name) || id || "Unnamed opportunity";
      const closeDate = toDateOnly(row.CloseDate);
      const createdDate =
        toDateOnly(row.CreatedDate) ??
        closeDate ??
        asOfDate;
      const expectedCloseDate = toDateOnly(row.QuoteExpirationDate__c) ?? closeDate;
      const daysOpenRaw = Math.round(toNumber(row.Days_since_open__c));
      const daysOpen = daysOpenRaw > 0 ? daysOpenRaw : diffDateOnly(createdDate, asOfDate);
      const timeOpenRaw = Math.round(toNumber(row.Time_Open__c));
      const isClosed = toBoolean(row.IsClosed);
      const timeOpen =
        timeOpenRaw > 0
          ? timeOpenRaw
          : isClosed && closeDate
            ? diffDateOnly(createdDate, closeDate)
            : daysOpen;
      const company =
        cleanText(row.Account?.Name) ||
        cleanText(row.w_Probable_company_name_o__c) ||
        dealName;
      const lastActivityDate = toDateOnly(row.LastActivityDate);

      return {
        id,
        dealName,
        company,
        ownerId: cleanText(row.OwnerId) || null,
        ownerName: cleanText(row.Owner?.Name) || "Unassigned",
        amount: Math.round(toNumber(row.Amount)),
        probability: Math.max(0, Math.min(100, Math.round(toNumber(row.Probability)))),
        stageName: cleanText(row.StageName) || "Unknown",
        stageBucket: resolveStageBucket(row),
        stageStatus: cleanText(row.Stage_Status__c) || null,
        forecastCategory: cleanText(row.ForecastCategoryName) || null,
        createdDate,
        closeDate,
        expectedCloseDate,
        closeQuarter: toQuarterLabel(closeDate, toInteger(row.FiscalQuarter)),
        daysOpen,
        timeOpen,
        isClosed,
        isWon: toBoolean(row.IsWon),
        wooOrderId: cleanText(row.WooOrderId__c) || null,
        lastActivityDate,
        lastActivityDays: lastActivityDate ? diffDateOnly(lastActivityDate, asOfDate) : null,
        lossReason: cleanText(row.LossReason__c) || null,
      };
    }),
  });
};

const readCache = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | null => {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.payload;
};

const writeCache = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  payload: T,
): void => {
  cache.set(key, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (cache.size <= CACHE_MAX_ENTRIES) {
    return;
  }

  const oldestKey = cache.keys().next().value;

  if (typeof oldestKey === "string") {
    cache.delete(oldestKey);
  }
};

const loadOpportunityPipelinePayload = async (
  now: Date,
  closedRange: PipelineClosedRange,
): Promise<SfOpportunityPipelineResponse> => {
  const fields = [
    ...CORE_PIPELINE_QUERY_FIELDS,
    ...OPTIONAL_PIPELINE_QUERY_FIELDS.filter((field) => !unsupportedOpportunityFields.has(field)),
  ] as string[];

  while (true) {
    try {
      const rows = await querySalesforce<OpportunityPipelineRecord>(
        buildOpportunityPipelineQuery(now, fields, closedRange),
      );

      return buildPayload(rows, now);
    } catch (error) {
      const missingField = extractMissingFieldName(error);

      if (!missingField) {
        throw error;
      }

      const fieldIndex = fields.indexOf(missingField);

      if (fieldIndex === -1 || CORE_PIPELINE_QUERY_FIELDS.includes(missingField as (typeof CORE_PIPELINE_QUERY_FIELDS)[number])) {
        throw error;
      }

      fields.splice(fieldIndex, 1);
      unsupportedOpportunityFields.add(missingField);

      console.warn(
        `Sales pipeline query retrying without unsupported Opportunity field "${missingField}".`,
      );
    }
  }
};

export const getOpportunityPipelinePayload = async (
  now: Date = new Date(),
  options: OpportunityPipelineOptions = {},
): Promise<OpportunityPipelineServiceResult<SfOpportunityPipelineResponse>> => {
  const closedRange = options.closedRange ?? DEFAULT_CLOSED_RANGE;
  const cacheKey = `opportunity-pipeline:${formatDateOnlyUtc(now)}:${closedRange}`;
  const cached = readCache(opportunityPipelineCache, cacheKey);

  if (cached) {
    return {
      payload: cached,
      cacheHit: true,
    };
  }

  const running = opportunityPipelineInFlight.get(cacheKey);

  if (running) {
    return {
      payload: await running,
      cacheHit: true,
    };
  }

  const task = loadOpportunityPipelinePayload(now, closedRange)
    .then((payload) => {
      writeCache(opportunityPipelineCache, cacheKey, payload);
      return payload;
    })
    .finally(() => {
      opportunityPipelineInFlight.delete(cacheKey);
    });

  opportunityPipelineInFlight.set(cacheKey, task);

  return {
    payload: await task,
    cacheHit: false,
  };
};
