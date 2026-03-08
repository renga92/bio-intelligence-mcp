import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

export async function handleSearchTrials(args: any) {
const { condition, status, phases, studyTypes, maxResults = 5 } = args;

// Use query.term instead of query.cond to handle both conditions and drug names (Interventions)
// This prevents "Bad Request" errors when searching for drugs like "semaglutide"
let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}`;

if (status) url += `&filter.overallStatus=${status}`;

const PHASE_FILTER_MAP: Record<string, string> = {
    "PHASE1": "1",
    "PHASE2": "2",
    "PHASE3": "3",
    "PHASE4": "4",
    "NA": "0"
};

if (phases && phases.length > 0) {
    const nums = phases.map((p: string) => PHASE_FILTER_MAP[p]).filter(Boolean).join(" ");
    url += `&aggFilters=phase:${nums}`;
}

if (studyTypes && studyTypes.length > 0) url += `&filter.studyTypes=${studyTypes.join("|")}`;

url += `&pageSize=${maxResults}`;
const SEARCH_FIELDS = "protocolSection.identificationModule,protocolSection.statusModule,protocolSection.designModule,protocolSection.conditionsModule,protocolSection.sponsorCollaboratorsModule";
url += `&fields=${SEARCH_FIELDS}`;

const response = await fetchWithRetry(url);
if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ClinicalTrials API error: ${response.status} ${response.statusText} - ${errorText}`);
}
const data = await response.json();

// PREVENT CONTEXT BLOAT: Summarize results server-side
const summarizedStudies = data.studies.map((s: any) => ({
    nctId: s.protocolSection?.identificationModule?.nctId,
    title: s.protocolSection?.identificationModule?.briefTitle,
    status: s.protocolSection?.statusModule?.overallStatus,
    sponsor: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || s.protocolSection?.identificationModule?.organization?.name,
    phase: s.protocolSection?.designModule?.phases,
    conditions: s.protocolSection?.conditionsModule?.conditions,
    lastUpdate: s.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date
}));

return {
    content: [{
        type: "text",
        text: `Found ${data.totalCount || summarizedStudies.length} trials. Top results (Summarized):\n\n${JSON.stringify(summarizedStudies, null, 2)}`
    }],
};
}
