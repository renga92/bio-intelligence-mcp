import dotenv from "dotenv";
dotenv.config();

export const config = {
    alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || null,
    finnhubKey: process.env.FINNHUB_API_KEY || null,
    maxPagesPerQuery: parseInt(process.env.MAX_PAGES || "10", 10),
    rateLimitDelayMs: parseInt(process.env.RATE_LIMIT_DELAY_MS || "300", 10),
};
