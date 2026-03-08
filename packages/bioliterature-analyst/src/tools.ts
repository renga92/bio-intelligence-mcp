import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const SEARCH_PUBMED_TOOL: Tool = {
    name: "search_pubmed",
    description: "Search PubMed literature by keyword, disease, or drug. Returns papers with metadata.",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search term" },
            yearFrom: { type: "number", description: "Start year for publication date" },
            yearTo: { type: "number", description: "End year for publication date" },
            maxResults: { type: "number", default: 10 }
        },
        required: ["query"]
    }
};

export const GET_RESEARCH_VELOCITY_TOOL: Tool = {
    name: "get_research_velocity",
    description: "Measure publication growth velocity for a specific topic over recent years.",
    inputSchema: {
        type: "object",
        properties: {
            topic: { type: "string", description: "Topic to analyze (e.g., 'GLP-1 NASH')" },
            years: { type: "number", default: 5, description: "Number of years to analyze" }
        },
        required: ["topic"]
    }
};
