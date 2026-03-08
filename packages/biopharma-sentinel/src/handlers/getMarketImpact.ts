import { fetchWithRetry, config } from "@biopharma/shared";

const TICKERS: Record<string, string> = {
    "Pfizer": "PFE",
    "Moderna": "MRNA",
    "Eli Lilly": "LLY",
    "Lilly": "LLY",
    "Merck": "MRK",
    "AstraZeneca": "AZN",
    "Roche": "ROG",
    "Novartis": "NVS",
    "GSK": "GSK",
    "Johnson & Johnson": "JNJ",
    "J&J": "JNJ",
    "Bristol Myers Squibb": "BMY",
    "Vertex": "VRTX",
    "Regeneron": "REGN",
    "Biogen": "BIIB",
    "Gilead": "GILD",
    "Amgen": "AMGN",
    "Novo Nordisk": "NVO",
    "Sanofi": "SNY",
    "Sun Pharma": "SUNPHARMA",
};

export async function handleGetMarketImpact(args: any) {
    const { company, nctId } = args;

    // 1. Get trial milestone date from ClinicalTrials.gov
    const trialUrl = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
    const trialRes = await fetchWithRetry(trialUrl);
    if (!trialRes.ok) throw new Error(`ClinicalTrials API error: ${trialRes.statusText}`);
    const trialData = await trialRes.json();

    const briefTitle = trialData.protocolSection?.identificationModule?.briefTitle ?? "Unknown";
    const milestoneDate = trialData.protocolSection?.statusModule?.completionDateStruct?.date ||
        trialData.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date;

    const ticker = TICKERS[company] ?? company.toUpperCase();

    // 2. Check for API key — use Twelve Data (same key as getStockPerformance)
    if (!config.twelveDataKey) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    company,
                    ticker,
                    trial: { nctId, briefTitle, milestoneDate },
                    stockData: null,
                    note: "Set TWELVE_DATA_API_KEY in your environment to enable live stock-price correlation. Free tier: https://twelvedata.com",
                    fallbackInfo: `Manual tracking: https://finance.yahoo.com/quote/${ticker}`,
                    dataSource: "ClinicalTrials.gov (trial data) + Twelve Data (stock, requires key)",
                    asOf: new Date().toISOString(),
                }, null, 2)
            }]
        };
    }

    // 3. Fetch price history from Twelve Data
    // Use outputsize=60 to cover ±30 days around the milestone
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=60&apikey=${config.twelveDataKey}`;
    const priceRes = await fetchWithRetry(url);
    const priceData = await priceRes.json();

    if (priceData.status === "error") {
        return { content: [{ type: "text", text: `Twelve Data error: ${priceData.message}` }] };
    }

    const series: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume: string }> =
        priceData.values ?? [];

    const addDays = (dateStr: string, days: number): string => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    };

    let milestoneAnalysis = null;
    if (milestoneDate && series.length > 0) {
        // Find the price closest to the milestone date
        const milestoneIdx = series.findIndex(s => s.datetime <= milestoneDate);
        const postDate = addDays(milestoneDate, 30);
        const postIdx = series.findIndex(s => s.datetime <= postDate);

        const prePrice = milestoneIdx >= 0 ? parseFloat(series[milestoneIdx].close) : null;
        const postPrice = postIdx >= 0 && postIdx !== milestoneIdx ? parseFloat(series[postIdx].close) : null;

        if (prePrice && postPrice) {
            const eventReturn = (((postPrice - prePrice) / prePrice) * 100).toFixed(2);
            milestoneAnalysis = {
                milestoneDate,
                priceAtMilestone: prePrice,
                priceAfterDays: postPrice,
                windowDays: 30,
                eventReturn: `${eventReturn}%`,
                interpretation: parseFloat(eventReturn) > 5 ? "Strong positive market reaction" :
                    parseFloat(eventReturn) < -5 ? "Negative market reaction" : "Muted market reaction",
            };
        }
    }

    const latest = series.length > 0 ? parseFloat(series[0].close) : null;
    const oldest = series.length > 0 ? parseFloat(series[series.length - 1].close) : null;
    const periodReturn = latest && oldest ? (((latest - oldest) / oldest) * 100).toFixed(2) : null;

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                company,
                ticker,
                exchange: priceData.meta?.exchange,
                currency: priceData.meta?.currency,
                trial: { nctId, briefTitle, milestoneDate },
                currentPrice: latest,
                periodReturn: periodReturn ? `${periodReturn}%` : null,
                milestoneAnalysis,
                dataSource: "ClinicalTrials.gov + Twelve Data API",
                asOf: new Date().toISOString(),
            }, null, 2)
        }]
    };
}

