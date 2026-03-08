import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { SEARCH_PUBMED_TOOL, GET_RESEARCH_VELOCITY_TOOL } from "./tools.js";
import { handleSearchPubmed } from "./handlers/searchPubmed.js";
import { handleGetResearchVelocity } from "./handlers/getResearchVelocity.js";

class BioLiteratureAnalystServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            { name: "bioliterature-analyst", version: "1.0.0" },
            { capabilities: { tools: {}, resources: {}, prompts: {} } }
        );
        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [SEARCH_PUBMED_TOOL, GET_RESEARCH_VELOCITY_TOOL],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                if (request.params.name === "search_pubmed") return await handleSearchPubmed(request.params.arguments as any);
                if (request.params.name === "get_research_velocity") return await handleGetResearchVelocity(request.params.arguments as any);
                throw new Error(`Tool not found: ${request.params.name}`);
            } catch (err: any) {
                return { isError: true, content: [{ type: "text", text: err.message }] };
            }
        });
    }

    public async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("BioLiterature Analyst MCP Server running on stdio");
    }
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const server = new BioLiteratureAnalystServer();
    server.run().catch(console.error);
}
