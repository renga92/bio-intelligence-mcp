import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

// Basic keyword dictionary
const KEYWORDS = [
    { label: "Overall Survival (OS)", keys: ["overall survival", " os "] },
    { label: "Progression-Free Survival (PFS)", keys: ["progression free", "progression-free", " pfs "] },
    { label: "Objective Response Rate (ORR)", keys: ["objective response", " orr "] },
    { label: "Adverse Events (Safety)", keys: ["adverse event", "safety", "tolerability", "maximum tolerated dose", " dlt "] },
    { label: "Pharmacokinetics (PK)", keys: ["pharmacokinetic", " pk ", " cmax ", " auc "] },
    { label: "Quality of Life", keys: ["quality of life", " qol "] },
    { label: "Biomarker / Laboratory", keys: ["biomarker", "hba1c", "cholesterol", "blood pressure"] }
];

function classifyEndpoint(measure: string): string {
    const l = ` ${measure.toLowerCase()} `;
    for (const kw of KEYWORDS) {
        if (kw.keys.some(k => l.includes(k))) return kw.label;
    }
    return "Other / Indication Specific";
}

export async function handleGetEndpointLandscape(args: any) {
    const { condition, phase } = args;

    let queryUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.outcomesModule`;
    if (phase) {
        const PHASE_FILTER_MAP: Record<string, string> = { "PHASE1": "1", "PHASE2": "2", "PHASE3": "3", "PHASE4": "4", "NA": "0" };
        const mappedPhase = PHASE_FILTER_MAP[phase];
        if (mappedPhase) queryUrl += `&aggFilters=phase:${mappedPhase}`;
    }

    let nextPageToken: string | null = null;
    let pages = 0;
    const MAX_PAGES = config.maxPagesPerQuery;

    const clusters: Record<string, number> = {};
    let rawEndpoints = 0;

    do {
        let url = queryUrl;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await fetchWithRetry(url);
        const data = await res.json();

        data.studies?.forEach((s: any) => {
            const primaries = s.protocolSection?.outcomesModule?.primaryOutcomes || [];
            primaries.forEach((po: any) => {
                if (po.measure) {
                    rawEndpoints++;
                    const cls = classifyEndpoint(po.measure);
                    clusters[cls] = (clusters[cls] || 0) + 1;
                }
            });
        });

        nextPageToken = data.nextPageToken || null;
        pages++;
    } while (nextPageToken && pages < MAX_PAGES);

    if (rawEndpoints === 0) return { content: [{ type: "text", text: "No primary endpoints found." }] };

    const sorted = Object.entries(clusters).sort((a, b) => b[1] - a[1]);

    return {
        content: [{
            type: "text",
            text: `🎯 Endpoint Landscape for ${condition}${phase ? ` (${phase})` : ""}\nTotal Endpoints Analyzed: ${rawEndpoints}\n\n` +
                sorted.map(([c, count]) => `- ${c}: ${count} (${((count / rawEndpoints) * 100).toFixed(1)}%)`).join("\n")
        }]
    };
}
