import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { GET_APPROVAL_TIMELINE_TOOL, GET_BREAKTHROUGH_DESIGNATIONS_TOOL } from "./tools.js";
import { handleGetApprovalTimeline } from "./handlers/getApprovalTimeline.js";
import { handleGetBreakthroughDesignations } from "./handlers/getBreakthroughDesignations.js";

class FdaIntelligenceServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            { name: "fda-intelligence", version: "1.0.0" },
            { capabilities: { tools: {}, resources: {}, prompts: {} } }
        );
        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [GET_APPROVAL_TIMELINE_TOOL, GET_BREAKTHROUGH_DESIGNATIONS_TOOL],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                if (request.params.name === "get_approval_timeline") return await handleGetApprovalTimeline(request.params.arguments as any);
                if (request.params.name === "get_breakthrough_designations") return await handleGetBreakthroughDesignations(request.params.arguments as any);
                throw new Error(`Tool not found: ${request.params.name}`);
            } catch (err: any) {
                return { isError: true, content: [{ type: "text", text: err.message }] };
            }
        });
    }

    public async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("FDA Intelligence MCP Server running on stdio");
    }
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const server = new FdaIntelligenceServer();
    server.run().catch(console.error);
}
