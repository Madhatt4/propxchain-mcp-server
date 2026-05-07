// PropXchain MCP Server - Shared Types
// Mirrors Candid interfaces from ICP canisters

// ============================================================
// Transaction Types
// ============================================================

export type TransactionStatus =
  | 'active'
  | 'exchanged'
  | 'completion_initiated'
  | 'blockchain_completed'
  | 'land_registry_registered';

export type LandRegistryStatus =
  | 'not_initiated'
  | 'pending_submission'
  | 'submitted'
  | 'registered'
  | 'failed';

export interface LandRegistryIntegration {
  status: LandRegistryStatus;
  submittedToLRAt?: bigint;
  lrPayloadID?: string;
  landRegistryConfirmationNumber?: string;
  estimatedLRCompletionTime?: bigint;
}

export interface Transaction {
  id: string;
  status: TransactionStatus;
  propertyAddress: string;
  postcode: string;
  propertyType: string;
  propertyCategory: string;
  transactionType: string;
  titleNumber: string;
  amount: bigint;
  deposit: bigint;
  mortgageAmount: bigint;
  completionDate: string;
  mode: string;
  userRole: string;
  buyer: string;
  seller: string;
  solicitor?: string;
  createdBy: string;
  createdAt: bigint;
  inviteCode: string;
  propertyId: string;
  previousOwner: string;
  accessList: string[];
  chainedTransactions: string[];
  chainPosition?: number;
  linkToTransaction?: string;
  // Exchange fields
  exchangedAt?: bigint;
  buyerSolicitorSignature?: string;
  sellerSolicitorSignature?: string;
  contractExchangeTimestamp?: bigint;
  // Completion fields
  completionInitiatedAt?: bigint;
  blockchainCompletedAt?: bigint;
  blockchainCompletionProof?: string;
  blockchainCompletionTimestamp?: bigint;
  buyerFundsHash?: string;
  completionStatementHash?: string;
  landRegistryRegisteredAt?: bigint;
  landRegistryIntegration: LandRegistryIntegration;
}

// ============================================================
// User Profile Types
// ============================================================

export type UserType =
  | 'buyer'
  | 'seller'
  | 'solicitor_client_linked'
  | 'solicitor_platform_only'
  | 'solicitor_transparent'
  | 'solicitor_managed'
  | 'admin'
  | 'platform_admin'
  | 'platform_support'
  | 'estate_agent'
  | 'mortgage_broker'
  | 'property_developer'
  | 'conveyancer_transparent'
  | 'conveyancer_managed'
  | 'diy_buyer'
  | 'diy_seller'
  | 'assisted_buyer'
  | 'assisted_seller';

export interface UserProfile {
  principal: string;
  name: string;
  email: string;
  mobile: string;
  userType: UserType;
  isVerified: boolean;
  emailVerified: boolean;
  createdAt: bigint;
  solicitorLicenseNumber?: string;
  lawFirmName?: string;
  lawFirmAddress?: string;
  firmId?: string;
  isPlatformOnlySolicitor: boolean;
  clientPrincipals: string[];
  managedBySolicitor?: string;
}

// ============================================================
// Document Proof Types
// ============================================================

export interface DocumentProof {
  id: number;
  fileName: string;
  fileHash: string;
  fileSize: number;
  contentType: string;
  docType: string;
  storageLocation: string;
  uploadedBy: string;
  uploadedAt: bigint;
  transactionId?: string;
  verified: boolean;
}

// ============================================================
// Property Types
// ============================================================

export type PropertyStatus =
  | 'Listed'
  | 'InTransaction'
  | 'Cancelled'
  | 'Completed';

export interface Property {
  id: number;
  anonymousPropertyId: string;
  status: PropertyStatus;
  propertyType: string;
  owner: string;
  address: string;
  description: string;
  price: number;
  size: number;
  isVerified: boolean;
  documentsComplete: boolean;
  searchesComplete: boolean;
  financingComplete: boolean;
  createdAt: bigint;
  transactionId?: string;
  chainPosition?: number;
  linkedProperties: string[];
}

// ============================================================
// Bot Connection Types
// ============================================================

export interface BotConnectionInfo {
  principal: string;
  name: string;
  addedBy: string;
  addedAt: bigint;
}

// ============================================================
// MCP Tool Result Types
// ============================================================

export interface ToolSuccess<T> {
  success: true;
  data: T;
}

export interface ToolError {
  success: false;
  error: string;
  code: string;
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;
