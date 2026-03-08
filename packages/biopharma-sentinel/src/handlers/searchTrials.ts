import { fetchWithRetry, buildPhaseFilter } from "@biopharma/shared";

const PHASE_MAP: Record<string, string> = {
    PHASE1: "1",
    PHASE2: "2",
    PHASE3: "3",
    PHASE4: "4",
    NA: "0",
};

export async function handleSearchTrials(args: {
    condition: string;
    status?: string;
    phases?: string[];
    studyTypes?: string[];
    maxResults?: number;
}) {
    const { condition, status, phases, studyTypes, maxResults = 5 } = args;

    const FIELDS = [
        "protocolSection.identificationModule",
        "protocolSection.statusModule",
        "protocolSection.designModule",
        "protocolSection.conditionsModule",
        "protocolSection.sponsorCollaboratorsModule",
    ].join(",");

    let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&fields=${FIELDS}&pageSize=${maxResults}`;

    if (status) url += `&filter.overallStatus=${status}`;

    if (phases?.length) {
        const phaseNums = phases.map(p => PHASE_MAP[p]).filter(Boolean).join(" ");
        url += `&aggFilters=phase:${phaseNums}`;
    }

    if (studyTypes?.length) {
        const typeStr = studyTypes.map(t => t.toLowerCase()).join(" ");
        url += `&aggFilters=studyType:${typeStr}`;
    }

    const res = await fetchWithRetry(url);
    const data = await res.json();

    const studies = data.studies.map((s: any) => ({
        nctId: s.protocolSection?.identificationModule?.nctId,
        title: s.protocolSection?.identificationModule?.briefTitle,
        status: s.protocolSection?.statusModule?.overallStatus,
        sponsor: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
        phase: s.protocolSection?.designModule?.phases,
        conditions: s.protocolSection?.conditionsModule?.conditions?.slice(0, 3),
        lastUpdate: s.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date,
    }));

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                totalFound: data.totalCount,
                returned: studies.length,
                dataSource: "ClinicalTrials.gov v2",
                asOf: new Date().toISOString(),
                studies,
            }, null, 2)
        }]
    };
}
