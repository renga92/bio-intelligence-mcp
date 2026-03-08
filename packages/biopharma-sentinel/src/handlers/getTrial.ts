import { fetchWithRetry } from "@biopharma/shared";

export async function handleGetTrial(args: any) {
const { nctId } = args;
const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
const response = await fetchWithRetry(url);
if (!response.ok) throw new Error(`ClinicalTrials API error: ${response.statusText}`);
const data = await response.json();
return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
};
}
