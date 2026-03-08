import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const GET_APPROVAL_TIMELINE_TOOL: Tool = {
    name: "get_approval_timeline",
    description: "Get the full FDA approval timeline for a drug, including submission phases and review times.",
    inputSchema: {
        type: "object",
        properties: {
            drug: { type: "string", description: "Brand name of the drug (e.g., 'Keytruda')" }
        },
        required: ["drug"]
    }
};

export const GET_BREAKTHROUGH_DESIGNATIONS_TOOL: Tool = {
    name: "get_breakthrough_designations",
    description: "Find FDA Breakthrough Therapy Designations by condition or company.",
    inputSchema: {
        type: "object",
        properties: {
            condition: { type: "string", description: "Medical condition (e.g., 'NASH', 'Alzheimer')" },
            company: { type: "string", description: "Sponsor company name" }
        }
    }
};
