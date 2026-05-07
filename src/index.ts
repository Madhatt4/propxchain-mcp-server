// PropXchain MCP Server - STDIO Transport
//
// SECURITY MODEL: Ed25519 Bot Identity
// The bot's private key (32-byte seed) is loaded from BOT_PRIVATE_KEY env var.
// A shared CanisterClient is created with this identity. All canister calls
// are made AS the bot's principal. The canister enforces access control —
// the bot can only access transactions it's been added to via connectBot().

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Identity } from '@icp-sdk/core/agent';
import { z } from 'zod';

import { CanisterClient } from './canister-client.js';
import { loadBotConfig, createBotIdentity } from './auth.js';
import type { ToolResult } from './types/index.js';

import { transactionTools } from './tools/transactions.js';
import { documentTools } from './tools/documents.js';
import { checklistTools } from './tools/checklists.js';
import { propertyIntelTools } from './tools/property-intel.js';
import { educationTools } from './tools/education.js';
import { botManagementTools } from './tools/bot-management.js';

// ============================================================
// Configuration
// ============================================================

const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const SERVER_NAME = 'propxchain-mcp-server';
const SERVER_VERSION = '2.0.0';

// ============================================================
// Tool Registry
// ============================================================

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>,
    client: CanisterClient,
  ) => Promise<ToolResult<unknown>>;
}

const allTools: ToolDefinition[] = [
  ...transactionTools,
  ...documentTools,
  ...checklistTools,
  ...propertyIntelTools,
  ...educationTools,
  ...botManagementTools,
] as ToolDefinition[];

// ============================================================
// Bootstrap
// ============================================================

async function main(): Promise<void> {
  // Load bot identity (env override, local file, or first-run generated)
  const config = loadBotConfig();
  const identity = createBotIdentity(config);

  // Create a shared client with the bot's identity
  const client = new CanisterClient(IC_HOST, identity as Identity);

  const botPrincipal = (identity as { getPrincipal(): { toText(): string; isAnonymous(): boolean } }).getPrincipal().toText();

  // Fail fast if identity resolves to anonymous — means the seed is invalid
  const principal = (identity as { getPrincipal(): { isAnonymous(): boolean } }).getPrincipal();
  if (principal.isAnonymous()) {
    process.stderr.write('FATAL: Bot identity resolved to anonymous principal (2vxsx-fae).\n');
    process.stderr.write(`Check the seed source. Source: ${config.source}${config.filePath ? ` (${config.filePath})` : ''}.\n`);
    process.exit(1);
  }

  // ============================================================
  // MCP Server Setup
  // ============================================================

  const mcpServer = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all tools — each handler receives the shared client.
  //
  // SDK v1.26.0 requires Zod schemas for tool registration. The positional
  // mcpServer.tool(name, desc, schema, cb) API calls isZodRawShapeCompat()
  // on the schema arg — raw JSON Schema objects fail this check and get
  // silently treated as ToolAnnotations, causing args to be dropped.
  //
  // Fix: use registerTool() with z.record(z.unknown()) as a permissive
  // AnySchema that passes all args through. Each handler does its own
  // full Zod validation internally.
  const permissiveInputSchema = z.record(z.unknown());

  for (const tool of allTools) {
    mcpServer.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: permissiveInputSchema,
      },
      async (args: Record<string, unknown>) => {
        const result = await tool.handler(args, client);

        if (result.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { error: result.error, code: result.code },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      },
    );
  }

  // Register MCP resources
  mcpServer.resource(
    'conveyancing-guide',
    'propxchain://docs/conveyancing',
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text:
            'PropXchain Conveyancing Guide\n\n' +
            'UK property conveyancing follows these stages:\n' +
            '1. Instruction - appoint solicitors\n' +
            '2. Pre-contract - searches, enquiries, draft contract\n' +
            '3. Exchange - both parties sign, deposit paid, legally binding\n' +
            '4. Completion - funds transfer, keys handed over\n' +
            '5. Post-completion - SDLT, Land Registry registration\n\n' +
            'Use propxchain_explain_process for detailed explanations of each stage.',
        },
      ],
    }),
  );

  mcpServer.resource(
    'api-overview',
    'propxchain://docs/api',
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text:
            `PropXchain MCP Server API\n\n` +
            `Bot Principal: ${botPrincipal}\n` +
            `Available tools: ${allTools.length}\n` +
            `Categories:\n` +
            `  - Transactions (6): search, get, status, create, join, chain\n` +
            `  - Documents (3): verify, list, upload\n` +
            `  - Checklists (2): get, update\n` +
            `  - Property Intel (1): postcode-based intelligence\n` +
            `  - Education (2): explain process, send message\n` +
            `  - Bot Management (2): list transactions, list bots\n\n` +
            `Security: Ed25519 bot identity — canister enforces access control\n` +
            `Transport: STDIO`,
        },
      ],
    }),
  );

  // ============================================================
  // Start STDIO Transport
  // ============================================================

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  process.stderr.write(`PropXchain MCP Server v${SERVER_VERSION}\n`);
  process.stderr.write(`  Bot:      ${botPrincipal}\n`);
  process.stderr.write(`  Tools:    ${allTools.length}\n`);
  process.stderr.write(`  IC Host:  ${IC_HOST}\n`);
  process.stderr.write(`  Security: Ed25519 bot identity (canister-enforced access control)\n`);
  process.stderr.write(`  Transport: STDIO\n`);
  if (config.source === 'generated') {
    process.stderr.write(`  Identity: FRESH KEYPAIR generated at ${config.filePath ?? 'unknown'}\n`);
    process.stderr.write(`            Bot principal is ${botPrincipal}.\n`);
    process.stderr.write(`            To start using this bot, ask your AI agent to "join transaction TX-XXXX-XXXX".\n`);
  } else if (config.source === 'file') {
    process.stderr.write(`  Identity: loaded from ${config.filePath ?? 'unknown'}\n`);
  } else {
    process.stderr.write(`  Identity: loaded from BOT_PRIVATE_KEY env var (override)\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
