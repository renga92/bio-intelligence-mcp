import { config } from "../config.js";

export async function fetchWithRetry(url: string, retries = 3, delayMs = config.rateLimitDelayMs): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url);
        if (res.ok) return res;
        if (res.status === 429) {
            await new Promise(r => setTimeout(r, delayMs * (i + 1)));
            continue;
        }
        const errorText = await res.text();
        throw new Error(`ClinicalTrials API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    throw new Error(`Failed after ${retries} retries`);
}
