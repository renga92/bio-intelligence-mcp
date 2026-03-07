import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const SEARCH_TRIALS_TOOL: Tool = {
    name: "search_trials",
    description: "Search for clinical trials on ClinicalTrials.gov v2",
    inputSchema: {
        type: "object",
        properties: {
            condition: {
                type: "string",
                description: "Medical condition to search for (e.g., 'Alzheimer')",
            },
            status: {
                type: "string",
                description: "Trial status (e.g., 'RECRUITING', 'COMPLETED')",
                enum: ["RECRUITING", "COMPLETED", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING"],
            },
            maxResults: {
                type: "number",
                description: "Maximum number of results to return (default 5)",
                default: 5,
            },
        },
        required: ["condition"],
    },
};

const GET_TRIAL_TOOL: Tool = {
    name: "get_trial",
    description: "Get full details for a clinical trial by its NCT ID",
    inputSchema: {
        type: "object",
        properties: {
            nctId: {
                type: "string",
                description: "National Clinical Trial ID (e.g., 'NCT01234567')",
            },
        },
        required: ["nctId"],
    },
};

const server = new Server(
    {
        name: "clinicaltrials-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEARCH_TRIALS_TOOL, GET_TRIAL_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "search_trials") {
            const { condition, status, maxResults = 5 } = args as any;
            let url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(condition)}`;
            if (status) {
                url += `&filter.overallStatus=${status}`;
            }
            url += `&pageSize=${maxResults}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`ClinicalTrials API error: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }

        if (name === "get_trial") {
            const { nctId } = args as any;
            const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`ClinicalTrials API error: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error: any) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ClinicalTrials MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
