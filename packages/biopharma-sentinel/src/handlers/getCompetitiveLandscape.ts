import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetCompetitiveLandscape(args: { condition: string }) {
    const { condition } = args;
    const sponsors: Record<string, number> = {};
    let nextPageToken: string | null = null;
    let totalStudies = 0;
    const MAX_PAGES = 10;

    for (let page = 0; page < MAX_PAGES; page++) {
        let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.sponsorCollaboratorsModule`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await fetchWithRetry(url);
        const data = await res.json();
        totalStudies += data.studies.length;

        data.studies.forEach((s: any) => {
            const name = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || "Unknown";
            sponsors[name] = (sponsors[name] || 0) + 1;
        });

        nextPageToken = data.nextPageToken || null;
        if (!nextPageToken) break;
    }

    const sorted = Object.entries(sponsors)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15);

    const uniqueSponsors = Object.keys(sponsors).length;
    const density =
        uniqueSponsors > 100 ? "Extreme (Red Ocean)" :
            uniqueSponsors > 50 ? "High (Crowded)" :
                uniqueSponsors > 20 ? "Moderate" :
                    uniqueSponsors > 5 ? "Low (Emerging)" :
                        "Very Low (White Space)";

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                condition,
                marketDensity: density,
                totalUniqueSponsors: uniqueSponsors,
                totalTrialsAnalyzed: totalStudies,
                topCompetitors: sorted.map(([name, count]) => ({ sponsor: name, trials: count })),
                dataSource: "ClinicalTrials.gov v2",
                asOf: new Date().toISOString(),
                note: "Includes academic, industry, and government sponsors. Filter to industry for competitive analysis."
            }, null, 2)
        }]
    };
}
