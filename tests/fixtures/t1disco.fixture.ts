/**
 * T1-DISCO trial fixture (NCT05819138)
 * Mocked ClinicalTrials.gov v2 API response for the T1-DISCO trial.
 */
export const t1DiscoTrial = {
    protocolSection: {
        identificationModule: {
            nctId: "NCT05819138",
            briefTitle: "T1-DISCO: Type 1 Diabetes Continuous Subcutaneous Insulin Infusion Optimization",
            officialTitle: "T1-DISCO: A Clinical Study for Type 1 Diabetes Continuous Subcutaneous Insulin Infusion Optimization",
            organization: { fullName: "Insulet Corporation" },
        },
        statusModule: {
            overallStatus: "RECRUITING",
            startDateStruct: { date: "2023-04-01" },
            completionDateStruct: { date: "2025-12-01" },
        },
        designModule: {
            phases: ["PHASE4"],
            enrollmentInfo: { count: 150, type: "ESTIMATED" },
            studyType: "INTERVENTIONAL",
        },
        conditionsModule: {
            conditions: ["Type 1 Diabetes Mellitus"],
        },
        sponsorCollaboratorsModule: {
            leadSponsor: { name: "Insulet Corporation", class: "INDUSTRY" },
        },
        armsInterventionsModule: {
            interventions: [
                { type: "DEVICE", name: "OmniPod 5 Automated Insulin Delivery System" },
            ],
        },
    },
};

/** Minimal studies list wrapping the single T1-DISCO trial */
export const t1DiscoStudiesResponse = {
    studies: [t1DiscoTrial],
    totalCount: 1,
};
