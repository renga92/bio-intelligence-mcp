import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const GET_STOCK_PERFORMANCE_TOOL: Tool = {
    name: "get_stock_performance",
    description: "Get real-time stock performance and historical analysis for pharmaceutical companies.",
    inputSchema: {
        type: "object",
        properties: {
            company: { type: "string", description: "Company name (e.g., 'Pfizer', 'Eli Lilly')" },
            milestoneDate: { type: "string", description: "ISO date to analyze window around an event" },
            windowDays: { type: "number", default: 30, description: "Days after milestone to measure impact" }
        },
        required: ["company"]
    }
};

export const GET_SEC_FILING_TOOL: Tool = {
    name: "get_sec_filing",
    description: "Retrieve latest SEC EDGAR filings (10-K, 10-Q, 8-K) for a US-listed company.",
    inputSchema: {
        type: "object",
        properties: {
            company: { type: "string", description: "Company identifier" },
            filingType: { type: "string", enum: ["10-K", "10-Q", "8-K", "S-1"], default: "10-K" },
            maxResults: { type: "number", default: 5 }
        },
        required: ["company"]
    }
};
