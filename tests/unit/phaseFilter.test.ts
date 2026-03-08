import { describe, it, expect } from "vitest";
import { buildPhaseFilter } from "../../packages/shared/src/phaseFilter.js";

describe("buildPhaseFilter", () => {
    it("should produce correct aggFilters for single phase", () => {
        expect(buildPhaseFilter(["PHASE3"])).toBe("aggFilters=phase:3");
    });

    it("should produce correct aggFilters for multiple phases", () => {
        expect(buildPhaseFilter(["PHASE1", "PHASE3"])).toBe("aggFilters=phase:1 3");
    });

    it("should return empty string for empty array", () => {
        expect(buildPhaseFilter([])).toBe("");
    });

    it("should handle NA phase", () => {
        expect(buildPhaseFilter(["NA"])).toBe("aggFilters=phase:0");
    });
});
