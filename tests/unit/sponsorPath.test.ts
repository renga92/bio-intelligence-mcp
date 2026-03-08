import { describe, it, expect } from "vitest";

describe("Sponsor path extraction", () => {
    it("should read from sponsorCollaboratorsModule, not identificationModule", () => {
        const study = {
            protocolSection: {
                sponsorCollaboratorsModule: {
                    leadSponsor: { name: "Novo Nordisk" }
                },
                identificationModule: {
                    nctId: "NCT12345678"
                }
            }
        };

        const extractSponsor = (s: any) =>
            s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "Unknown";

        expect(extractSponsor(study)).toBe("Novo Nordisk");
    });

    it("should NOT read sponsor from identificationModule.leadSponsor", () => {
        const brokenExtractor = (s: any) =>
            s.protocolSection?.identificationModule?.leadSponsor?.name || "Unknown";
        const study = { protocolSection: { identificationModule: {} } };
        expect(brokenExtractor(study)).toBe("Unknown");
    });
});
