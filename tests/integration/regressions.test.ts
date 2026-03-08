/**
 * Regression tests for platform-critical data paths.
 * Uses fixture data to ensure key tools return correct shapes and values.
 * 
 * Covers:
 *  - T1-DISCO (NCT05819138) trial data integrity
 *  - Semaglutide / Novo Nordisk GLP-1 pipeline (leaderboard visibility)
 *  - Research velocity trend direction (no partial-year bias)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t1DiscoStudiesResponse, t1DiscoTrial } from "../fixtures/t1disco.fixture.js";
import { novoNordiskGlp1PipelineMock, semaglutidePubmedMock } from "../fixtures/semaglutide.fixture.js";
import { handleGetResearchVelocity } from "../../packages/bioliterature-analyst/src/handlers/getResearchVelocity.js";

const mockFetch = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).fetch = mockFetch;
});

// ─────────────────────────────────────────────
// T1-DISCO — NCT05819138
// ─────────────────────────────────────────────
describe("T1-DISCO Regression (NCT05819138)", () => {
    it("fixture has correct NCT ID", () => {
        expect(t1DiscoTrial.protocolSection.identificationModule.nctId).toBe("NCT05819138");
    });

    it("fixture has RECRUITING status", () => {
        expect(t1DiscoTrial.protocolSection.statusModule.overallStatus).toBe("RECRUITING");
    });

    it("fixture has PHASE4 designation", () => {
        expect(t1DiscoTrial.protocolSection.designModule.phases).toContain("PHASE4");
    });

    it("fixture totalCount is 1 in studies list", () => {
        expect(t1DiscoStudiesResponse.totalCount).toBe(1);
        expect(t1DiscoStudiesResponse.studies).toHaveLength(1);
    });

    it("fixture sponsor is Insulet Corporation", () => {
        expect(t1DiscoTrial.protocolSection.sponsorCollaboratorsModule.leadSponsor.name)
            .toBe("Insulet Corporation");
    });
});

// ─────────────────────────────────────────────
// Semaglutide / Novo Nordisk GLP-1
// ─────────────────────────────────────────────
describe("Semaglutide GLP-1 Regression (Novo Nordisk)", () => {
    it("pipeline mock has Novo Nordisk A/S as sponsor", () => {
        const study = novoNordiskGlp1PipelineMock.studies[0];
        expect(study.protocolSection.sponsorCollaboratorsModule.leadSponsor.name)
            .toBe("Novo Nordisk A/S");
    });

    it("pipeline mock totalCount is > 0", () => {
        expect(novoNordiskGlp1PipelineMock.totalCount).toBeGreaterThan(0);
    });

    it("semaglutide intervention is GLP-1 receptor agonist", () => {
        const intervention = novoNordiskGlp1PipelineMock.studies[0]
            .protocolSection.armsInterventionsModule.interventions[0];
        expect(intervention.name).toBe("Semaglutide");
        expect(intervention.description).toContain("GLP-1");
    });

    it("pubmed mock returns count as string (PubMed API format)", () => {
        const mock = semaglutidePubmedMock(2024, 450);
        expect(mock.esearchresult.count).toBe("450");
    });
});

// ─────────────────────────────────────────────
// Research Velocity — no partial-year bias
// ─────────────────────────────────────────────
describe("Research Velocity — Partial Year Exclusion", () => {
    it("trend should not fall due to partial current year with rising data", async () => {
        const currentYear = new Date().getFullYear();
        // Simulate: 2021: 43, 2022: 55, 2023: 68, 2024: 86, 2025: 91, 2026 (partial): 19
        const countsByYear: Record<number, number> = {
            [currentYear - 5]: 43,
            [currentYear - 4]: 55,
            [currentYear - 3]: 68,
            [currentYear - 2]: 86,
            [currentYear - 1]: 91,
            [currentYear]: 19, // partial year — should be excluded from trend
        };

        let callIdx = 0;
        mockFetch.mockImplementation((url: string) => {
            const yr = currentYear - 5 + callIdx++;
            return Promise.resolve({
                ok: true,
                json: async () => semaglutidePubmedMock(yr, countsByYear[yr] ?? 0),
            });
        });

        const result = await handleGetResearchVelocity({ topic: "semaglutide GLP-1", years: 5 });
        const text = result.content[0].text;
        const parsed = JSON.parse(text);

        // Trend should be positive (43→91 over completed years = ~112% growth)
        const growth = parseFloat(parsed.growthOverPeriod);
        expect(growth).toBeGreaterThan(0);
        expect(parsed.trend).not.toContain("Declining");
        expect(parsed.currentYearNote).toContain("partial");
        expect(parsed.trendYearsUsed).toContain("completed years only");
    });
});
