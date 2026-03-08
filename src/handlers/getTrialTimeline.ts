import { fetchWithRetry } from "../utils/fetchWithRetry.js";

export async function handleGetTrialTimeline(args: any) {
    const { nctId } = args;

    const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
    try {
        const res = await fetchWithRetry(url);
        const data = await res.json();

        const statusModule = data.protocolSection?.statusModule;
        if (!statusModule) return { content: [{ type: "text", text: `No timeline data available for ${nctId}.` }] };

        const start = statusModule.startDateStruct?.date || "Unknown";
        const primaryComp = statusModule.primaryCompletionDateStruct?.date || "Unknown";
        const studyComp = statusModule.completionDateStruct?.date || "Unknown";
        const lastUpdate = statusModule.lastUpdatePostDateStruct?.date || "Unknown";
        const status = statusModule.overallStatus || "Unknown";
        const enrollment = data.protocolSection?.designModule?.enrollmentInfo?.count || "Unknown";
        const resultsPosted = statusModule.resultsFirstPostDateStruct?.date || "Not Posted";
        const primaryOutcomes = data.protocolSection?.outcomesModule?.primaryOutcomes?.map((o: any) => o.measure).join("; ") || "Unknown";

        const timeline = [
            `Start Date: ${start}`,
            `Enrollment: ${enrollment} patients`,
            `Primary Endpoints: ${primaryOutcomes}`,
            `Primary Completion: ${primaryComp}`,
            `Study Completion: ${studyComp}`,
            `Results Posted: ${resultsPosted}`,
            `Last Update: ${lastUpdate}`,
            `Overall Status: ${status}`
        ];

        return {
            content: [{
                type: "text",
                text: `⏳ Trial Timeline for ${nctId}\n\n` + timeline.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")
            }]
        };

    } catch (e: any) {
        throw new Error(`Failed to get trial timeline for ${nctId}: ` + e.message);
    }
}
