import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClinicalTrialsServer } from "../src/index.js";

describe("New Features (Phase 3)", () => {
    let server: ClinicalTrialsServer;
    const mockFetch = vi.fn();

    beforeEach(() => {
        server = new ClinicalTrialsServer();
        mockFetch.mockClear();
        (globalThis as any).fetch = mockFetch;
    });

    it("should resolve get_geographic_intelligence gracefully", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                studies: [
                    { protocolSection: { contactsLocationsModule: { locations: [{ country: "United States" }, { country: "France" }] } } },
                    { protocolSection: { contactsLocationsModule: { locations: [{ country: "United States" }] } } }
                ]
            })
        });

        const res = await server.handleToolCall("get_geographic_intelligence", { condition: "Asthma" });
        expect(res.content[0].text).toContain("United States: 2 trials");
        expect(res.content[0].text).toContain("France: 1 trials");
        expect(res.content[0].text).toContain("North America: 2 trials");
    });

    it("should resolve get_modality_breakdown gracefully", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                studies: [
                    { protocolSection: { armsInterventionsModule: { interventions: [{ type: "DRUG" }] } } },
                    { protocolSection: { armsInterventionsModule: { interventions: [{ type: "BIOLOGICAL" }] } } }
                ]
            })
        });
        const res = await server.handleToolCall("get_modality_breakdown", { condition: "Asthma" });
        expect(res.content[0].text).toContain("Small Molecule / Drug");
        expect(res.content[0].text).toContain("Biologic");
    });

    it("should resolve get_enrollment_intelligence gracefully", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                studies: [
                    {
                        protocolSection: {
                            designModule: { enrollmentInfo: { count: 100 } },
                            statusModule: { startDateStruct: { date: "2020-01-01" }, completionDateStruct: { date: "2021-01-01" } },
                            contactsLocationsModule: { locations: [{}, {}] }
                        }
                    }
                ]
            })
        });
        const res = await server.handleToolCall("get_enrollment_intelligence", { condition: "Asthma" });
        expect(res.content[0].text).toContain("Average Enrollment: 100 patients/trial");
    });

    it("should resolve get_endpoint_landscape gracefully", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                studies: [
                    { protocolSection: { outcomesModule: { primaryOutcomes: [{ measure: "Overall Survival" }] } } }
                ]
            })
        });
        const res = await server.handleToolCall("get_endpoint_landscape", { condition: "Asthma" });
        expect(res.content[0].text).toContain("Overall Survival (OS): 1");
    });

    it("should resolve get_regulatory_landscape gracefully", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [
                    {
                        sponsor_name: "Pfizer",
                        application_number: "NDA123",
                        submissions: [{ submission_status_date: "20200101" }]
                    }
                ]
            })
        });
        const res = await server.handleToolCall("get_regulatory_landscape", { drug: "ibuprofen" });
        expect(res.content[0].text).toContain("Pfizer");
        expect(res.content[0].text).toContain("NDA123");
    });

    it("should resolve get_trial_timeline gracefully", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                protocolSection: {
                    statusModule: {
                        startDateStruct: { date: "2020-01-01" },
                        overallStatus: "COMPLETED"
                    }
                }
            })
        });
        const res = await server.handleToolCall("get_trial_timeline", { nctId: "NCT01234567" });
        expect(res.content[0].text).toContain("Start Date: 2020-01-01");
        expect(res.content[0].text).toContain("Overall Status: COMPLETED");
    });

    it("should resolve get_company_deep_dive gracefully", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                studies: [],
                totalCount: 0
            })
        });
        const res = await server.handleToolCall("get_company_deep_dive", { company: "Pfizer" });
        expect(res.content[0].text).toContain("Company Deep Dive: Pfizer");
    });

    it("should resolve compare_companies gracefully", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                studies: [],
                totalCount: 0
            })
        });
        const res = await server.handleToolCall("compare_companies", { company_a: "Pfizer", company_b: "Moderna" });
        expect(res.content[0].text).toContain("Head-to-Head: Pfizer vs Moderna");
    });
});
