// PropXchain MCP Server - Bot Management Tools
// Tools for bots to self-register, discover their transactions, and view
// connected bots.

import { z } from 'zod';
import {
  type CanisterClient,
  convertTransaction,
  principalToString,
} from '../canister-client.js';
import type { ToolResult, BotConnectionInfo } from '../types/index.js';

export const botManagementTools = [
  {
    name: 'propxchain_join_transaction_as_bot',
    description:
      'Join a PropXchain transaction as a bot using an invite code. The user shares the invite code (TX-XXXX-XXXX format) to grant this MCP server access. After joining, the bot can read the transaction, document proofs, and phase status, and create documents the user has authorised. Idempotent. Revocable by any participant via the consumer UI.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        inviteCode: {
          type: 'string',
          description: 'Transaction invite code, format TX-XXXX-XXXX. The user gets this from the transaction page on propxchain.com.',
        },
        botName: {
          type: 'string',
          description: 'Display name shown to participants in the bot list (e.g. "Claude Desktop", "Marc\'s assistant"). Max 64 characters.',
        },
      },
      required: ['inviteCode', 'botName'],
    },
    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      try {
        const { inviteCode, botName } = z
          .object({
            inviteCode: z
              .string()
              .min(1, 'Invite code is required')
              .max(32, 'Invite code looks too long; double-check the format')
              .regex(/^TX-[A-Z0-9]+-[A-Z0-9]+$/, 'Invite code must look like TX-XXXX-XXXX'),
            botName: z
              .string()
              .min(1, 'Bot name is required')
              .max(64, 'Bot name must be 64 characters or fewer'),
          })
          .parse(args);

        const actor = client.getTransactionManager() as Record<string, (...args: unknown[]) => Promise<unknown>>;
        const result = (await actor.joinAsBotByInviteCode(inviteCode, botName)) as Record<string, unknown>;

        if ('err' in result) {
          return {
            success: false,
            error: result.err as string,
            code: 'JOIN_AS_BOT_ERROR',
          };
        }

        const transaction = convertTransaction(result.ok as Record<string, unknown>);
        return {
          success: true,
          data: {
            joined: true,
            botName,
            transaction: {
              id: transaction.id,
              status: transaction.status,
              propertyAddress: transaction.propertyAddress,
              postcode: transaction.postcode,
              amount: transaction.amount.toString(),
            },
            note: 'Bot is now on the transaction access list. Ask the user to verify in the propxchain.com bot panel if they want to confirm. Use propxchain_list_my_transactions to see every transaction this bot can access.',
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'JOIN_AS_BOT_ERROR',
        };
      }
    },
  },
  {
    name: 'propxchain_list_my_transactions',
    description:
      'List all transactions this bot has access to. ' +
      'Returns a summary of each transaction the bot is connected to.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
    handler: async (
      _args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      try {
        const actor = client.getTransactionManager() as Record<string, (...args: unknown[]) => Promise<unknown>>;
        const raw = (await actor.getMyTransactions()) as Record<string, unknown>[];

        const transactions = raw.map(convertTransaction);

        return {
          success: true,
          data: {
            count: transactions.length,
            transactions: transactions.map((tx) => ({
              id: tx.id,
              status: tx.status,
              propertyAddress: tx.propertyAddress,
              postcode: tx.postcode,
              amount: tx.amount.toString(),
              inviteCode: tx.inviteCode,
            })),
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'TRANSACTION_LIST_ERROR',
        };
      }
    },
  },
  {
    name: 'propxchain_list_connected_bots',
    description:
      'List all bots connected to a specific transaction. ' +
      'Shows bot name, principal, who added them, and when.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID to query bots for',
        },
      },
      required: ['transactionId'],
    },
    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      try {
        const { transactionId } = z
          .object({ transactionId: z.string() })
          .parse(args);

        const actor = client.getTransactionManager() as Record<string, (...args: unknown[]) => Promise<unknown>>;
        const result = (await actor.getTransactionBots(transactionId)) as Record<string, unknown>;

        if ('err' in result) {
          return {
            success: false,
            error: result.err as string,
            code: 'BOT_QUERY_ERROR',
          };
        }

        const bots = (result.ok as Record<string, unknown>[]).map(
          (bot): BotConnectionInfo => ({
            principal: principalToString(bot.principal),
            name: bot.name as string,
            addedBy: principalToString(bot.addedBy),
            addedAt: bot.addedAt as bigint,
          }),
        );

        return {
          success: true,
          data: {
            transactionId,
            count: bots.length,
            bots: bots.map((b) => ({
              ...b,
              addedAt: new Date(Number(b.addedAt) / 1_000_000).toISOString(),
            })),
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'BOT_QUERY_ERROR',
        };
      }
    },
  },
];
