import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

export async function handleGetCompetitiveLandscape(args: any) {
const { condition } = args;
const sponsors: Record<string, number> = {};
let nextPageToken: string | null = null;
let pages = 0;
const MAX_PAGES = config.maxPagesPerQuery;

do {
    let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.sponsorCollaboratorsModule,protocolSection.identificationModule`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;

    const res = await fetchWithRetry(url);
    const data = await res.json();

    data.studies?.forEach((s: any) => {
        const name = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || s.protocolSection?.identificationModule?.organization?.name || "Unknown";
        sponsors[name] = (sponsors[name] || 0) + 1;
    });

    nextPageToken = data.nextPageToken || null;
    pages++;
} while (nextPageToken && pages < MAX_PAGES);

const sortedSponsors = Object.entries(sponsors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

const density = sortedSponsors.length > 15 ? "High (Crowded)" : sortedSponsors.length > 5 ? "Moderate" : "Low (White Space)";

return {
    content: [{
        type: "text",
        text: `Competitive Landscape: ${condition}\n\n` +
            `Market Density: ${density}\n` +
            `Total Active Players: ${Object.keys(sponsors).length}\n\n` +
            `Top Competitors:\n${sortedSponsors.map(([name, count]) => `- ${name}: ${count} trials`).join("\n")}`
    }],
};
}
