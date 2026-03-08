import { fetchWithRetry } from "@biopharma/shared";
import { config } from "@biopharma/shared";

export async function handleGetModalityBreakdown(args: any) {
    const { condition } = args;
    const modalities: Record<string, number> = {
        "Small Molecule / Drug": 0,
        "Biologic": 0,
        "Genetic": 0,
        "Device": 0,
        "Procedure": 0,
        "Behavioral": 0,
        "Dietary Supplement": 0,
        "Other": 0
    };
    let totalInterventions = 0;

    let nextPageToken: string | null = null;
    let pages = 0;
    const MAX_PAGES = config.maxPagesPerQuery;

    do {
        let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.armsInterventionsModule`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await fetchWithRetry(url);
        const data = await res.json();

        data.studies?.forEach((s: any) => {
            const interventions = s.protocolSection?.armsInterventionsModule?.interventions || [];
            interventions.forEach((int: any) => {
                const type = int.type;
                if (type === "DRUG") modalities["Small Molecule / Drug"]++;
                else if (type === "BIOLOGICAL") modalities["Biologic"]++;
                else if (type === "GENETIC") modalities["Genetic"]++;
                else if (type === "DEVICE") modalities["Device"]++;
                else if (type === "PROCEDURE") modalities["Procedure"]++;
                else if (type === "BEHAVIORAL") modalities["Behavioral"]++;
                else if (type === "DIETARY_SUPPLEMENT") modalities["Dietary Supplement"]++;
                else modalities["Other"]++;
                totalInterventions++;
            });
        });

        nextPageToken = data.nextPageToken || null;
        pages++;
    } while (nextPageToken && pages < MAX_PAGES);

    if (totalInterventions === 0) return { content: [{ type: "text", text: "No interventions found." }] };

    const breakdown = Object.entries(modalities)
        .sort((a, b) => b[1] - a[1])
        .map(([m, c]) => `- ${m}: ${((c / totalInterventions) * 100).toFixed(1)}% (${c})`);

    return {
        content: [{
            type: "text",
            text: `🧬 Modality Breakdown for ${condition}\nTotal Interventions Analyzed: ${totalInterventions}\n\n${breakdown.join("\n")}`
        }]
    };
}
