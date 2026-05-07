// PropXchain MCP Server - Document Tools
// GDPR-compliant document management: only hashes are stored on-chain

import { z } from 'zod';
import { createHash } from 'node:crypto';
import { CanisterClient, convertDocumentProof } from '../canister-client.js';
import type { ToolResult, DocumentProof } from '../types/index.js';

function toolSuccess<T>(data: T): ToolResult<T> {
  return { success: true, data };
}

function toolError(error: string, code: string): ToolResult<never> {
  return { success: false, error, code };
}

// ============================================================
// Oscar AI Document Analysis
// ============================================================

const OSCAR_BACKEND_URL = 'https://propxchain.onrender.com';
const OSCAR_TIMEOUT_MS = 30_000;

/** Map MCP docType values to Oscar's internal document types */
const OSCAR_TYPE_MAP: Record<string, string> = {
  title_deeds: 'title_deed',
  ta6: 'ta6_form',
  ta7: 'ta7_form',
  ta10: 'ta10_form',
  epc: 'epc_certificate',
  mortgage_offer: 'mortgage_offer',
  id_verification: 'passport',
  property_information: 'ta6_form',
  fixtures_fittings: 'ta10_form',
};

interface OscarResult {
  verified: boolean;
  confidence: number;
  issues: Array<{ severity: string; code: string; message: string; field?: string }>;
  extractedData: Record<string, unknown>;
  mismatches: Array<{ field: string; expected: string; found: string }>;
  recommendations: string[];
  requiresSolicitorReview: boolean;
  analysisTimestamp: string;
}

/** Call Oscar AI backend to analyse a document. Non-fatal — returns null on failure. */
async function runOscarScan(
  principalId: string,
  docType: string,
  fileBase64: string,
  mimeType: string,
): Promise<OscarResult | null> {
  const oscarType = OSCAR_TYPE_MAP[docType] ?? docType;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSCAR_TIMEOUT_MS);

  try {
    const resp = await fetch(`${OSCAR_BACKEND_URL}/api/documents/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principalId,
        documentType: oscarType,
        fileBase64,
        mimeType,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) return null;

    const result = (await resp.json()) as OscarResult;
    return {
      ...result,
      analysisTimestamp: result.analysisTimestamp || new Date().toISOString(),
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/** Register Oscar result on document_verification canister. Non-fatal. */
async function registerOscarOnChain(
  client: CanisterClient,
  verificationDocId: number,
  oscarResult: OscarResult,
): Promise<boolean> {
  try {
    const docVerification = client.getDocumentVerification();
    const verifyFn = docVerification.verifyDocumentWithHash as (
      docId: bigint,
      notes: [] | [string],
    ) => Promise<Record<string, unknown>>;

    const notes = oscarResult.verified
      ? `Oscar AI: VERIFIED (${oscarResult.confidence}% confidence)`
      : `Oscar AI: FLAGGED (${oscarResult.confidence}% confidence) — ${oscarResult.issues.map((i) => i.message).join('; ')}`;

    const result = await verifyFn(BigInt(verificationDocId), [notes]);
    return 'ok' in result;
  } catch {
    return false;
  }
}

// ============================================================
// Tool: propxchain_verify_document
// ============================================================

function verifyDocumentTool() {
  return {
    name: 'propxchain_verify_document',
    description:
      'Verify a document hash against the blockchain record to confirm authenticity. ' +
      'Returns whether the provided hash matches what was registered on-chain.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentId: {
          type: 'number',
          description: 'The numeric document ID on the blockchain',
        },
        expectedHash: {
          type: 'string',
          description: 'The SHA-256 hash to verify against the on-chain record',
        },
      },
      required: ['documentId', 'expectedHash'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
    },
    handler: async (
      args: unknown,
      client: CanisterClient,
    ): Promise<ToolResult<{ verified: boolean; documentId: number; hash: string }>> => {
      const schema = z.object({
        documentId: z.number().int().nonnegative(),
        expectedHash: z.string().min(1),
      });

      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        return toolError(
          `Invalid input: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
          'VALIDATION_ERROR',
        );
      }

      const { documentId, expectedHash } = parsed.data;

      try {
        const actor = client.getDocumentStorage();
        const generateCsrf = actor.generateCSRFToken as () => Promise<string>;
        const csrfToken = await generateCsrf();
        const verifyFn = actor.verifyDocumentHash as (
          id: bigint,
          hash: string,
          csrfToken: string,
        ) => Promise<Record<string, unknown>>;
        const result = await verifyFn(BigInt(documentId), expectedHash, csrfToken);

        if ('ok' in result) {
          return toolSuccess({
            verified: result.ok as boolean,
            documentId,
            hash: expectedHash,
          });
        }

        return toolError(
          `Verification failed: ${result.err as string}`,
          'CANISTER_ERROR',
        );
      } catch (err) {
        return toolError(
          `Failed to verify document: ${err instanceof Error ? err.message : String(err)}`,
          'CANISTER_CALL_FAILED',
        );
      }
    },
  };
}

// ============================================================
// Tool: propxchain_list_documents
// ============================================================

function listDocumentsTool() {
  return {
    name: 'propxchain_list_documents',
    description:
      'List all documents registered for a specific transaction. ' +
      'Returns document metadata including file name, type, upload time, and verification status. ' +
      'Note: Only document hashes are stored on-chain (GDPR compliant).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID to list documents for',
        },
      },
      required: ['transactionId'],
    },
    annotations: {
      readOnlyHint: true,
    },
    handler: async (
      args: unknown,
      client: CanisterClient,
    ): Promise<ToolResult<{ transactionId: string; documents: DocumentProof[]; count: number }>> => {
      const schema = z.object({
        transactionId: z.string().min(1),
      });

      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        return toolError(
          `Invalid input: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
          'VALIDATION_ERROR',
        );
      }

      const { transactionId } = parsed.data;

      try {
        const actor = client.getDocumentStorage();
        const getDocsFn = actor.getTransactionDocuments as (
          txId: string,
        ) => Promise<Record<string, unknown>[]>;
        const rawDocs = await getDocsFn(transactionId);

        const documents = rawDocs.map(convertDocumentProof);

        return toolSuccess({
          transactionId,
          documents,
          count: documents.length,
        });
      } catch (err) {
        return toolError(
          `Failed to list documents: ${err instanceof Error ? err.message : String(err)}`,
          'CANISTER_CALL_FAILED',
        );
      }
    },
  };
}

// ============================================================
// Tool: propxchain_upload_document
// ============================================================

function uploadDocumentTool() {
  return {
    name: 'propxchain_upload_document',
    description:
      'Register a document on the PropXchain blockchain (GDPR compliant). ' +
      'Only the SHA-256 hash and metadata are stored on-chain — the actual file never touches the blockchain.\n\n' +
      'You can provide EITHER:\n' +
      '  (a) fileContent (base64-encoded) — the server computes the hash and size automatically, OR\n' +
      '  (b) fileHash + fileSize — if you have already computed the SHA-256 hash yourself.\n\n' +
      'Typical bot workflow:\n' +
      '  1. Generate or obtain the document (e.g. a filled TA6 form)\n' +
      '  2. Base64-encode the content and pass it as fileContent\n' +
      '  3. The server hashes it, registers the proof on-chain, runs Oscar AI scan, and returns the documentId\n\n' +
      'Oscar AI automatically scans the document for issues, extracts data, and registers verification on-chain.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        fileName: {
          type: 'string',
          description: 'Name of the document file (e.g. "title-deeds.pdf", "TA6-form.md")',
        },
        fileContent: {
          type: 'string',
          description:
            'Base64-encoded file content. If provided, the server computes the SHA-256 hash and ' +
            'file size automatically. Use this instead of fileHash + fileSize for convenience.',
        },
        fileHash: {
          type: 'string',
          description: 'SHA-256 hash of the file content (hex string). Only needed if fileContent is NOT provided.',
        },
        fileSize: {
          type: 'number',
          description: 'File size in bytes. Only needed if fileContent is NOT provided.',
        },
        contentType: {
          type: 'string',
          description: 'MIME content type (e.g. "application/pdf", "text/markdown", "text/plain")',
        },
        docType: {
          type: 'string',
          description:
            'Document category: "title_deeds", "ta6", "ta7", "ta10", "epc", ' +
            '"mortgage_offer", "search_results", "contract", "transfer_deed", "id_verification", ' +
            '"property_information", "fixtures_fittings", "completion_information"',
        },
        transactionId: {
          type: 'string',
          description: 'Transaction ID to associate this document with',
        },
      },
      required: ['fileName', 'contentType', 'docType', 'transactionId'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
    },
    handler: async (
      args: unknown,
      client: CanisterClient,
    ): Promise<ToolResult<{ documentId: number; fileHash: string; fileSize: number }>> => {
      const schema = z.object({
        fileName: z.string().min(1),
        fileContent: z.string().optional(),
        fileHash: z.string().optional(),
        fileSize: z.number().int().nonnegative().optional(),
        contentType: z.string().min(1),
        docType: z.string().min(1),
        transactionId: z.string().min(1),
      });

      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        return toolError(
          `Invalid input: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
          'VALIDATION_ERROR',
        );
      }

      const { fileName, fileContent, contentType, docType, transactionId } = parsed.data;

      // Compute hash + size from content, or use provided values
      let fileHash: string;
      let fileSize: number;

      if (fileContent) {
        const buffer = Buffer.from(fileContent, 'base64');
        fileHash = createHash('sha256').update(buffer).digest('hex');
        fileSize = buffer.length;
      } else if (parsed.data.fileHash && parsed.data.fileSize !== undefined) {
        fileHash = parsed.data.fileHash;
        fileSize = parsed.data.fileSize;
      } else {
        return toolError(
          'Provide either fileContent (base64) or both fileHash and fileSize',
          'VALIDATION_ERROR',
        );
      }

      const storageLocation = 'onchain';

      try {
        // Step 1: Generate CSRF token from document_storage canister
        const docStorage = client.getDocumentStorage();
        const generateCsrf = docStorage.generateCSRFToken as () => Promise<string>;
        const csrfToken = await generateCsrf();

        // Step 2: Register document proof on document_storage canister
        const registerFn = docStorage.registerDocumentProof as (
          fileName: string,
          fileHash: string,
          fileSize: bigint,
          contentType: string,
          storageLocation: string,
          transactionId: [] | [string],
          docType: string,
          csrfToken: string,
        ) => Promise<Record<string, unknown>>;
        const result = await registerFn(
          fileName,
          fileHash,
          BigInt(fileSize),
          contentType,
          storageLocation,
          [transactionId],
          docType,
          csrfToken,
        );

        if ('err' in result) {
          return toolError(
            `Failed to register document: ${result.err as string}`,
            'CANISTER_ERROR',
          );
        }

        const storageDocId = Number(result.ok);

        // Step 3: Register on document_verification canister
        // registerDocument(propertyId, opt transactionId, docType, docHash, opt storageDocId, opt fileName, opt fileSize, opt contentType)
        let verificationDocId: number | null = null;
        try {
          const docVerification = client.getDocumentVerification();
          const registerDocFn = docVerification.registerDocument as (
            propertyId: bigint,
            transactionId: [] | [bigint],
            docType: string,
            docHash: string,
            storageDocId: [] | [bigint],
            fileName: [] | [string],
            fileSize: [] | [bigint],
            contentType: [] | [string],
          ) => Promise<bigint>;

          // Extract numeric transaction ID (strip tx_ prefix)
          const numericTxId = transactionId.replace(/^tx_/, '');
          const txIdBigInt = BigInt(numericTxId);

          verificationDocId = Number(await registerDocFn(
            BigInt(0), // propertyId — bot may not have this
            [txIdBigInt],
            docType,
            fileHash,
            [BigInt(storageDocId)],
            [fileName],
            [BigInt(fileSize)],
            [contentType],
          ));
        } catch {
          // Non-fatal — document_verification registration is supplementary
        }

        // Step 4: Oscar AI document scan (non-fatal, only if base64 content provided)
        let oscarAnalysis: OscarResult | null = null;
        let oscarRegistered = false;

        if (fileContent) {
          const principalId = client.getPrincipal();
          oscarAnalysis = await runOscarScan(principalId, docType, fileContent, contentType);

          if (oscarAnalysis && verificationDocId !== null) {
            oscarRegistered = await registerOscarOnChain(client, verificationDocId, oscarAnalysis);
          }
        }

        return toolSuccess({
          documentId: storageDocId,
          verificationDocumentId: verificationDocId,
          fileHash,
          fileSize,
          oscarAnalysis: oscarAnalysis
            ? {
                verified: oscarAnalysis.verified,
                confidence: oscarAnalysis.confidence,
                issueCount: oscarAnalysis.issues.length,
                issues: oscarAnalysis.issues,
                requiresSolicitorReview: oscarAnalysis.requiresSolicitorReview,
                registeredOnChain: oscarRegistered,
              }
            : null,
        });
      } catch (err) {
        return toolError(
          `Failed to register document: ${err instanceof Error ? err.message : String(err)}`,
          'CANISTER_CALL_FAILED',
        );
      }
    },
  };
}

// ============================================================
// Export
// ============================================================

export const documentTools = [
  verifyDocumentTool(),
  listDocumentsTool(),
  uploadDocumentTool(),
];
