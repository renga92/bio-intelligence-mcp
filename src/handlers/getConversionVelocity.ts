import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

export async function handleGetConversionVelocity(args: any) {
const { company } = args;
// Query for both phase 1 and phase 3 to compare timelines
const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(company)}&aggFilters=phase:1 3&pageSize=100&fields=protocolSection.armsInterventionsModule,protocolSection.designModule,protocolSection.statusModule`;

const response = await fetchWithRetry(url);
if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ClinicalTrials API error: ${response.status} ${response.statusText} - ${errorText}`);
}
const data = await response.json();

const drugTimelines: Record<string, { p1Start?: string, p3Complete?: string }> = {};

data.studies.forEach((study: any) => {
    const protocol = study.protocolSection;
    const interventions = protocol?.armsInterventionsModule?.interventions?.map((i: any) => i.name) || [];
    const phases = protocol?.designModule?.phases || [];
    const startDate = protocol?.statusModule?.startDateStruct?.date;
    const compDate = protocol?.statusModule?.completionDateStruct?.date;

    interventions.forEach((drug: string) => {
        if (!drugTimelines[drug]) drugTimelines[drug] = {};
        if (phases.includes("PHASE1") && startDate) {
            if (!drugTimelines[drug].p1Start || new Date(startDate) < new Date(drugTimelines[drug].p1Start)) {
                drugTimelines[drug].p1Start = startDate;
            }
        }
        if (phases.includes("PHASE3") && compDate) {
            if (!drugTimelines[drug].p3Complete || new Date(compDate) > new Date(drugTimelines[drug].p3Complete)) {
                drugTimelines[drug].p3Complete = compDate;
            }
        }
    });
});

const results = Object.entries(drugTimelines)
    .filter(([, timeline]) => timeline.p1Start && timeline.p3Complete)
    .map(([drug, timeline]) => {
        const start = new Date(timeline.p1Start!);
        const end = new Date(timeline.p3Complete!);
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return { drug, yearsToPhase3: years.toFixed(2), p1Start: timeline.p1Start, p3Complete: timeline.p3Complete };
    });

const avgVelocity = results.length > 0
    ? (results.reduce((acc, r) => acc + parseFloat(r.yearsToPhase3), 0) / results.length).toFixed(2)
    : "N/A";

return {
    content: [{
        type: "text",
        text: `Conversion Velocity for ${company}:\n\nAverage Time (P1 -> P3): ${avgVelocity} years\n\nDetailed Trackers:\n${JSON.stringify(results, null, 2)}`
    }],
};
}
