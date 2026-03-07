import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const SEARCH_TRIALS_TOOL: Tool = {
    name: "search_trials",
    description: "Search for clinical trials on ClinicalTrials.gov v2 using advanced filters",
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
            phases: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["PHASE1", "PHASE2", "PHASE3", "PHASE4", "NA"],
                },
                description: "Clinical trial phases to filter by",
            },
            studyTypes: {
                type: "array",
                items: {
                    type: "string",
                    enum: ["INTERVENTIONAL", "OBSERVATIONAL", "EXPANDED_ACCESS"],
                },
                description: "Study types (e.g., 'INTERVENTIONAL' for drug trials)",
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

export const GET_TRIAL_TOOL: Tool = {
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

export class ClinicalTrialsServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            {
                name: "clinicaltrials-mcp-server",
                version: "1.1.0",
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {},
                },
            }
        );

        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [SEARCH_TRIALS_TOOL, GET_TRIAL_TOOL],
        }));

        this.server.setRequestHandler(z.object({ method: z.literal("resources/list") }), async () => ({
            resources: [
                {
                    uri: "clinicaltrials://schema",
                    name: "ClinicalTrials.gov Data Schema",
                    mimeType: "application/json",
                    description: "Schema describing the structure of ClinicalTrials.gov v2 study objects",
                },
            ],
        }));

        this.server.setRequestHandler(z.object({ method: z.literal("resources/read") }), async (request: any) => {
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

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            return this.handleToolCall(name, args);
        });
    }

    public async handleToolCall(name: string, args: any) {
        try {
            if (name === "search_trials") {
                const { condition, status, phases, studyTypes, maxResults = 5 } = args;
                let url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(condition)}`;

                if (status) url += `&filter.overallStatus=${status}`;
                if (phases && phases.length > 0) url += `&filter.phases=${phases.join(",")}`;
                if (studyTypes && studyTypes.length > 0) url += `&filter.studyTypes=${studyTypes.join(",")}`;

                url += `&pageSize=${maxResults}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error(`ClinicalTrials API error: ${response.statusText}`);
                const data = await response.json();
                return {
                    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                };
            }

            if (name === "get_trial") {
                const { nctId } = args;
                const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`ClinicalTrials API error: ${response.statusText}`);
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
    }

    public async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("ClinicalTrials MCP Server running on stdio");
    }
}

// Only run if this file is the entry point
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const server = new ClinicalTrialsServer();
    server.run().catch(console.error);
}
