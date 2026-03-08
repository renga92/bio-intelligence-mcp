import { fetchWithRetry } from "@biopharma/shared";

const PHASE_MAP: Record<string, string> = {
    PHASE1: "1",
    PHASE2: "2",
    PHASE3: "3",
    PHASE4: "4",
    NA: "0",
};

export async function handleGetGeographicIntelligence(args: {
    condition: string;
    phase?: string;
}) {
    const { condition, phase } = args;

    let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.contactsLocationsModule`;
    if (phase) {
        const num = PHASE_MAP[phase];
        if (num) url += `&aggFilters=phase:${num}`;
    }

    const res = await fetchWithRetry(url);
    const data = await res.json();

    const countryCounts: Record<string, number> = {};
    const siteCounts: Record<string, number> = {};

    if (!data.studies) return { content: [{ type: "text", text: "No trials found." }] };

    data.studies.forEach((s: any) => {
        const locations = s.protocolSection?.contactsLocationsModule?.locations || [];
        locations.forEach((loc: any) => {
            const country = loc.country || "Unknown";
            countryCounts[country] = (countryCounts[country] || 0) + 1;
        });
        const siteCount = locations.length;
        const bucket = siteCount === 0 ? "0" : siteCount <= 5 ? "1-5" : siteCount <= 20 ? "6-20" : "20+";
        siteCounts[bucket] = (siteCounts[bucket] || 0) + 1;
    });

    const REGIONS: Record<string, string[]> = {
        "North America": ["United States", "Canada", "Mexico"],
        "Europe": ["Germany", "France", "United Kingdom", "Spain", "Italy", "Netherlands", "Switzerland", "Belgium", "Sweden", "Poland"],
        "Asia-Pacific": ["China", "Japan", "South Korea", "Australia", "India", "Taiwan", "Singapore"],
        "Latin America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru"],
        "Middle East & Africa": ["Israel", "South Africa", "Saudi Arabia", "Turkey", "Egypt"],
    };

    const regionalSummary: Record<string, number> = {};
    for (const [region, countries] of Object.entries(REGIONS)) {
        regionalSummary[region] = countries.reduce((sum, c) => sum + (countryCounts[c] || 0), 0);
    }

    const topCountries = Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                condition,
                phase: phase || "All",
                regionalDistribution: regionalSummary,
                topCountriesBySites: topCountries.map(([country, sites]) => ({ country, sites })),
                trialSizeDistribution: siteCounts,
                insight: topCountries[0]?.[0] === "United States"
                    ? "US-centric trials — opportunity for ex-US site expansion to reduce cost and improve diversity"
                    : `Geographic leader: ${topCountries[0]?.[0]} — indicating strong regional research infrastructure`,
                dataSource: "ClinicalTrials.gov v2",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
