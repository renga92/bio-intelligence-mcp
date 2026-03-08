import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { config } from "../config.js";

export async function handleGetMarketImpact(args: any) {
const { company, nctId } = args;

// 1. Get trial milestone date
const trialUrl = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
const trialRes = await fetchWithRetry(trialUrl);
if (!trialRes.ok) throw new Error(`ClinicalTrials API error: ${trialRes.statusText}`);
const trialData = await trialRes.json();

const milestoneDate = trialData.protocolSection?.statusModule?.completionDateStruct?.date ||
    trialData.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date;

// 2. Ticker lookup
const tickers: Record<string, string> = {
    "Pfizer": "PFE",
    "Moderna": "MRNA",
    "Eli Lilly": "LLY",
    "Lilly": "LLY",
    "Merck": "MRK",
    "AstraZeneca": "AZN",
    "GSK": "GSK",
    "Johnson & Johnson": "JNJ",
    "J&J": "JNJ",
    "Novartis": "NVS",
    "Roche": "RHHBY",
    "Bristol Myers Squibb": "BMY"
};

const ticker = tickers[company] || "UNKNOWN";

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;
if (!AV_KEY) {
    return {
        content: [{
            type: "text",
            text: `Market Impact Analysis for ${company} (${ticker})\nTrial: ${nctId} (${trialData.protocolSection?.identificationModule?.briefTitle || "Unknown"})\nMilestone Date: ${milestoneDate}\n\n⚠️ Set ALPHA_VANTAGE_API_KEY in environment to enable live stock correlation.\nTicker: ${ticker}`
        }]
    };
}

const addDays = (dateStr: string, days: number) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const toDate = milestoneDate ? addDays(milestoneDate, 30) : addDays(new Date().toISOString(), 30);

const priceUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${AV_KEY}&outputsize=compact`;
const priceRes = await fetchWithRetry(priceUrl);
const priceData = await priceRes.json();
const timeSeries = priceData["Time Series (Daily)"];

const milestonePrice = timeSeries && timeSeries[milestoneDate]?.["4. close"];
const t30Price = timeSeries && (timeSeries[toDate]?.["4. close"] || Object.values(timeSeries as Record<string, any>)[30]?.["4. close"]);
const realDelta = milestonePrice && t30Price
    ? (((parseFloat(t30Price) - parseFloat(milestonePrice)) / parseFloat(milestonePrice)) * 100).toFixed(2)
    : "N/A";

return {
    content: [{
        type: "text",
        text: `Market Impact Analysis for ${company} (${ticker})\n` +
            `Trial: ${nctId} (${trialData.protocolSection?.identificationModule?.briefTitle})\n` +
            `Milestone Date: ${milestoneDate}\n\n` +
            `Stock Performance Sync:\n` +
            `- Window: [T-0, T+30] days post-milestone\n` +
            `- Ticker: ${ticker}\n` +
            `- Price Movement: ${realDelta}%\n`
    }],
};
}
