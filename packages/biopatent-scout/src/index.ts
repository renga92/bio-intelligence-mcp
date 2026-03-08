import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { SEARCH_PATENTS_TOOL, GET_ORANGE_BOOK_ENTRY_TOOL, GET_PATENT_CLIFF_TOOL } from "./tools.js";
import { handleSearchPatents } from "./handlers/searchPatents.js";
import { handleGetOrangeBookEntry } from "./handlers/getOrangeBookEntry.js";
import { handleGetPatentCliff } from "./handlers/getPatentCliff.js";

class BioPatentScoutServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            { name: "biopatent-scout", version: "1.0.0" },
            { capabilities: { tools: {}, resources: {}, prompts: {} } }
        );
        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [SEARCH_PATENTS_TOOL, GET_ORANGE_BOOK_ENTRY_TOOL, GET_PATENT_CLIFF_TOOL],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                if (request.params.name === "search_patents") return await handleSearchPatents(request.params.arguments as any);
                if (request.params.name === "get_orange_book_entry") return await handleGetOrangeBookEntry(request.params.arguments as any);
                if (request.params.name === "get_patent_cliff") return await handleGetPatentCliff(request.params.arguments as any);
                throw new Error(`Tool not found: ${request.params.name}`);
            } catch (err: any) {
                return { isError: true, content: [{ type: "text", text: err.message }] };
            }
        });
    }

    public async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("BioPatent Scout MCP Server running on stdio");
    }
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const server = new BioPatentScoutServer();
    server.run().catch(console.error);
}
