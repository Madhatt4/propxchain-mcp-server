// PropXchain MCP Server - Checklist Tools
// 2 tools for viewing and updating document checklists per transaction

import { z } from 'zod';
import {
  type CanisterClient,
  extractVariant,
  principalToString,
  optToUndefined,
} from '../canister-client.js';
import type { ToolResult } from '../types/index.js';

// ============================================================
// Tool Definitions
// ============================================================

function getChecklist() {
  return {
    name: 'propxchain_get_checklist',
    description:
      'Get the document checklist with completion status for a transaction. Shows each member, their required documents, uploaded documents, and whether they are blocking progress.',
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
        const umActor = client.getUserManagement() as any;

        // Fetch members and progress in parallel
        const [rawMembers, rawProgress] = await Promise.all([
          umActor.getTransactionMembers(input.transactionId) as Promise<
            [unknown[]] | []
          >,
          umActor.getTransactionProgress(input.transactionId) as Promise<
            [Record<string, unknown>] | []
          >,
        ]);

        const members = optToUndefined(rawMembers);
        const progress = optToUndefined(rawProgress);

        if (!members) {
          return {
            success: false,
            error: `No members found for transaction '${input.transactionId}'`,
            code: 'NOT_FOUND',
          };
        }

        const blockingPrincipals = progress
          ? new Set(
              (progress.blockingParties as unknown[]).map(principalToString),
            )
          : new Set<string>();

        const memberChecklists = (members as Record<string, unknown>[]).map(
          (member) => {
            const principal = principalToString(member.principal);
            const role = extractVariant(
              member.role as Record<string, unknown>,
            );
            const required = member.requiredDocuments as string[];
            const uploaded = member.uploadedDocuments as string[];
            const uploadedSet = new Set(uploaded);

            return {
              principal,
              role,
              documentsComplete: member.documentsComplete as boolean,
              isBlocking: blockingPrincipals.has(principal),
              requiredDocuments: required.map((doc) => ({
                documentId: doc,
                uploaded: uploadedSet.has(doc),
              })),
              uploadedCount: uploaded.length,
              requiredCount: required.length,
            };
          },
        );

        return {
          success: true,
          data: {
            transactionId: input.transactionId,
            completionPercentage: progress
              ? Number(progress.completionPercentage)
              : 0,
            readyToExchange: progress
              ? (progress.readyToExchange as boolean)
              : false,
            members: memberChecklists,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'CHECKLIST_FAILED',
        };
      }
    },
  };
}

function updateChecklist() {
  return {
    name: 'propxchain_update_checklist',
    description:
      'Mark a document as uploaded/complete for a transaction. Updates your member checklist to reflect that a required document has been provided.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID',
        },
        documentId: {
          type: 'string',
          description:
            'The document type ID to mark as uploaded (e.g. "ta6_form", "proof_of_id")',
        },
      },
      required: ['transactionId', 'documentId'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },

    handler: async (
      args: Record<string, unknown>,
      client: CanisterClient,
    ): Promise<ToolResult<unknown>> => {
      const input = z
        .object({
          transactionId: z.string().min(1),
          documentId: z.string().min(1),
        })
        .parse(args);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const umActor = client.getUserManagement() as any;

        // updateMemberDocuments(transactionId, documentId) -> Bool
        const result = (await umActor.updateMemberDocuments(
          input.transactionId,
          input.documentId,
        )) as boolean;

        if (!result) {
          return {
            success: false,
            error: `Failed to update checklist. You may not be a member of this transaction or the document ID is invalid.`,
            code: 'UPDATE_FAILED',
          };
        }

        return {
          success: true,
          data: {
            transactionId: input.transactionId,
            documentId: input.documentId,
            message: `Document '${input.documentId}' marked as uploaded for transaction ${input.transactionId}`,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          code: 'UPDATE_FAILED',
        };
      }
    },
  };
}

// ============================================================
// Export all checklist tools
// ============================================================

export const checklistTools = [getChecklist(), updateChecklist()];
