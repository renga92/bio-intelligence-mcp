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
            resources: {},
            prompts: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEARCH_TRIALS_TOOL, GET_TRIAL_TOOL],
}));

// Added Resources
server.setRequestHandler(z.object({ method: z.literal("resources/list") }), async () => ({
    resources: [
        {
            uri: "clinicaltrials://schema",
            name: "ClinicalTrials.gov Data Schema",
            mimeType: "application/json",
            description: "Schema describing the structure of ClinicalTrials.gov v2 study objects",
        },
    ],
}));

server.setRequestHandler(z.object({ method: z.literal("resources/read") }), async (request: any) => {
    if (request.params.uri === "clinicaltrials://schema") {
        return {
            contents: [
                {
                    uri: "clinicaltrials://schema",
                    mimeType: "application/json",
                    text: JSON.stringify({
                        study: {
                            nctId: "NCT string",
                            protocolSection: {
                                identificationModule: "Trial IDs and titles",
                                statusModule: "Overall status",
                                descriptionModule: "Brief and detailed summaries",
                                conditionsModule: "Medical conditions",
                                designModule: "Study type, phase, and design",
                            },
                        },
                    }, null, 2),
                },
            ],
        };
    }
    throw new Error("Resource not found");
});

// Added Prompts
server.setRequestHandler(z.object({ method: z.literal("prompts/list") }), async () => ({
    prompts: [
        {
            name: "interpret_trial",
            description: "Interpret a complex clinical trial record for a patient",
            arguments: [
                {
                    name: "trialData",
                    description: "The JSON study data from get_trial",
                    required: true,
                },
            ],
        },
    ],
}));

server.setRequestHandler(z.object({ method: z.literal("prompts/get") }), async (request: any) => {
    if (request.params.name === "interpret_trial") {
        const trialData = request.params.arguments?.trialData;
        return {
            description: "Interpret a complex clinical trial record",
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `Please interpret the following clinical trial data in patient-friendly language. Explain the goal, eligibility criteria, and clinical trial status:\n\n${trialData}`,
                    },
                },
            ],
        };
    }
    throw new Error("Prompt not found");
});

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
