import { Tool } from "@modelcontextprotocol/sdk/types.js";

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

export const GET_PIPELINE_TOOL: Tool = {
    name: "get_pipeline",
    description: "Analyze a company's Phase 3 trial pipeline by therapeutic area",
    inputSchema: {
        type: "object",
        properties: {
            company: {
                type: "string",
                description: "Company name (sponsor) e.g., 'Pfizer'",
            },
        },
        required: ["company"],
    },
};

export const GET_CONVERSION_VELOCITY_TOOL: Tool = {
    name: "get_conversion_velocity",
    description: "Analyze 'Success Velocity' - how quickly a company moves trials from Phase 1 to Phase 3",
    inputSchema: {
        type: "object",
        properties: {
            company: {
                type: "string",
                description: "Company name (sponsor) e.g., 'Pfizer'",
            },
        },
        required: ["company"],
    },
};

export const GET_MARKET_IMPACT_TOOL: Tool = {
    name: "get_market_impact",
    description: "Volatility Gold: Correlate trial milestones with real stock price performance (Finnhub API)",
    inputSchema: {
        type: "object",
        properties: {
            company: {
                type: "string",
                description: "Company name (sponsor) e.g., 'Pfizer'",
            },
            nctId: {
                type: "string",
                description: "NCT ID of the trial that hit a milestone",
            },
        },
        required: ["company", "nctId"],
    },
};

export const GET_SUCCESS_RATES_TOOL: Tool = {
    name: "get_success_rates",
    description: "The Sharpshooter: Calculate Probability of Technical Success (PoS) based on historical Phase 3 outcomes",
    inputSchema: {
        type: "object",
        properties: {
            company: {
                type: "string",
                description: "Optional: Filter by specific company",
            },
            condition: {
                type: "string",
                description: "Optional: Filter by therapeutic area (e.g., 'Alzheimer')",
            },
        },
    },
};

export const GET_COMPETITIVE_LANDSCAPE_TOOL: Tool = {
    name: "get_competitive_landscape",
    description: "Analyze market crowding and identifying 'white space' in therapeutic areas",
    inputSchema: {
        type: "object",
        properties: {
            condition: {
                type: "string",
                description: "Medical condition to analyze (e.g., 'NASH')",
            },
        },
        required: ["condition"],
    },
};

export const GET_PHARMA_OLYMPICS_TOOL: Tool = {
    name: "get_pharma_olympics",
    description: "Pharma Olympics: View the unified medal table based on speed, success, and pipeline size",
    inputSchema: {
        type: "object",
        properties: {
            category: {
                type: "string",
                enum: ["sprinter", "heavyweight", "sharpshooter", "volatility", "overall"],
                description: "Olympic category to view",
            },
        },
    },
};

export const GET_LEADERBOARD_TOOL: Tool = {
    name: "get_leaderboard",
    description: "Pharma Olympics: Rate top 10 companies by pipeline, velocity, or therapeutic focus",
    inputSchema: {
        type: "object",
        properties: {
            metric: {
                type: "string",
                description: "Metric to rank by ('pipeline_size', 'velocity')",
                enum: ["pipeline_size", "velocity"],
            },
            focus: {
                type: "string",
                description: "Optional therapeutic focus or drug class (e.g., 'GLP-1')",
            },
        },
        required: ["metric"],
    },
};

export const GET_GEOGRAPHIC_INTELLIGENCE_TOOL: Tool = {
    name: "get_geographic_intelligence",
    description: "Map the geographic distribution of trials for a condition — which countries, sites, and regions are most active",
    inputSchema: {
        type: "object",
        properties: {
            condition: { type: "string", description: "Medical condition or drug name" },
            phase: { type: "string", enum: ["PHASE1", "PHASE2", "PHASE3", "PHASE4"], description: "Optional phase filter" }
        },
        required: ["condition"]
    }
};

export const GET_MODALITY_BREAKDOWN_TOOL: Tool = {
    name: "get_modality_breakdown",
    description: "Analyze the therapeutic modality mix (small molecule, biologic, gene therapy, cell therapy) in a disease area",
    inputSchema: {
        type: "object",
        properties: {
            condition: { type: "string", description: "Medical condition to analyze" }
        },
        required: ["condition"]
    }
};

export const GET_ENROLLMENT_INTELLIGENCE_TOOL: Tool = {
    name: "get_enrollment_intelligence",
    description: "Analyze enrollment patterns, trial duration benchmarks, and site density for a condition or company",
    inputSchema: {
        type: "object",
        properties: {
            condition: { type: "string" },
            company: { type: "string" }
        }
    }
};

export const GET_ENDPOINT_LANDSCAPE_TOOL: Tool = {
    name: "get_endpoint_landscape",
    description: "Identify the most common primary endpoints and outcome measures used in trials for a condition",
    inputSchema: {
        type: "object",
        properties: {
            condition: { type: "string", description: "Disease area to analyze" },
            phase: { type: "string", enum: ["PHASE2", "PHASE3"] }
        },
        required: ["condition"]
    }
};

export const GET_REGULATORY_LANDSCAPE_TOOL: Tool = {
    name: "get_regulatory_landscape",
    description: "Cross-reference trial activity with FDA approval status using OpenFDA API",
    inputSchema: {
        type: "object",
        properties: {
            drug: { type: "string", description: "Drug or active ingredient name" },
            company: { type: "string", description: "Optional sponsor company name" }
        },
        required: ["drug"]
    }
};

export const GET_COMPANY_DEEP_DIVE_TOOL: Tool = {
    name: "get_company_deep_dive",
    description: "Full 360° intelligence report on a pharma company: pipeline, velocity, success rates, therapeutic focus, and geographic footprint",
    inputSchema: {
        type: "object",
        properties: {
            company: { type: "string" }
        },
        required: ["company"]
    }
};

export const COMPARE_COMPANIES_TOOL: Tool = {
    name: "compare_companies",
    description: "Head-to-head competitive comparison of two pharma companies across pipeline, velocity, and success metrics",
    inputSchema: {
        type: "object",
        properties: {
            company_a: { type: "string" },
            company_b: { type: "string" },
            condition: { type: "string", description: "Optional: restrict comparison to a specific therapeutic area" }
        },
        required: ["company_a", "company_b"]
    }
};

export const GET_TRIAL_TIMELINE_TOOL: Tool = {
    name: "get_trial_timeline",
    description: "Construct a milestone timeline for a specific trial from start to completion",
    inputSchema: {
        type: "object",
        properties: {
            nctId: { type: "string" }
        },
        required: ["nctId"]
    }
};
