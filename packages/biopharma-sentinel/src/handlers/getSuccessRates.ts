import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetSuccessRates(args: any) {
    const { company, condition } = args;
    let queryParts = [];
    if (company) queryParts.push(`query.spons=${encodeURIComponent(company)}`);
    if (condition) queryParts.push(`query.cond=${encodeURIComponent(condition)}`);

    const queryString = queryParts.length > 0 ? queryParts.join("&") + "&" : "";

    // Fetch Phase 3 trials to determine success rates
    const url = `https://clinicaltrials.gov/api/v2/studies?${queryString}aggFilters=phase:3&pageSize=100&fields=protocolSection.statusModule,hasResults`;
    const response = await fetchWithRetry(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClinicalTrials API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();

    const stats = {
        total: data.totalCount || 0,
        completed: 0,
        terminated: 0,
        withdrawn: 0,
        ongoing: 0,
        hasResults: 0
    };

    data.studies.forEach((s: any) => {
        const status = s.protocolSection?.statusModule?.overallStatus;
        const results = s.hasResults;

        if (status === "COMPLETED") stats.completed++;
        else if (status === "TERMINATED") stats.terminated++;
        else if (status === "WITHDRAWN") stats.withdrawn++;
        else stats.ongoing++;

        if (results) stats.hasResults++;
    });

    const successRate = stats.completed > 0
        ? ((stats.completed / (stats.completed + stats.terminated)) * 100).toFixed(1)
        : "N/A";

    return {
        content: [{
            type: "text",
            text: `The Sharpshooter: Success Rate Analysis for ${condition || company || "Global"}\n\n` +
                `Phase 3 Trials: ${stats.completed + stats.terminated + stats.withdrawn + stats.ongoing}\n` +
                `- Completed: ${stats.completed}\n` +
                `- Terminated/Withdrawn: ${stats.terminated + stats.withdrawn}\n` +
                `- Ongoing: ${stats.ongoing}\n\n` +
                `Estimated Probability of Technical Success (PoS): ${successRate}%\n` +
                `Note: Calculation based on Completed vs. Terminated ratios for Phase 3 assets.`
        }],
    };
}
