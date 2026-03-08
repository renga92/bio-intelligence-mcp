import dotenv from "dotenv";

dotenv.config();

export const config = {
    usptoApiKey: process.env.USPTO_API_KEY || "",
    twelveDataKey: process.env.TWELVE_DATA_API_KEY || "",
    ncbiApiKey: process.env.NCBI_API_KEY || "",
    finnhubKey: process.env.FINNHUB_API_KEY || "",
    maxPagesPerQuery: parseInt(process.env.MAX_PAGES_PER_QUERY || "5", 10),
};
