import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClinicalTrialsServer } from "../src/index.js";

describe("ClinicalTrialsServer", () => {
    let server: ClinicalTrialsServer;
    const mockFetch = vi.fn();

    beforeEach(() => {
        server = new ClinicalTrialsServer();
        mockFetch.mockClear();
        global.fetch = mockFetch;
    });

    it("should handle search_trials with complex filters (Fixing the NA concern)", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ studies: [] }),
        });

        const args = {
            condition: "Alzheimer",
            phases: ["PHASE3"],
            studyTypes: ["INTERVENTIONAL"],
            maxResults: 10
        };

        await server.handleToolCall("search_trials", args);

        const calledUrl = mockFetch.mock.calls[0][0] as string;

        expect(calledUrl).toContain("query.cond=Alzheimer");
        expect(calledUrl).toContain("filter.phases=PHASE3");
        expect(calledUrl).toContain("filter.studyTypes=INTERVENTIONAL");
        expect(calledUrl).toContain("pageSize=10");
    });

    it("should handle get_trial correctly", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ nctId: "NCT123" }),
        });

        await server.handleToolCall("get_trial", { nctId: "NCT123" });

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("/studies/NCT123");
    });

    it("should return error content on API failure", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: "Unauthorized",
        });

        const result = await server.handleToolCall("get_trial", { nctId: "NCT123" });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unauthorized");
    });
});
