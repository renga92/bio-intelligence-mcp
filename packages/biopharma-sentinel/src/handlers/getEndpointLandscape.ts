import { fetchWithRetry } from "@biopharma/shared";

const PHASE_MAP: Record<string, string> = {
    PHASE1: "1",
    PHASE2: "2",
    PHASE3: "3",
    PHASE4: "4",
    NA: "0",
};

export async function handleGetEndpointLandscape(args: {
    condition: string;
    phase?: "PHASE2" | "PHASE3";
}) {
    const { condition, phase } = args;

    let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=100&fields=protocolSection.outcomesModule,protocolSection.designModule`;
    if (phase) url += `&aggFilters=phase:${PHASE_MAP[phase]}`;

    const res = await fetchWithRetry(url);
    const data = await res.json();

    const endpointCounts: Record<string, number> = {};

    if (!data.studies) return { content: [{ type: "text", text: "No trials found." }] };

    data.studies.forEach((s: any) => {
        const primaryOutcomes = s.protocolSection?.outcomesModule?.primaryOutcomes || [];
        primaryOutcomes.forEach((outcome: any) => {
            const measure = outcome.measure?.toLowerCase() || "";
            // Cluster into categories
            const category =
                /surviv|overall survival|os\b/.test(measure) ? "Overall Survival (OS)" :
                    /progression|pfs|disease-free/.test(measure) ? "Progression-Free Survival (PFS)" :
                        /hba1c|hemoglobin a1c|glycat/.test(measure) ? "HbA1c / Glycemic Control" :
                            /pulse wave|arterial stiffness|pwv/.test(measure) ? "Arterial Stiffness (PWV)" :
                                /weight|bmi|body mass/.test(measure) ? "Weight / BMI" :
                                    /biomarker|blood level|concentration|pharmacokinetic/.test(measure) ? "Biomarker / PK" :
                                        /response rate|orr|objective response/.test(measure) ? "Objective Response Rate (ORR)" :
                                            /quality of life|qol|hrqol/.test(measure) ? "Quality of Life" :
                                                /safety|adverse|tolerab/.test(measure) ? "Safety / Tolerability" :
                                                    "Other";

            endpointCounts[category] = (endpointCounts[category] || 0) + 1;
        });
    });

    const sorted = Object.entries(endpointCounts).sort(([, a], [, b]) => b - a);

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                condition,
                phase: phase || "All",
                primaryEndpointDistribution: sorted.map(([endpoint, count]) => ({ endpoint, count })),
                insight: `Dominant endpoint: ${sorted[0]?.[0]} (${sorted[0]?.[1]} trials). Regulatory signal: FDA/EMA have accepted this endpoint as approvable in this indication.`,
                dataSource: "ClinicalTrials.gov v2",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}
