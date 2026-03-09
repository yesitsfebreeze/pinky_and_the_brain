"use strict";
/**
 * p&b MCP Server entry point.
 *
 * Registers all tools and resources, then starts the MCP server over stdio.
 *
 * Tools registered:
 *   remember, forget, query, prune, sync,
 *   plan_add, plan_next, plan_complete
 *
 * Resources registered:
 *   patb://thoughts, patb://tree, patb://changes, patb://plan
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const config_js_1 = require("./config.js");
const remember_js_1 = require("./tools/remember.js");
const forget_js_1 = require("./tools/forget.js");
const query_js_1 = require("./tools/query.js");
const prune_js_1 = require("./tools/prune.js");
const sync_js_1 = require("./tools/sync.js");
const plan_js_1 = require("./tools/plan.js");
const resources_js_1 = require("./resources.js");
// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const config = (0, config_js_1.resolveConfig)();
const server = new index_js_1.Server({ name: 'patb', version: '1.0.0' }, {
    capabilities: {
        tools: {},
        resources: {},
    },
});
// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
const TOOLS = [
    {
        name: 'remember',
        description: 'Store a note in the p&b brain memory (thoughts.md). Provide a title, body, and 0–1000 rating.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Short descriptive title' },
                body: { type: 'string', description: 'Note body text' },
                rating: { type: 'number', description: 'Usefulness score 0–1000' },
                concepts: { type: 'string', description: 'Comma-separated concept tags' },
                sources: { type: 'string', description: 'Comma-separated source file paths' },
                relatedNotes: { type: 'string', description: 'Comma-separated related note titles' },
                force: { type: 'boolean', description: 'Store even if below MIN_RATING' },
            },
            required: ['title', 'body', 'rating'],
        },
    },
    {
        name: 'forget',
        description: 'Search memory for matching notes and optionally remove them.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search text' },
                confirmed: { type: 'boolean', description: 'Set true to actually delete matches' },
                ids: { type: 'array', items: { type: 'string' }, description: 'Restrict deletion to these note titles' },
            },
            required: ['query'],
        },
    },
    {
        name: 'query',
        description: 'Retrieve the most relevant notes for a topic using the relevance formula.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Topic or question to search for' },
                maxResults: { type: 'number', description: 'Override MAX_CONTEXT_NOTES' },
            },
            required: ['query'],
        },
    },
    {
        name: 'prune',
        description: 'Remove all notes below PRUNE_THRESHOLD. Pass dryRun=true to preview.',
        inputSchema: {
            type: 'object',
            properties: {
                dryRun: { type: 'boolean', description: 'Preview without making changes' },
            },
        },
    },
    {
        name: 'sync',
        description: 'Pull --rebase the brain repo and push any local changes.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'plan_add',
        description: 'Append a todo item below the separator in @plan.',
        inputSchema: {
            type: 'object',
            properties: {
                todo: { type: 'string', description: 'Todo text (with or without "- [ ] " prefix)' },
            },
            required: ['todo'],
        },
    },
    {
        name: 'plan_next',
        description: 'Return the next pending todo from @plan (below the separator).',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'plan_complete',
        description: 'Remove a completed todo from @plan by text match.',
        inputSchema: {
            type: 'object',
            properties: {
                todo: { type: 'string', description: 'Partial or full todo text to match and remove' },
            },
            required: ['todo'],
        },
    },
];
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
        let result;
        switch (name) {
            case 'remember':
                result = await (0, remember_js_1.remember)(config, args);
                break;
            case 'forget':
                result = await (0, forget_js_1.forget)(config, args);
                break;
            case 'query':
                result = await (0, query_js_1.query)(config, args);
                break;
            case 'prune':
                result = await (0, prune_js_1.prune)(config, args ?? {});
                break;
            case 'sync':
                result = await (0, sync_js_1.sync)(config);
                break;
            case 'plan_add':
                result = await (0, plan_js_1.planAdd)(config, args);
                break;
            case 'plan_next':
                result = await (0, plan_js_1.planNext)(config);
                break;
            case 'plan_complete':
                result = await (0, plan_js_1.planComplete)(config, args);
                break;
            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
});
// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
const RESOURCES = [
    { uri: 'patb://thoughts', name: 'Note pool', mimeType: 'text/markdown', description: 'Full rated note pool (thoughts.md)' },
    { uri: 'patb://tree', name: 'File tree', mimeType: 'text/markdown', description: 'File impact map (tree.md)' },
    { uri: 'patb://changes', name: 'Changes', mimeType: 'text/markdown', description: 'Changelog (changes.md)' },
    { uri: 'patb://plan', name: 'Plan', mimeType: 'text/markdown', description: '@plan todo file' },
];
server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));
server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (req) => {
    const { uri } = req.params;
    let resource;
    switch (uri) {
        case 'patb://thoughts':
            resource = await (0, resources_js_1.getThoughtsResource)(config);
            break;
        case 'patb://tree':
            resource = await (0, resources_js_1.getTreeResource)(config);
            break;
        case 'patb://changes':
            resource = await (0, resources_js_1.getChangesResource)(config);
            break;
        case 'patb://plan':
            resource = await (0, resources_js_1.getPlanResource)(config);
            break;
        default:
            return { contents: [{ uri, mimeType: 'text/plain', text: `Unknown resource: ${uri}` }] };
    }
    return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.text }] };
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    // Server runs until process exits
}
main().catch((err) => {
    process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
