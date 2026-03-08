import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { GET_STOCK_PERFORMANCE_TOOL, GET_SEC_FILING_TOOL } from "./tools.js";
import { handleGetStockPerformance } from "./handlers/getStockPerformance.js";
import { handleGetSecFiling } from "./handlers/getSecFiling.js";

class BioMarketPulseServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            { name: "biomarket-pulse", version: "1.0.0" },
            { capabilities: { tools: {}, resources: {}, prompts: {} } }
        );
        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [GET_STOCK_PERFORMANCE_TOOL, GET_SEC_FILING_TOOL],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                if (request.params.name === "get_stock_performance") return await handleGetStockPerformance(request.params.arguments as any);
                if (request.params.name === "get_sec_filing") return await handleGetSecFiling(request.params.arguments as any);
                throw new Error(`Tool not found: ${request.params.name}`);
            } catch (err: any) {
                return { isError: true, content: [{ type: "text", text: err.message }] };
            }
        });
    }

    public async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("BioMarket Pulse MCP Server running on stdio");
    }
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const server = new BioMarketPulseServer();
    server.run().catch(console.error);
}
