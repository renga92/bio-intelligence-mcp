import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { config } from "./config.js";
import { fetchWithRetry } from "./utils/fetchWithRetry.js";
import { handleSearchTrials } from "./handlers/searchTrials.js";
import { handleGetPipeline } from "./handlers/getPipeline.js";
import { handleGetConversionVelocity } from "./handlers/getConversionVelocity.js";
import { handleGetMarketImpact } from "./handlers/getMarketImpact.js";
import { handleGetLeaderboard } from "./handlers/getLeaderboard.js";
import { handleGetSuccessRates } from "./handlers/getSuccessRates.js";
import { handleGetCompetitiveLandscape } from "./handlers/getCompetitiveLandscape.js";
import { handleGetPharmaOlympics } from "./handlers/getPharmaOlympics.js";
import { handleGetTrial } from "./handlers/getTrial.js";
import { handleGetGeographicIntelligence } from "./handlers/getGeographicIntelligence.js";
import { handleGetModalityBreakdown } from "./handlers/getModalityBreakdown.js";
import { handleGetEnrollmentIntelligence } from "./handlers/getEnrollmentIntelligence.js";
import { handleGetEndpointLandscape } from "./handlers/getEndpointLandscape.js";
import { handleGetRegulatoryLandscape } from "./handlers/getRegulatoryLandscape.js";
import { handleGetCompanyDeepDive } from "./handlers/getCompanyDeepDive.js";
import { handleCompareCompanies } from "./handlers/compareCompanies.js";
import { handleGetTrialTimeline } from "./handlers/getTrialTimeline.js";

import {
    SEARCH_TRIALS_TOOL, GET_TRIAL_TOOL, GET_PIPELINE_TOOL,
    GET_CONVERSION_VELOCITY_TOOL, GET_MARKET_IMPACT_TOOL, GET_SUCCESS_RATES_TOOL,
    GET_COMPETITIVE_LANDSCAPE_TOOL, GET_PHARMA_OLYMPICS_TOOL, GET_LEADERBOARD_TOOL,
    GET_GEOGRAPHIC_INTELLIGENCE_TOOL, GET_MODALITY_BREAKDOWN_TOOL, GET_ENROLLMENT_INTELLIGENCE_TOOL,
    GET_ENDPOINT_LANDSCAPE_TOOL, GET_REGULATORY_LANDSCAPE_TOOL, GET_COMPANY_DEEP_DIVE_TOOL,
    COMPARE_COMPANIES_TOOL, GET_TRIAL_TIMELINE_TOOL
} from "./tools.js";

export class ClinicalTrialsServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            {
                name: "biopharma-sentinel",
                version: "2.0.0",
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
            tools: [
                SEARCH_TRIALS_TOOL,
                GET_TRIAL_TOOL,
                GET_PIPELINE_TOOL,
                GET_CONVERSION_VELOCITY_TOOL,
                GET_MARKET_IMPACT_TOOL,
                GET_LEADERBOARD_TOOL,
                GET_SUCCESS_RATES_TOOL,
                GET_COMPETITIVE_LANDSCAPE_TOOL,
                GET_PHARMA_OLYMPICS_TOOL,
                GET_GEOGRAPHIC_INTELLIGENCE_TOOL,
                GET_MODALITY_BREAKDOWN_TOOL,
                GET_ENROLLMENT_INTELLIGENCE_TOOL,
                GET_ENDPOINT_LANDSCAPE_TOOL,
                GET_REGULATORY_LANDSCAPE_TOOL,
                GET_COMPANY_DEEP_DIVE_TOOL,
                COMPARE_COMPANIES_TOOL,
                GET_TRIAL_TIMELINE_TOOL
            ],
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

        this.server.setRequestHandler(z.object({ method: z.literal("prompts/list") }), async () => ({
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
                {
                    name: "due_diligence_report",
                    description: "Orchestrator: Generate a deep-strategic audit of a company's pipeline, velocity, and success rates",
                    arguments: [
                        {
                            name: "company",
                            description: "Company to audit (e.g., 'Eli Lilly')",
                            required: true,
                        },
                        {
                            name: "therapeuticArea",
                            description: "Optional: Focus the audit on a specific area (e.g., 'GLP-1')",
                            required: false,
                        },
                    ],
                },
            ],
        }));

        this.server.setRequestHandler(z.object({ method: z.literal("prompts/get") }), async (request: any) => {
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

            if (request.params.name === "due_diligence_report") {
                const company = request.params.arguments?.company;
                const area = request.params.arguments?.therapeuticArea || "General Pipeline";
                return {
                    description: `Sentinel Due Diligence Orchestration: ${company}`,
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: `<thinking>\nI am orchestrating a deep-strategic audit for ${company} in the ${area} sector.\n\n` +
                                    `Plan:\n` +
                                    `1. Scan pipeline breadth using get_pipeline.\n` +
                                    `2. Audit technical success consistency using get_success_rates.\n` +
                                    `3. Benchmark conversion timelines using get_conversion_velocity.\n` +
                                    `4. Consolidate into a Sentinel Score.\n` +
                                    `</thinking>\n\n` +
                                    `Please initiate the audit for ${company}. Analyze the data through the lens of a BioPharma Sentinel Analyst.`
                            },
                        },
                    ],
                };
            }
            throw new Error("Prompt not found");
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            return this.handleToolCall(name, args);
        });
    }

    public async handleToolCall(name: string, args: any): Promise<any> {
        try {
            if (name === "search_trials") return await handleSearchTrials(args);
            if (name === "get_pipeline") return await handleGetPipeline(args);
            if (name === "get_conversion_velocity") return await handleGetConversionVelocity(args);
            if (name === "get_market_impact") return await handleGetMarketImpact(args);
            if (name === "get_leaderboard") {
                return await handleGetLeaderboard(args, async (n: string, a: any) => await this.handleToolCall(n, a));
            }
            if (name === "get_success_rates") return await handleGetSuccessRates(args);
            if (name === "get_competitive_landscape") return await handleGetCompetitiveLandscape(args);
            if (name === "get_pharma_olympics") {
                return await handleGetPharmaOlympics(args, async (n: string, a: any) => await this.handleToolCall(n, a));
            }
            if (name === "get_trial") return await handleGetTrial(args);

            if (name === "get_trial_timeline") return await handleGetTrialTimeline(args);
            if (name === "get_geographic_intelligence") return await handleGetGeographicIntelligence(args);
            if (name === "get_modality_breakdown") return await handleGetModalityBreakdown(args);
            if (name === "get_enrollment_intelligence") return await handleGetEnrollmentIntelligence(args);
            if (name === "get_endpoint_landscape") return await handleGetEndpointLandscape(args);
            if (name === "get_regulatory_landscape") return await handleGetRegulatoryLandscape(args);
            if (name === "get_company_deep_dive") {
                return await handleGetCompanyDeepDive(args, async (n: string, a: any) => await this.handleToolCall(n, a));
            }
            if (name === "compare_companies") {
                return await handleCompareCompanies(args, async (n: string, a: any) => await this.handleToolCall(n, a));
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
        console.error("BioPharma Sentinel MCP Server running on stdio");
    }
}

// Only run if this file is the entry point
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const server = new ClinicalTrialsServer();
    server.run().catch(console.error);
}
