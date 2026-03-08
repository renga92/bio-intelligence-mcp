import { fetchWithRetry, config } from "@biopharma/shared";

const PHARMA_TICKERS: Record<string, string> = {
    "Pfizer": "PFE",
    "Eli Lilly": "LLY",
    "Lilly": "LLY",
    "Moderna": "MRNA",
    "Merck": "MRK",
    "AstraZeneca": "AZN",
    "Roche": "ROG",
    "Novartis": "NVS",
    "GSK": "GSK",
    "Johnson & Johnson": "JNJ",
    "Bristol Myers Squibb": "BMY",
    "Vertex": "VRTX",
    "Regeneron": "REGN",
    "Biogen": "BIIB",
    "Gilead": "GILD",
    "Amgen": "AMGN",
    "Novo Nordisk": "NVO",
    "Sanofi": "SNY",
    "Bayer": "BAYN",
    "Sun Pharma": "SUNPHARMA",
    "Cipla": "CIPLA",
    "Dr Reddy": "DRREDDY",
};

export async function handleGetStockPerformance(args: {
    company: string;
    milestoneDate?: string;
    windowDays?: number;
}) {
    const { company, milestoneDate, windowDays = 30 } = args;
    const ticker = PHARMA_TICKERS[company] || company.toUpperCase();

    if (!config.twelveDataKey) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    company,
                    ticker,
                    stockData: null,
                    note: "Set TWELVE_DATA_API_KEY in environment for live stock data. Register free at https://twelvedata.com",
                    fallbackInfo: `Ticker symbol for ${company} is ${ticker}. Track manually at https://finance.yahoo.com/quote/${ticker}`,
                }, null, 2)
            }]
        };
    }

    const outputSize = milestoneDate ? windowDays + 10 : 30;
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=${outputSize}&apikey=${config.twelveDataKey}`;

    const res = await fetchWithRetry(url);
    const data = await res.json();

    if (data.status === "error") {
        throw new Error(`Twelve Data API error: ${data.message}`);
    }

    const series = data.values as Array<{
        datetime: string;
        open: string; high: string; low: string; close: string; volume: string;
    }>;

    if (!series?.length) {
        return { content: [{ type: "text", text: `No price data found for ticker: ${ticker}` }] };
    }

    const latest = parseFloat(series[0].close);
    const oldest = parseFloat(series[series.length - 1].close);
    const periodReturn = (((latest - oldest) / oldest) * 100).toFixed(2);
    const high30 = Math.max(...series.map(s => parseFloat(s.high)));
    const low30 = Math.min(...series.map(s => parseFloat(s.low)));

    let milestoneAnalysis = null;
    if (milestoneDate) {
        const milestoneIdx = series.findIndex(s => s.datetime >= milestoneDate);
        const prePrice = milestoneIdx >= 0 ? parseFloat(series[milestoneIdx].close) : null;
        const postIdx = Math.max(0, milestoneIdx - windowDays);
        const postPrice = milestoneIdx >= 0 ? parseFloat(series[postIdx].close) : null;

        if (prePrice && postPrice) {
            const eventReturn = (((postPrice - prePrice) / prePrice) * 100).toFixed(2);
            milestoneAnalysis = {
                milestoneDate,
                priceAtMilestone: prePrice,
                priceAfterDays: postPrice,
                windowDays,
                eventReturn: `${eventReturn}%`,
                interpretation: parseFloat(eventReturn) > 5 ? "Strong positive market reaction" :
                    parseFloat(eventReturn) < -5 ? "Negative market reaction" :
                        "Muted market reaction",
            };
        }
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                company,
                ticker,
                exchange: data.meta?.exchange,
                currency: data.meta?.currency,
                latestClose: latest,
                periodReturn: `${periodReturn}%`,
                periodHigh: high30,
                periodLow: low30,
                dataPoints: series.length,
                milestoneAnalysis,
                dataSource: "Twelve Data API",
                asOf: new Date().toISOString(),
                note: "Twelve Data free tier: 800 req/day, 8 req/min. Real-time US market data.",
            }, null, 2)
        }]
    };
}
