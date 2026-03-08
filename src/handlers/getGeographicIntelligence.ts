import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

const REGION_MAP: Record<string, string> = {
    "United States": "North America",
    "Canada": "North America",
    "United Kingdom": "Europe",
    "Germany": "Europe",
    "France": "Europe",
    "Spain": "Europe",
    "Italy": "Europe",
    "Japan": "Asia-Pacific",
    "China": "Asia-Pacific",
    "Australia": "Asia-Pacific",
    "South Korea": "Asia-Pacific",
};

const getRegion = (country: string) => REGION_MAP[country] || "Other";

export async function handleGetGeographicIntelligence(args: any) {
    const { condition, phase } = args;
    const countries: Record<string, number> = {};
    const regions: Record<string, number> = {};

    let nextPageToken: string | null = null;
    let pages = 0;
    const MAX_PAGES = config.maxPagesPerQuery;

    let queryUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.contactsLocationsModule`;
    if (phase) {
        const PHASE_FILTER_MAP: Record<string, string> = { "PHASE1": "1", "PHASE2": "2", "PHASE3": "3", "PHASE4": "4", "NA": "0" };
        const mappedPhase = PHASE_FILTER_MAP[phase];
        if (mappedPhase) queryUrl += `&aggFilters=phase:${mappedPhase}`;
    }

    do {
        let url = queryUrl;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await fetchWithRetry(url);
        const data = await res.json();

        data.studies?.forEach((s: any) => {
            const locations = s.protocolSection?.contactsLocationsModule?.locations || [];
            const uniqueCountries = new Set<string>();
            locations.forEach((loc: any) => {
                if (loc.country) uniqueCountries.add(loc.country);
            });
            uniqueCountries.forEach((country) => {
                countries[country] = (countries[country] || 0) + 1;
                const region = getRegion(country);
                regions[region] = (regions[region] || 0) + 1;
            });
        });

        nextPageToken = data.nextPageToken || null;
        pages++;
    } while (nextPageToken && pages < MAX_PAGES);

    const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sortedRegions = Object.entries(regions).sort((a, b) => b[1] - a[1]);

    return {
        content: [{
            type: "text",
            text: `📍 Geographic Intelligence for ${condition}${phase ? ` (${phase})` : ""}\n\n` +
                `Top Regions:\n${sortedRegions.map(([r, c]) => `- ${r}: ${c} trials`).join("\n")}\n\n` +
                `Top Countries:\n${sortedCountries.map(([c, cnt]) => `- ${c}: ${cnt} trials`).join("\n")}`
        }]
    };
}
