import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const SEARCH_PATENTS_TOOL: Tool = {
    name: "search_patents",
    description: "Search USPTO patents by assignee company, inventor, or keyword. Returns patent numbers, titles, filing dates, expiry dates.",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Keyword search (e.g., 'GLP-1 receptor agonist')" },
            assignee: { type: "string", description: "Company name (e.g., 'Novo Nordisk')" },
            filedAfter: { type: "string", description: "ISO date filter (e.g., '2015-01-01')" },
            filedBefore: { type: "string", description: "ISO date filter (e.g., '2020-12-31')" },
            maxResults: { type: "number", default: 10 },
        }
    }
};

export const GET_ORANGE_BOOK_ENTRY_TOOL: Tool = {
    name: "get_orange_book_entry",
    description: "Get FDA Orange Book patents and exclusivity data for an approved drug.",
    inputSchema: {
        type: "object",
        properties: {
            drugName: { type: "string", description: "Brand or generic drug name" }
        },
        required: ["drugName"]
    }
};

export const GET_PATENT_CLIFF_TOOL: Tool = {
    name: "get_patent_cliff",
    description: "Identify drugs losing patent protection within a specific time window for a given company.",
    inputSchema: {
        type: "object",
        properties: {
            company: { type: "string", description: "Company assignee name" },
            windowStartYear: { type: "number", description: "Start year for cliff window (e.g. 2025)" },
            windowEndYear: { type: "number", description: "End year for cliff window (e.g. 2030)" }
        },
        required: ["company"]
    }
};
