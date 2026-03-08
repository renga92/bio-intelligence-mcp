import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetResearchVelocity(args: { topic: string; years?: number }) {
    const { topic, years = 5 } = args;
    const currentYear = new Date().getFullYear();
    const yearCounts: Record<number, number> = {};

    // Fetch currentYear too for display, even though it's partial
    for (let yr = currentYear - years; yr <= currentYear; yr++) {
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(topic)}&datetype=pdat&mindate=${yr}&maxdate=${yr}&retmax=0&retmode=json`;
        const res = await fetchWithRetry(url);
        const data = await res.json();
        yearCounts[yr] = parseInt(data.esearchresult?.count || "0");
        await new Promise((r) => setTimeout(r, 350));
    }

    // Exclude current (partial) year from trend calculation
    const completedYears = Object.entries(yearCounts)
        .filter(([yr]) => parseInt(yr) < currentYear)
        .map(([, count]) => count);

    const recentGrowth = completedYears.length >= 2
        ? ((completedYears[completedYears.length - 1] - completedYears[0]) / (completedYears[0] || 1) * 100).toFixed(1)
        : "0.0";

    const trend = parseFloat(recentGrowth) > 50 ? "🚀 Explosive growth" :
        parseFloat(recentGrowth) > 20 ? "📈 Strong growth" :
            parseFloat(recentGrowth) > 0 ? "📊 Steady growth" :
                parseFloat(recentGrowth) < -10 ? "📉 Declining" : "➡️ Stable";

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                topic,
                publicationsByYear: yearCounts,
                currentYearNote: `${currentYear} data is partial (year in progress)`,
                trendYearsUsed: `${currentYear - years}–${currentYear - 1} (completed years only)`,
                growthOverPeriod: `${recentGrowth}%`,
                trend,
                interpretation: `${trend}: ${recentGrowth}% change in annual publications over ${years} completed years. Higher velocity indicates active research community and potential for rapid evidence base growth.`,
                dataSource: "NCBI PubMed Entrez API",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
