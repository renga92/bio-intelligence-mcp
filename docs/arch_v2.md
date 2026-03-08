# BioPharma Sentinel — AI Coding Agent Upgrade Manifest
### Target: 5/5 Stars as a Life Sciences Intelligence Platform

> **Current Rating: 2/5** — Conceptually strong, but 4 of 8 tools are broken, analytics are hardcoded, and critical intelligence layers are missing. This document is a complete instruction set for an AI coding agent to bring the platform to production-grade quality.

---

## 🔴 CRITICAL BUGS — Fix These First

### BUG-001: `filter.phases` is an invalid ClinicalTrials.gov v2 parameter
**Affects:** `get_pipeline`, `get_conversion_velocity`, `get_success_rates` (all throw `400 Bad Request`)

**Root Cause:** The ClinicalTrials.gov v2 API does NOT accept `filter.phases`. The correct parameter is `aggFilters` with a specific syntax.

**Fix in `src/index.ts`:** Replace every occurrence of `filter.phases=PHASE3` (and any pipe-joined variants) with the correct `aggFilters` syntax:

```typescript
// ❌ WRONG — causes 400 Bad Request
`&filter.phases=PHASE3`
`&filter.phases=PHASE1|PHASE3`

// ✅ CORRECT — ClinicalTrials.gov v2 aggFilters syntax
`&aggFilters=phase:3`           // Phase 3 only
`&aggFilters=phase:1 3`         // Phase 1 AND Phase 3
`&aggFilters=phase:1 2 3 4`     // All phases
```

**Phase number mapping to use:**
```typescript
const PHASE_FILTER_MAP: Record<string, string> = {
  "PHASE1": "1",
  "PHASE2": "2",
  "PHASE3": "3",
  "PHASE4": "4",
  "NA": "0",  // Early phase / N/A
};

// Build aggFilters string from the phases array:
if (phases && phases.length > 0) {
  const nums = phases.map((p: string) => PHASE_FILTER_MAP[p]).filter(Boolean).join(" ");
  url += `&aggFilters=phase:${nums}`;
}
```

**Apply this fix in all three broken tools:**
- In `get_pipeline`: Change `filter.phases=PHASE3` → `aggFilters=phase:3`
- In `get_conversion_velocity`: Change `filter.phases=PHASE1|PHASE3` → `aggFilters=phase:1 3`
- In `get_success_rates`: Change `filter.phases=PHASE3` → `aggFilters=phase:3`

---

### BUG-002: `get_competitive_landscape` returns "Unknown: 100 trials" for every condition

**Root Cause:** The sponsor name is being read from the wrong module path. In ClinicalTrials.gov v2 API, the lead sponsor lives in `sponsorCollaboratorsModule`, NOT in `identificationModule`.

**Fix in `src/index.ts`:**

```typescript
// ❌ WRONG path — identificationModule does NOT contain leadSponsor in v2
const name = s.protocolSection?.identificationModule?.leadSponsor?.name || "Unknown";

// ✅ CORRECT path for ClinicalTrials.gov v2 API
const name = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name 
          || s.protocolSection?.identificationModule?.organization?.name 
          || "Unknown";
```

Apply the same fix to `get_pipeline` where it aggregates sponsors, and anywhere else in the codebase that reads `identificationModule.leadSponsor`.

---

### BUG-003: `get_market_impact` uses `Math.random()` — produces non-deterministic fake data

**Root Cause:** The market impact tool contains `const simulatedImpact = (Math.random() * 15 - 5).toFixed(2);` which is a placeholder returning random noise, not real intelligence.

**Fix:** Integrate the **Alpha Vantage API** (free tier available) for real stock data:

```typescript
// Add ALPHA_VANTAGE_API_KEY to environment variables
const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Replace the simulation block with:
if (!AV_KEY) {
  // Graceful degradation when no API key is set
  return {
    content: [{
      type: "text",
      text: `Market Impact for ${company} (${ticker})\nTrial: ${nctId}\nMilestone Date: ${milestoneDate}\n\n⚠️ Set ALPHA_VANTAGE_API_KEY in environment to enable live stock correlation.\nTicker: ${ticker}`
    }]
  };
}

// Fetch price on milestone date and T+30
const fromDate = milestoneDate;
const toDate = addDays(milestoneDate, 30); // implement addDays helper

const priceUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${AV_KEY}&outputsize=compact`;
const priceRes = await fetch(priceUrl);
const priceData = await priceRes.json();
const timeSeries = priceData["Time Series (Daily)"];

// Extract prices around the milestone and calculate real delta
const milestonePrice = timeSeries[milestoneDate]?.["4. close"];
const t30Price = timeSeries[toDate]?.["4. close"] || Object.values(timeSeries)[30]?.["4. close"];
const realDelta = milestonePrice && t30Price
  ? (((parseFloat(t30Price) - parseFloat(milestonePrice)) / parseFloat(milestonePrice)) * 100).toFixed(2)
  : "N/A";
```

---

### BUG-004: `get_pharma_olympics` and `get_leaderboard` velocity data is fully hardcoded

**Root Cause:** All Pharma Olympics medal table data (`"Moderna: 4.2y"`, `"Pfizer: 142 drugs"`, etc.) is hardcoded static strings from 2026, not derived from real trial data.

**Fix:** Make the static tables clearly labeled as **industry benchmarks**, and wire `get_leaderboard` with `metric: "pipeline_size"` to real live data (it already calls the API — just ensure BUG-001 is fixed first). For velocity, use the output of `get_conversion_velocity` per company. Create a `buildLiveOlympics()` async function that:

1. Calls `get_pipeline` for the top 10 companies in parallel
2. Calls `get_conversion_velocity` for each
3. Calls `get_success_rates` for each
4. Aggregates into a ranked table with real numbers
5. Falls back to labeled static benchmarks if API is slow or unavailable

---

### BUG-005: Phase filter in `search_trials` is silently ignored when passed

**Root Cause:** The `phases` array parameter is passed by the user and the code builds `filter.phases=...` which the API rejects with 400. This means every `search_trials` call with phase filtering silently fails or returns unfiltered results.

**Fix:** Apply the same `aggFilters=phase:N` fix from BUG-001 to `search_trials`.

```typescript
// In search_trials handler
if (phases && phases.length > 0) {
  const nums = phases.map((p: string) => PHASE_FILTER_MAP[p]).filter(Boolean).join(" ");
  url += `&aggFilters=phase:${nums}`;
}
```

---

## 🟡 ARCHITECTURE IMPROVEMENTS

### ARCH-001: Add Pagination Support to `get_competitive_landscape`

Currently it fetches only 100 results and applies `slice(0, 10)`. For crowded conditions like "lung cancer" or "diabetes," there are 1000+ trials. Without pagination, the market density rating ("Low / Moderate / High") is meaningless.

**Fix:** Implement a multi-page fetch:

```typescript
async function fetchAllSponsors(condition: string): Promise<Record<string, number>> {
  const sponsors: Record<string, number> = {};
  let nextPageToken: string | null = null;
  let pages = 0;
  const MAX_PAGES = 10; // Cap at 1000 results (10 × 100)

  do {
    let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.sponsorCollaboratorsModule`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    data.studies.forEach((s: any) => {
      const name = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "Unknown";
      sponsors[name] = (sponsors[name] || 0) + 1;
    });

    nextPageToken = data.nextPageToken || null;
    pages++;
  } while (nextPageToken && pages < MAX_PAGES);

  return sponsors;
}
```

Update the density thresholds to reflect real data:
```typescript
const totalSponsors = Object.keys(sponsors).length;
const density = totalSponsors > 50 ? "High (Crowded)" : totalSponsors > 15 ? "Moderate" : "Low (White Space)";
```

---

### ARCH-002: Add `fields` Query Parameter for Bandwidth Optimization

The ClinicalTrials.gov v2 API supports `fields=` to return only specific fields, dramatically reducing payload size. Currently every query downloads the full study JSON (50–200KB per study).

**Fix:** Add `&fields=` projections to every query:

```typescript
// For search_trials — only need summary fields
const SEARCH_FIELDS = "protocolSection.identificationModule,protocolSection.statusModule,protocolSection.designModule,protocolSection.conditionsModule,protocolSection.sponsorCollaboratorsModule";
url += `&fields=${SEARCH_FIELDS}`;

// For competitive landscape — only need sponsor field
url += `&fields=protocolSection.sponsorCollaboratorsModule`;

// For pipeline — need conditions + phases + sponsor
url += `&fields=protocolSection.conditionsModule,protocolSection.designModule,protocolSection.sponsorCollaboratorsModule`;
```

This reduces token consumption by an additional 60–80% on top of the existing server-side summarization.

---

### ARCH-003: Implement Rate Limiting and Retry Logic

ClinicalTrials.gov has undocumented rate limits. The `get_leaderboard` tool fires 10 parallel `fetch()` calls simultaneously which can trigger throttling.

**Fix:** Add a `fetchWithRetry` wrapper:

```typescript
async function fetchWithRetry(url: string, retries = 3, delayMs = 500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status === 429) { // Rate limited
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
      continue;
    }
    const errorText = await res.text();
    throw new Error(`ClinicalTrials API error: ${res.status} ${res.statusText} - ${errorText}`);
  }
  throw new Error(`Failed after ${retries} retries`);
}
```

Replace all bare `fetch()` calls in the handler with `fetchWithRetry()`. Also rate-limit parallel calls in `get_leaderboard` using a `pLimit` or sequential batching approach:

```typescript
// Process companies in batches of 3 instead of 10 in parallel
const results = [];
for (let i = 0; i < companies.length; i += 3) {
  const batch = companies.slice(i, i + 3);
  const batchResults = await Promise.all(batch.map(fetchCompanyData));
  results.push(...batchResults);
  if (i + 3 < companies.length) await new Promise(r => setTimeout(r, 300));
}
```

---

### ARCH-004: Add Environment Variable Configuration

The server has hardcoded API key logic but no `.env` support. Add `dotenv` and a config module:

```bash
pnpm add dotenv
```

Create `src/config.ts`:
```typescript
import dotenv from "dotenv";
dotenv.config();

export const config = {
  alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || null,
  finnhubKey: process.env.FINNHUB_API_KEY || null,
  maxPagesPerQuery: parseInt(process.env.MAX_PAGES || "5"),
  rateLimitDelayMs: parseInt(process.env.RATE_LIMIT_DELAY_MS || "300"),
};
```

Create `.env.example`:
```
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
MAX_PAGES=5
RATE_LIMIT_DELAY_MS=300
```

---

## 🟢 NEW FEATURES — Required for 5/5 Intelligence Platform Rating

### FEAT-001: Add `get_geographic_intelligence` Tool

**Why:** Clinical trial geography is critical for CRO selection, market entry, and regulatory strategy. Currently zero geographic visibility.

**Tool Definition:**
```typescript
export const GET_GEOGRAPHIC_INTELLIGENCE_TOOL: Tool = {
  name: "get_geographic_intelligence",
  description: "Map the geographic distribution of trials for a condition — which countries, sites, and regions are most active",
  inputSchema: {
    type: "object",
    properties: {
      condition: { type: "string", description: "Medical condition or drug name" },
      phase: { type: "string", enum: ["PHASE1", "PHASE2", "PHASE3", "PHASE4"], description: "Optional phase filter" }
    },
    required: ["condition"]
  }
};
```

**Implementation:** Fetch trials, extract `protocolSection.contactsLocationsModule.locations[].country`, aggregate by country, and return a ranked list with regional groupings (North America, EU, Asia-Pacific, etc.).

---

### FEAT-002: Add `get_modality_breakdown` Tool

**Why:** Knowing whether a therapeutic area is dominated by small molecules, biologics, gene therapy, or cell therapy is fundamental to competitive positioning.

**Tool Definition:**
```typescript
export const GET_MODALITY_BREAKDOWN_TOOL: Tool = {
  name: "get_modality_breakdown",
  description: "Analyze the therapeutic modality mix (small molecule, biologic, gene therapy, cell therapy) in a disease area",
  inputSchema: {
    type: "object",
    properties: {
      condition: { type: "string", description: "Medical condition to analyze" }
    },
    required: ["condition"]
  }
};
```

**Implementation:** Fetch trials and extract `protocolSection.armsInterventionsModule.interventions[].type`. Map intervention types to modality categories and return breakdown percentages.

---

### FEAT-003: Add `get_enrollment_intelligence` Tool

**Why:** Enrollment rates, trial duration, and dropout patterns are key signals for predicting trial success and identifying operational white space.

**Tool Definition:**
```typescript
export const GET_ENROLLMENT_INTELLIGENCE_TOOL: Tool = {
  name: "get_enrollment_intelligence",
  description: "Analyze enrollment patterns, trial duration benchmarks, and site density for a condition or company",
  inputSchema: {
    type: "object",
    properties: {
      condition: { type: "string" },
      company: { type: "string" }
    }
  }
};
```

**Implementation:** Extract `enrollmentInfo.count`, `startDateStruct.date`, `completionDateStruct.date`, and `contactsLocationsModule.locations` to calculate:
- Average enrollment per trial
- Average trial duration in months
- Number of sites per trial
- Enrollment velocity (participants/month)

---

### FEAT-004: Add `get_endpoint_landscape` Tool

**Why:** Understanding primary endpoints used in a disease area (OS, PFS, HbA1c, MACE, etc.) reveals regulatory preferences and trial design trends.

**Tool Definition:**
```typescript
export const GET_ENDPOINT_LANDSCAPE_TOOL: Tool = {
  name: "get_endpoint_landscape",
  description: "Identify the most common primary endpoints and outcome measures used in trials for a condition",
  inputSchema: {
    type: "object",
    properties: {
      condition: { type: "string", description: "Disease area to analyze" },
      phase: { type: "string", enum: ["PHASE2", "PHASE3"] }
    },
    required: ["condition"]
  }
};
```

**Implementation:** Extract `protocolSection.outcomesModule.primaryOutcomes[].measure`, normalize and cluster by keyword (survival, response rate, biomarker, etc.), and return ranked frequency.

---

### FEAT-005: Add `get_regulatory_landscape` Tool

**Why:** Linking trial activity to regulatory milestones (FDA approvals, breakthrough designations) is the core of pharma competitive intelligence.

**Tool Definition:**
```typescript
export const GET_REGULATORY_LANDSCAPE_TOOL: Tool = {
  name: "get_regulatory_landscape",
  description: "Cross-reference trial activity with FDA approval status using OpenFDA API",
  inputSchema: {
    type: "object",
    properties: {
      drug: { type: "string", description: "Drug or active ingredient name" },
      company: { type: "string", description: "Optional sponsor company name" }
    },
    required: ["drug"]
  }
};
```

**Implementation:** Call the **OpenFDA API** (free, no key required):
```typescript
const fdaUrl = `https://api.fda.gov/drug/drugsfda.json?search=active_ingredients.name:"${encodeURIComponent(drug)}"&limit=10`;
```
Return: approval date, application number, indication, sponsor, whether it has Breakthrough Therapy / Fast Track / Orphan Drug designation.

---

### FEAT-006: Add `get_company_deep_dive` Tool (Compound Intelligence)

**Why:** Analysts need a single command to get a 360° view of a company — not scattered across 4 separate tool calls.

**Tool Definition:**
```typescript
export const GET_COMPANY_DEEP_DIVE_TOOL: Tool = {
  name: "get_company_deep_dive",
  description: "Full 360° intelligence report on a pharma company: pipeline, velocity, success rates, therapeutic focus, and geographic footprint",
  inputSchema: {
    type: "object",
    properties: {
      company: { type: "string" }
    },
    required: ["company"]
  }
};
```

**Implementation:** This tool orchestrates multiple sub-queries in parallel:
1. Pipeline breadth (Phase 3 trial count, by condition)
2. Conversion velocity (P1→P3 timeline)
3. Geographic footprint (trial site countries)
4. Therapeutic area focus (conditions ranked by trial count)
5. Success rate estimate (completed vs terminated Phase 3 ratio)

Returns a structured intelligence summary.

---

### FEAT-007: Add `compare_companies` Tool

**Why:** Head-to-head competitive comparison is the most common analyst workflow and currently requires manual chaining of 4 tool calls per company.

**Tool Definition:**
```typescript
export const COMPARE_COMPANIES_TOOL: Tool = {
  name: "compare_companies",
  description: "Head-to-head competitive comparison of two pharma companies across pipeline, velocity, and success metrics",
  inputSchema: {
    type: "object",
    properties: {
      company_a: { type: "string" },
      company_b: { type: "string" },
      condition: { type: "string", description: "Optional: restrict comparison to a specific therapeutic area" }
    },
    required: ["company_a", "company_b"]
  }
};
```

---

### FEAT-008: Add `get_trial_timeline` Tool

**Why:** Visualizing a single trial's lifecycle (enrollment start → primary completion → results posting) is critical for due diligence and event-driven investing.

**Tool Definition:**
```typescript
export const GET_TRIAL_TIMELINE_TOOL: Tool = {
  name: "get_trial_timeline",
  description: "Construct a milestone timeline for a specific trial from start to completion",
  inputSchema: {
    type: "object",
    properties: {
      nctId: { type: "string" }
    },
    required: ["nctId"]
  }
};
```

---

## 🔵 TEST SUITE FIXES

### TEST-001: Tests mock `filter.phases` behavior — must update after BUG-001 fix

After fixing the `aggFilters` parameter, update `tests/server.test.ts` to assert on the new URL format:

```typescript
// ❌ Old assertion (will fail after fix)
expect(calledUrl).toContain("filter.phases=PHASE3");

// ✅ New assertion
expect(calledUrl).toContain("aggFilters=phase:3");
```

---

### TEST-002: Add integration-level tests for the new tools

Add a new test file `tests/new_tools.test.ts` covering:
- `get_geographic_intelligence`: mock response returns locations array, assert countries are aggregated
- `get_modality_breakdown`: mock interventions array, assert modality categories are computed
- `get_regulatory_landscape`: mock OpenFDA response, assert NDA number and approval date appear in output
- `compare_companies`: mock both company queries, assert comparison table is returned
- `fetchWithRetry`: mock 429 then 200 response, assert retry logic works

---

### TEST-003: Add test for correct sponsor path (BUG-002 regression guard)

```typescript
it("should read sponsor from sponsorCollaboratorsModule, not identificationModule", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      studies: [{
        protocolSection: {
          sponsorCollaboratorsModule: { leadSponsor: { name: "Novo Nordisk" } },
          identificationModule: {} // intentionally empty — old code would return "Unknown"
        }
      }]
    })
  });
  const result = await server.handleToolCall("get_competitive_landscape", { condition: "GLP-1" });
  expect(result.content[0].text).toContain("Novo Nordisk");
  expect(result.content[0].text).not.toContain("Unknown: 1");
});
```

---

## 📦 DEPENDENCY UPDATES

```bash
# Add dotenv for environment configuration
pnpm add dotenv

# Add p-limit for controlled concurrency in get_leaderboard
pnpm add p-limit

# Update devDependencies
pnpm add -D @types/node@latest typescript@latest
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "verify": "node tests/verify_server.js"
  }
}
```

---

## 📁 FINAL FILE STRUCTURE (TARGET STATE)

```
clinicaltrials-mcp-server/
├── src/
│   ├── index.ts                  # Main server (all handlers)
│   ├── config.ts                 # NEW: env config module
│   ├── tools.ts                  # NEW: all Tool definitions extracted here
│   ├── utils/
│   │   ├── fetchWithRetry.ts     # NEW: rate-limit aware fetch wrapper
│   │   ├── phaseFilter.ts        # NEW: aggFilters builder utility
│   │   └── ticker.ts             # NEW: company → stock ticker lookup
│   └── handlers/                 # NEW: one file per tool handler
│       ├── searchTrials.ts
│       ├── getPipeline.ts
│       ├── getConversionVelocity.ts
│       ├── getMarketImpact.ts
│       ├── getSuccessRates.ts
│       ├── getCompetitiveLandscape.ts
│       ├── getPharmaOlympics.ts
│       ├── getLeaderboard.ts
│       ├── getGeographicIntelligence.ts  # NEW
│       ├── getModalityBreakdown.ts       # NEW
│       ├── getEnrollmentIntelligence.ts  # NEW
│       ├── getEndpointLandscape.ts       # NEW
│       ├── getRegulatoryLandscape.ts     # NEW
│       ├── getCompanyDeepDive.ts         # NEW
│       ├── compareCompanies.ts           # NEW
│       └── getTrialTimeline.ts           # NEW
├── tests/
│   ├── server.test.ts            # Updated with new assertions
│   ├── new_tools.test.ts         # NEW: tests for new tools
│   ├── utils.test.ts             # NEW: tests for utilities
│   └── verify_server.js
├── .env.example                  # NEW
├── README.md                     # Update with new tools
├── package.json
└── tsconfig.json
```

---

## 🏆 FEATURE COMPLETENESS SCORECARD (TARGET)

| Capability | Before | After | Status |
|---|---|---|---|
| Trial Search (basic) | ✅ Working | ✅ + Phase filter fixed | Fixed |
| Trial Search (phase filter) | ❌ 400 Error | ✅ aggFilters fix | Fixed |
| Trial Detail Lookup | ✅ Working | ✅ + fields projection | Improved |
| Pipeline Analysis | ❌ 400 Error | ✅ Fixed + paginated | Fixed |
| Conversion Velocity | ❌ 400 Error | ✅ Fixed + real data | Fixed |
| Market Impact | ⚠️ Random noise | ✅ Alpha Vantage real data | Fixed |
| Success Rates | ❌ 400 Error | ✅ Fixed + real calculation | Fixed |
| Competitive Landscape | ❌ All "Unknown" | ✅ Correct sponsor path | Fixed |
| Pharma Olympics | ⚠️ Hardcoded | ✅ Live-computed + fallback | Improved |
| Leaderboard | ✅ Live (pipeline_size) | ✅ + concurrency fixed | Improved |
| Geographic Intelligence | ❌ Missing | ✅ New tool | New |
| Modality Breakdown | ❌ Missing | ✅ New tool | New |
| Enrollment Intelligence | ❌ Missing | ✅ New tool | New |
| Endpoint Landscape | ❌ Missing | ✅ New tool | New |
| Regulatory Intelligence | ❌ Missing | ✅ OpenFDA integration | New |
| Company Deep Dive | ❌ Missing | ✅ Compound tool | New |
| Company Comparison | ❌ Missing | ✅ Head-to-head tool | New |
| Trial Timeline | ❌ Missing | ✅ New tool | New |
| Rate Limiting / Retry | ❌ Missing | ✅ fetchWithRetry | New |
| Env Configuration | ❌ Hardcoded | ✅ dotenv config | New |
| Test Coverage (target) | ~60% | >90% | Improved |

---

## 🚀 EXECUTION ORDER FOR AI CODING AGENT

1. **Fix BUG-001** (`aggFilters`) — unblocks 3 broken tools immediately
2. **Fix BUG-002** (sponsor path) — fixes competitive landscape
3. **Fix BUG-003** (market impact simulation) — add Alpha Vantage with graceful fallback
4. **Fix BUG-004** (hardcoded Olympics) — wire live data with static fallback
5. **Fix BUG-005** (search phase filter) — apply same aggFilters fix
6. **Apply ARCH-001** (pagination for competitive landscape)
7. **Apply ARCH-002** (fields projections)
8. **Apply ARCH-003** (fetchWithRetry + batch concurrency)
9. **Apply ARCH-004** (dotenv config)
10. **Implement FEAT-001 through FEAT-008** (new intelligence tools)
11. **Update tests** (TEST-001, TEST-002, TEST-003)
12. **Refactor into handler files** (final structure)
13. **Update README.md** with all new tools and examples

---

*BioPharma Sentinel v3.0 — built with MCP + ClinicalTrials.gov v2 + OpenFDA + Alpha Vantage*