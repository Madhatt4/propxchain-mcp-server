// PropXchain MCP Server - Transaction Tools
// 6 tools for searching, viewing, creating, and joining transactions

import { z } from 'zod';
import { Principal } from '@icp-sdk/core/principal';
import {
  type CanisterClient,
  convertTransaction,
  principalToString,
  optToUndefined,
} from '../canister-client.js';
import type {
  Transaction,
  ToolResult,
} from '../types/index.js';

// ============================================================
// Helper: format a Transaction for MCP text output
// ============================================================

function formatTransactionSummary(tx: Transaction): Record<string, unknown> {
  return {
    id: tx.id,
    status: tx.status,
    propertyAddress: tx.propertyAddress,
    postcode: tx.postcode,
    propertyType: tx.propertyType,
    amount: tx.amount.toString(),
    completionDate: tx.completionDate,
    inviteCode: tx.inviteCode,
    createdAt: new Date(Number(tx.createdAt) / 1_000_000).toISOString(),
  };
}

function formatTransactionFull(tx: Transaction): Record<string, unknown> {
  return {
    id: tx.id,
    status: tx.status,
    propertyAddress: tx.propertyAddress,
    postcode: tx.postcode,
    propertyType: tx.propertyType,
    propertyCategory: tx.propertyCategory,
    transactionType: tx.transactionType,
    titleNumber: tx.titleNumber,
    amount: tx.amount.toString(),
    deposit: tx.deposit.toString(),
    mortgageAmount: tx.mortgageAmount.toString(),
    completionDate: tx.completionDate,
    mode: tx.mode,
    userRole: tx.userRole,
    buyer: tx.buyer,
    seller: tx.seller,
    solicitor: tx.solicitor ?? null,
    createdBy: tx.createdBy,
    inviteCode: tx.inviteCode,
    propertyId: tx.propertyId,
    chainedTransactions: tx.chainedTransactions,
    chainPosition: tx.chainPosition ?? null,
    landRegistryIntegration: {
      status: tx.landRegistryIntegration.status,
    },
    createdAt: new Date(Number(tx.createdAt) / 1_000_000).toISOString(),
    exchangedAt: tx.exchangedAt
      ? new Date(Number(tx.exchangedAt) / 1_000_000).toISOString()
      : null,
    blockchainCompletedAt: tx.blockchainCompletedAt
      ? new Date(Number(tx.blockchainCompletedAt) / 1_000_000).toISOString()
      : null,
  };
}

// ============================================================
// Tool Definitions
// ============================================================

function searchTransactions() {
  return {
    name: 'propxchain_search_transactions',
    description:
      'Search your transactions by address, postcode, status, or free-text query. Returns a list of matching transaction summaries.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search across property address and postcode',
        },
        status: {
          type: 'string',
          enum: [
            'active',
            'exchanged',
            'completion_initiated',
            'blockchain_completed',
            'land_registry_registered',
          ],
          description: 'Filter by transaction status',
        },
        postcode: {
          type: 'string',
          description: 'Filter by exact postcode (case-insensitive)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 20)',
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          query: z.string().optional(),
          status: z
            .enum([
              'active',
              'exchanged',
              'completion_initiated',
              'blockchain_completed',
              'land_registry_registered',
            ])
            .optional(),
          postcode: z.string().optional(),
          limit: z.number().int().positive().max(100).default(20),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actor = client.getTransactionManager() as any;
        const rawTxs = (await actor.getMyTransactions()) as unknown[];

        let transactions = rawTxs.map((raw) =>
          convertTransaction(raw as Record<string, unknown>),
        );

        // Filter by status
        if (input.status) {
          transactions = transactions.filter((tx) => tx.status === input.status);
        }

        // Filter by postcode
        if (input.postcode) {
          const pc = input.postcode.toLowerCase().replace(/\s+/g, '');
          transactions = transactions.filter(
            (tx) => tx.postcode.toLowerCase().replace(/\s+/g, '') === pc,
          );
        }

        // Filter by free-text query
        if (input.query) {
          const q = input.query.toLowerCase();
          transactions = transactions.filter(
            (tx) =>
              tx.propertyAddress.toLowerCase().includes(q) ||
              tx.postcode.toLowerCase().includes(q) ||
              tx.id.toLowerCase().includes(q) ||
              tx.inviteCode.toLowerCase().includes(q),
          );
        }

        // Apply limit
        const limited = transactions.slice(0, input.limit);

        return {
          success: true,
          data: {
            total: transactions.length,
            returned: limited.length,
            transactions: limited.map(formatTransactionSummary),
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'SEARCH_FAILED',
        };
      }
    },
  };
}

function getTransaction() {
  return {
    name: 'propxchain_get_transaction',
    description:
      'Get full details of a specific transaction by its ID, including all parties, financials, and status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID to look up',
        },
      },
      required: ['transactionId'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          transactionId: z.string().min(1),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actor = client.getTransactionManager() as any;
        const raw = (await actor.getTransaction(input.transactionId)) as
          | [Record<string, unknown>]
          | [];

        const tx = optToUndefined(raw);
        if (!tx) {
          return {
            success: false,
            error: `Transaction '${input.transactionId}' not found`,
            code: 'NOT_FOUND',
          };
        }

        const transaction = convertTransaction(tx as Record<string, unknown>);
        return {
          success: true,
          data: formatTransactionFull(transaction),
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'GET_FAILED',
        };
      }
    },
  };
}

function getStatus() {
  return {
    name: 'propxchain_get_status',
    description:
      'Get a composite status view for a transaction: current phase, timeline milestones, progress percentage, and blocking parties.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID',
        },
      },
      required: ['transactionId'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          transactionId: z.string().min(1),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txActor = client.getTransactionManager() as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const umActor = client.getUserManagement() as any;

        // Fetch transaction, timeline, and progress in parallel
        const [rawTx, rawTimeline, rawProgress] = await Promise.all([
          txActor.getTransaction(input.transactionId) as Promise<
            [Record<string, unknown>] | []
          >,
          txActor.get_transaction_timeline(input.transactionId) as Promise<
            [Record<string, unknown>] | []
          >,
          umActor.getTransactionProgress(input.transactionId) as Promise<
            [Record<string, unknown>] | []
          >,
        ]);

        const txOpt = optToUndefined(rawTx);
        if (!txOpt) {
          return {
            success: false,
            error: `Transaction '${input.transactionId}' not found`,
            code: 'NOT_FOUND',
          };
        }

        const tx = convertTransaction(txOpt as Record<string, unknown>);
        const timeline = optToUndefined(rawTimeline);
        const progress = optToUndefined(rawProgress);

        // Build timeline object
        const timelineData = timeline
          ? {
              createdAt: new Date(
                Number(timeline.createdAt as bigint) / 1_000_000,
              ).toISOString(),
              exchangedAt: timeline.exchangedAt
                ? new Date(
                    Number(
                      optToUndefined(
                        timeline.exchangedAt as [unknown] | [],
                      ) as bigint,
                    ) / 1_000_000,
                  ).toISOString()
                : null,
              completionInitiatedAt: timeline.completionInitiatedAt
                ? new Date(
                    Number(
                      optToUndefined(
                        timeline.completionInitiatedAt as [unknown] | [],
                      ) as bigint,
                    ) / 1_000_000,
                  ).toISOString()
                : null,
              blockchainCompletedAt: timeline.blockchainCompletedAt
                ? new Date(
                    Number(
                      optToUndefined(
                        timeline.blockchainCompletedAt as [unknown] | [],
                      ) as bigint,
                    ) / 1_000_000,
                  ).toISOString()
                : null,
              landRegistryRegisteredAt: timeline.landRegistryRegisteredAt
                ? new Date(
                    Number(
                      optToUndefined(
                        timeline.landRegistryRegisteredAt as [unknown] | [],
                      ) as bigint,
                    ) / 1_000_000,
                  ).toISOString()
                : null,
            }
          : null;

        // Build progress object
        const progressData = progress
          ? {
              completionPercentage: Number(progress.completionPercentage),
              readyToExchange: progress.readyToExchange as boolean,
              membersComplete: Number(progress.membersComplete),
              totalMembers: Number(progress.totalMembers),
              blockingParties: (progress.blockingParties as unknown[]).map(
                principalToString,
              ),
            }
          : null;

        return {
          success: true,
          data: {
            transactionId: tx.id,
            currentPhase: tx.status,
            propertyAddress: tx.propertyAddress,
            amount: tx.amount.toString(),
            timeline: timelineData,
            progress: progressData,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'STATUS_FAILED',
        };
      }
    },
  };
}

function createTransaction() {
  return {
    name: 'propxchain_create_transaction',
    description:
      'Create a new property transaction with an auto-generated invite code (TX-XXXX-XXXX). Returns the transaction ID and invite code for sharing with other parties.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        propertyAddress: {
          type: 'string',
          description: 'Full property address',
        },
        postcode: {
          type: 'string',
          description: 'UK postcode',
        },
        propertyType: {
          type: 'string',
          enum: ['freehold', 'leasehold'],
          description: 'Property tenure type',
        },
        titleNumber: {
          type: 'string',
          description: 'Land Registry title number (optional)',
        },
        amount: {
          type: 'number',
          description: 'Sale price in pence (integer)',
        },
        deposit: {
          type: 'number',
          description: 'Deposit amount in pence (optional, default 0)',
        },
        mortgageAmount: {
          type: 'number',
          description: 'Mortgage amount in pence (optional, default 0)',
        },
        completionDate: {
          type: 'string',
          description: 'Target completion date (ISO 8601 or YYYY-MM-DD)',
        },
        solicitorPrincipal: {
          type: 'string',
          description: 'ICP principal of the solicitor (optional)',
        },
        mode: {
          type: 'string',
          enum: ['diy', 'hybrid', 'full_service'],
          description: 'Transaction mode (default: diy)',
        },
      },
      required: ['propertyAddress', 'postcode', 'propertyType', 'amount', 'completionDate'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          propertyAddress: z.string().min(1),
          postcode: z.string().min(1),
          propertyType: z.enum(['freehold', 'leasehold']),
          titleNumber: z.string().default(''),
          amount: z.number().int().positive(),
          deposit: z.number().int().nonnegative().default(0),
          mortgageAmount: z.number().int().nonnegative().default(0),
          completionDate: z.string().min(1),
          solicitorPrincipal: z.string().optional(),
          mode: z.enum(['diy', 'hybrid', 'full_service']).default('diy'),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actor = client.getTransactionManager() as any;

        // Seller principal is the caller's own principal (anonymous for now)
        const sellerPrincipal = Principal.anonymous();

        // createTransactionWithInvite(
        //   propertyAddress, postcode, propertyType, propertyCategory,
        //   seller, transactionType, amount, completionDate, titleNumber,
        //   previousOwner, mode, userRole, deposit, mortgageAmount, propertyId
        // ) -> Result_5 { ok: (txId, inviteCode), err: text }
        const result = (await actor.createTransactionWithInvite(
          input.propertyAddress,
          input.postcode,
          input.propertyType,
          'residential',
          sellerPrincipal,
          'sale',
          BigInt(input.amount),
          input.completionDate,
          input.titleNumber,
          '',
          input.mode,
          'seller',
          BigInt(input.deposit),
          BigInt(input.mortgageAmount),
          '',
        )) as Record<string, unknown>;

        if ('err' in result) {
          return {
            success: false,
            error: result.err as string,
            code: 'CREATE_FAILED',
          };
        }

        const [transactionId, inviteCode] = result.ok as [string, string];

        return {
          success: true,
          data: {
            transactionId,
            inviteCode,
            message: `Transaction created. Share invite code ${inviteCode} with other parties.`,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'CREATE_FAILED',
        };
      }
    },
  };
}

function joinTransaction() {
  return {
    name: 'propxchain_join_transaction',
    description:
      'Join an existing property transaction using an invite code (format: TX-XXXX-XXXX). You will be added as a party to the transaction.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        inviteCode: {
          type: 'string',
          description: 'The invite code (e.g. TX-ABCD-1234)',
        },
      },
      required: ['inviteCode'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          inviteCode: z.string().min(1),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actor = client.getTransactionManager() as any;

        // joinTransactionByInviteCode(inviteCode) -> Result_2 { ok: Transaction, err: Text }
        const result = (await actor.joinTransactionByInviteCode(
          input.inviteCode,
        )) as Record<string, unknown>;

        if ('err' in result) {
          return {
            success: false,
            error: result.err as string,
            code: 'JOIN_FAILED',
          };
        }

        const tx = convertTransaction(result.ok as Record<string, unknown>);

        return {
          success: true,
          data: {
            transactionId: tx.id,
            propertyAddress: tx.propertyAddress,
            status: tx.status,
            message: `Successfully joined transaction for ${tx.propertyAddress}`,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'JOIN_FAILED',
        };
      }
    },
  };
}

function getTransactionChain() {
  return {
    name: 'propxchain_get_transaction_chain',
    description:
      'Get all linked transactions in a property chain. Shows the chain of transactions where one sale depends on another.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID to get the chain for',
        },
      },
      required: ['transactionId'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          transactionId: z.string().min(1),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actor = client.getTransactionManager() as any;

        // getTransactionChain(id) -> Result_4 { ok: Vec<Transaction>, err: Text }
        const result = (await actor.getTransactionChain(
          input.transactionId,
        )) as Record<string, unknown>;

        if ('err' in result) {
          return {
            success: false,
            error: result.err as string,
            code: 'CHAIN_FAILED',
          };
        }

        const rawTxs = result.ok as unknown[];
        const chain = rawTxs.map((raw) =>
          convertTransaction(raw as Record<string, unknown>),
        );

        return {
          success: true,
          data: {
            chainLength: chain.length,
            transactions: chain.map((tx, idx) => ({
              position: idx + 1,
              ...formatTransactionSummary(tx),
            })),
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'CHAIN_FAILED',
        };
      }
    },
  };
}

// ============================================================
// Export all transaction tools
// ============================================================

export const transactionTools = [
  searchTransactions(),
  getTransaction(),
  getStatus(),
  createTransaction(),
  joinTransaction(),
  getTransactionChain(),
];
