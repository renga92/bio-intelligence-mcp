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

        const timeline = [
            `Start Date: ${start}`,
            `Primary Completion: ${primaryComp}`,
            `Study Completion: ${studyComp}`,
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
