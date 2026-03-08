import { fetchWithRetry } from "@biopharma/shared";
import { config } from "@biopharma/shared";

export async function handleGetPipeline(args: any) {
const { company } = args;
// Use query.term for companies to be more resilient to exact name matches
const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(company)}&aggFilters=phase:3&pageSize=100&fields=protocolSection.conditionsModule,protocolSection.designModule,protocolSection.sponsorCollaboratorsModule`;

const response = await fetchWithRetry(url);
if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ClinicalTrials API error: ${response.status} ${response.statusText} - ${errorText}`);
}
const data = await response.json();

// Aggregation
const pipeline: Record<string, number> = {};
data.studies.forEach((study: any) => {
    const conditions = study.protocolSection?.conditionsModule?.conditions || ["Unknown"];
    conditions.forEach((cond: string) => {
        pipeline[cond] = (pipeline[cond] || 0) + 1;
    });
});

const sortedPipeline = Object.entries(pipeline)
    .sort(([, a], [, b]) => b - a)
    .map(([condition, count]) => ({ condition, count }));

return {
    content: [{
        type: "text",
        text: `Phase 3 Pipeline for ${company}:\n\n${JSON.stringify(sortedPipeline, null, 2)}`
    }],
};
}
