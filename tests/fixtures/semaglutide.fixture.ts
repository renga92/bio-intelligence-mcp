/**
 * Semaglutide / GLP-1 fixture data
 * Mocked responses for semaglutide pipeline queries used in biopharma-sentinel leaderboard
 * and bioliterature-analyst research velocity tests.
 */

/** Single semaglutide study stubb for ClinicalTrials.gov v2 */
export const semaglutideStudy = {
    protocolSection: {
        identificationModule: {
            nctId: "NCT04788095",
            briefTitle: "SURMOUNT-1: Tirzepatide for Chronic Weight Management in Adults with Obesity",
            organization: { fullName: "Novo Nordisk A/S" },
        },
        statusModule: {
            overallStatus: "COMPLETED",
            startDateStruct: { date: "2019-12-01" },
            completionDateStruct: { date: "2022-06-01" },
        },
        designModule: {
            phases: ["PHASE3"],
            enrollmentInfo: { count: 2539, type: "ACTUAL" },
            studyType: "INTERVENTIONAL",
        },
        conditionsModule: {
            conditions: ["Obesity", "Type 2 Diabetes", "Cardiovascular Disease"],
        },
        sponsorCollaboratorsModule: {
            leadSponsor: { name: "Novo Nordisk A/S", class: "INDUSTRY" },
        },
        armsInterventionsModule: {
            interventions: [
                { type: "DRUG", name: "Semaglutide", description: "GLP-1 receptor agonist" },
            ],
        },
    },
};

/** Mock pipeline count response for Novo Nordisk GLP-1 queries */
export const novoNordiskGlp1PipelineMock = {
    studies: [semaglutideStudy],
    totalCount: 42,
};

/** Mock PubMed esearch result for semaglutide research velocity */
export const semaglutidePubmedMock = (year: number, count: number) => ({
    esearchresult: {
        count: String(count),
        retmax: "0",
        retstart: "0",
        querykey: "1",
        webenv: "NCID_1_mock",
        idlist: [],
        translationset: [],
        querytranslation: `semaglutide[MeSH] AND ${year}[pdat]`,
    },
});
