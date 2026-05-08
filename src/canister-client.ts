// PropXchain MCP Server - Canister Client
// Wraps @icp-sdk/core to provide typed access to all PropXchain canisters

import { Actor, HttpAgent, type Identity, type ActorSubclass } from '@icp-sdk/core/agent';
import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
import type {
  Transaction,
  UserProfile,
  DocumentProof,
  Property,
  TransactionStatus,
  LandRegistryStatus,
  LandRegistryIntegration,
  UserType,
  PropertyStatus,
} from './types/index.js';

// ============================================================
// Canister IDs
// ============================================================

const CANISTER_IDS = {
  transactionManager: 'llj73-cqaaa-aaaaa-qcwwa-cai',
  userManagement: 'lmizp-piaaa-aaaaa-qcwwq-cai',
  documentStorage: '646az-pqaaa-aaaaa-qczja-cai',
  documentVerification: 'xand7-wiaaa-aaaah-arlea-cai',
  propertyRegistry: 'l6oow-dyaaa-aaaaa-qcwvq-cai',
  landRegistry: 'o4flv-xaaaa-aaaaa-qdaeq-cai',
  oscar: 'khstc-3qaaa-aaaaa-qdyfq-cai',
} as const;

// ============================================================
// IDL Factories (inline from Candid .did.js declarations)
// ============================================================

const transactionManagerIdlFactory = ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }): IDL.ServiceClass => {
  const Result = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text });
  const Result_5 = IDL.Variant({
    'ok': IDL.Tuple(IDL.Text, IDL.Text),
    'err': IDL.Text,
  });
  const TransactionStatus = IDL.Variant({
    'completion_initiated': IDL.Null,
    'active': IDL.Null,
    'blockchain_completed': IDL.Null,
    'exchanged': IDL.Null,
    'land_registry_registered': IDL.Null,
  });
  const LandRegistryStatus = IDL.Variant({
    'submitted': IDL.Null,
    'not_initiated': IDL.Null,
    'pending_submission': IDL.Null,
    'failed': IDL.Null,
    'registered': IDL.Null,
  });
  const LandRegistryIntegration = IDL.Record({
    'status': LandRegistryStatus,
    'estimatedLRCompletionTime': IDL.Opt(IDL.Int),
    'lrPayloadID': IDL.Opt(IDL.Text),
    'submittedToLRAt': IDL.Opt(IDL.Int),
    'landRegistryConfirmationNumber': IDL.Opt(IDL.Text),
  });
  const Transaction = IDL.Record({
    'id': IDL.Text,
    'status': TransactionStatus,
    'buyerFundsHash': IDL.Opt(IDL.Text),
    'userRole': IDL.Text,
    'oldStatus': IDL.Text,
    'postcode': IDL.Text,
    'exchangedAt': IDL.Opt(IDL.Int),
    'propertyCategory': IDL.Text,
    'transactionType': IDL.Text,
    'completionDate': IDL.Text,
    'completionStatementHash': IDL.Opt(IDL.Text),
    'landRegistryRegisteredAt': IDL.Opt(IDL.Int),
    'sellerSolicitorSignature': IDL.Opt(IDL.Text),
    'propertyType': IDL.Text,
    'completionInitiatedAt': IDL.Opt(IDL.Int),
    'buyerSolicitorSignature': IDL.Opt(IDL.Text),
    'titleNumber': IDL.Text,
    'mode': IDL.Text,
    'createdAt': IDL.Int,
    'createdBy': IDL.Principal,
    'blockchainCompletionProof': IDL.Opt(IDL.Text),
    'blockchainCompletedAt': IDL.Opt(IDL.Int),
    'accessList': IDL.Vec(IDL.Principal),
    'solicitor': IDL.Opt(IDL.Principal),
    'chainedTransactions': IDL.Vec(IDL.Text),
    'previousOwner': IDL.Text,
    'propertyId': IDL.Text,
    'propertyAddress': IDL.Text,
    'deposit': IDL.Nat64,
    'seller': IDL.Principal,
    'contractExchangeTimestamp': IDL.Opt(IDL.Int),
    'mortgageAmount': IDL.Nat64,
    'inviteCode': IDL.Text,
    'chainPosition': IDL.Opt(IDL.Nat),
    'buyer': IDL.Principal,
    'landRegistryIntegration': LandRegistryIntegration,
    'amount': IDL.Nat64,
    'linkToTransaction': IDL.Opt(IDL.Text),
    'blockchainCompletionTimestamp': IDL.Opt(IDL.Int),
  });
  const Time = IDL.Int;
  const Notification = IDL.Record({
    'id': IDL.Nat,
    'documentHash': IDL.Text,
    'createdAt': Time,
    'read': IDL.Bool,
    'recipient': IDL.Principal,
    'message': IDL.Text,
    'docType': IDL.Text,
    'uploadedBy': IDL.Principal,
    'transactionId': IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'ok': IDL.Vec(Transaction),
    'err': IDL.Text,
  });
  const Result_3 = IDL.Variant({
    'ok': IDL.Vec(Notification),
    'err': IDL.Text,
  });
  const TransactionTimeline = IDL.Record({
    'exchangedAt': IDL.Opt(IDL.Int),
    'landRegistryRegisteredAt': IDL.Opt(IDL.Int),
    'completionInitiatedAt': IDL.Opt(IDL.Int),
    'createdAt': IDL.Int,
    'blockchainCompletedAt': IDL.Opt(IDL.Int),
    'totalTimeToCompletion': IDL.Nat,
    'totalTimeIncludingLR': IDL.Nat,
  });
  const Result_2 = IDL.Variant({ 'ok': Transaction, 'err': IDL.Text });
  const Result_1 = IDL.Variant({ 'ok': IDL.Null, 'err': IDL.Text });
  return IDL.Service({
    'adminForceDeleteTransaction': IDL.Func([IDL.Text], [Result], []),
    'assignBuyer': IDL.Func([IDL.Text, IDL.Principal], [Result], []),
    'assignSolicitor': IDL.Func([IDL.Text, IDL.Principal], [Result], []),
    'bootstrapDocumentStorageCanister': IDL.Func([IDL.Principal], [Result], []),
    'canAccessTransaction': IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'createTransaction': IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Principal, IDL.Text, IDL.Nat64, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Nat64, IDL.Nat64, IDL.Text],
      [IDL.Text],
      [],
    ),
    'createTransactionWithInvite': IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Principal, IDL.Text, IDL.Nat64, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Nat64, IDL.Nat64, IDL.Text],
      [Result_5],
      [],
    ),
    'deleteTransaction': IDL.Func([IDL.Text], [Result], []),
    'doesTransactionExist': IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'getAllTransactions': IDL.Func([], [IDL.Vec(Transaction)], ['query']),
    'getDocumentStorageCanister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'getInviteCode': IDL.Func([IDL.Text], [Result], ['query']),
    'getMyNotifications': IDL.Func([], [IDL.Vec(Notification)], ['query']),
    'getMyTransactions': IDL.Func([], [IDL.Vec(Transaction)], ['query']),
    'getTransaction': IDL.Func([IDL.Text], [IDL.Opt(Transaction)], ['query']),
    'getTransactionByInviteCode': IDL.Func([IDL.Text], [IDL.Opt(Transaction)], []),
    'getTransactionChain': IDL.Func([IDL.Text], [Result_4], ['query']),
    'getTransactionNotifications': IDL.Func([IDL.Text], [Result_3], ['query']),
    'getTransactionsByStatus': IDL.Func([TransactionStatus], [IDL.Vec(Transaction)], ['query']),
    'getUnreadNotificationCount': IDL.Func([], [IDL.Nat], ['query']),
    'getUserManagementCanister': IDL.Func([], [IDL.Text], ['query']),
    'get_transaction_timeline': IDL.Func([IDL.Text], [IDL.Opt(TransactionTimeline)], ['query']),
    'initiate_blockchain_completion': IDL.Func([IDL.Text, IDL.Text, IDL.Text], [Result], []),
    'joinAsBotByInviteCode': IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'joinTransactionByInviteCode': IDL.Func([IDL.Text], [Result_2], []),
    'linkTransactionToChain': IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'markAllNotificationsRead': IDL.Func([], [IDL.Nat], []),
    'markNotificationRead': IDL.Func([IDL.Nat], [Result_1], []),
    'onDocumentRegistered': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Principal], [], []),
    'on_blockchain_completion_success': IDL.Func([IDL.Text], [Result], []),
    'recordContractExchange': IDL.Func([IDL.Text, IDL.Text, IDL.Text], [Result], []),
    'revokeBuyer': IDL.Func([IDL.Text, IDL.Principal], [Result], []),
    'setDocumentStorageCanister': IDL.Func([IDL.Principal], [Result], []),
    'setUserManagementCanister': IDL.Func([IDL.Text], [Result], []),
    'simulate_land_registry_registration': IDL.Func([IDL.Text], [Result], []),
    'trigger_land_registry_submission': IDL.Func([IDL.Text], [Result], []),
    'connectBot': IDL.Func([IDL.Text, IDL.Principal, IDL.Text], [Result_1], []),
    'disconnectBot': IDL.Func([IDL.Text, IDL.Principal], [Result_1], []),
    'getTransactionBots': IDL.Func([IDL.Text], [IDL.Variant({
      'ok': IDL.Vec(IDL.Record({
        'principal': IDL.Principal,
        'name': IDL.Text,
        'addedBy': IDL.Principal,
        'addedAt': IDL.Int,
      })),
      'err': IDL.Text,
    })], ['query']),
    'updateTransactionStatus': IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'update_land_registry_status': IDL.Func(
      [IDL.Text, LandRegistryStatus, IDL.Opt(IDL.Text), IDL.Opt(IDL.Int)],
      [Result],
      [],
    ),
  });
};

const userManagementIdlFactory = ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }): IDL.ServiceClass => {
  const UserType = IDL.Variant({
    'solicitor_platform_only': IDL.Null,
    'admin': IDL.Null,
    'diy_buyer': IDL.Null,
    'solicitor_transparent': IDL.Null,
    'platform_admin': IDL.Null,
    'solicitor_client_linked': IDL.Null,
    'estate_agent': IDL.Null,
    'platform_support': IDL.Null,
    'mortgage_broker': IDL.Null,
    'seller': IDL.Null,
    'conveyancer_managed': IDL.Null,
    'diy_seller': IDL.Null,
    'assisted_seller': IDL.Null,
    'conveyancer_transparent': IDL.Null,
    'buyer': IDL.Null,
    'property_developer': IDL.Null,
    'solicitor_managed': IDL.Null,
    'assisted_buyer': IDL.Null,
  });
  const Permission = IDL.Variant({
    'ViewTransactionProgress': IDL.Text,
    'ViewSharedTransaction': IDL.Text,
    'ViewDevelopmentUnits': IDL.Text,
    'ManageClientAccess': IDL.Principal,
    'InvitePartyToTransaction': IDL.Text,
    'AdminViewAllTransactions': IDL.Null,
    'AdminManageUsers': IDL.Null,
    'UpdateMemberDocuments': IDL.Tuple(IDL.Text, IDL.Principal),
  });
  const Time = IDL.Int;
  const UserProfile = IDL.Record({
    'isPlatformOnlySolicitor': IDL.Bool,
    'userType': UserType,
    'principal': IDL.Principal,
    'managedBySolicitor': IDL.Opt(IDL.Principal),
    'emailVerified': IDL.Bool,
    'name': IDL.Text,
    'createdAt': Time,
    'email': IDL.Text,
    'lawFirmName': IDL.Opt(IDL.Text),
    'firmId': IDL.Opt(IDL.Text),
    'isVerified': IDL.Bool,
    'clientPrincipals': IDL.Vec(IDL.Principal),
    'emailVerificationSentAt': IDL.Opt(Time),
    'emailVerificationToken': IDL.Opt(IDL.Text),
    'mobile': IDL.Text,
    'solicitorLicenseNumber': IDL.Opt(IDL.Text),
    'lawFirmAddress': IDL.Opt(IDL.Text),
  });
  const AuditLog = IDL.Record({
    'id': IDL.Nat,
    'action': IDL.Text,
    'metadata': IDL.Text,
    'targetPrincipal': IDL.Opt(IDL.Principal),
    'timestamp': Time,
    'success': IDL.Bool,
    'actorPrincipal': IDL.Principal,
    'transactionId': IDL.Opt(IDL.Text),
  });
  const TransactionMember = IDL.Record({
    'uploadedDocuments': IDL.Vec(IDL.Text),
    'principal': IDL.Principal,
    'requiredDocuments': IDL.Vec(IDL.Text),
    'joinedAt': Time,
    'role': UserType,
    'documentsComplete': IDL.Bool,
    'canViewProgress': IDL.Bool,
    'canInviteOthers': IDL.Bool,
    'lastActivityAt': Time,
    'transactionId': IDL.Text,
  });
  const TransactionProgress = IDL.Record({
    'members': IDL.Vec(TransactionMember),
    'completionPercentage': IDL.Nat,
    'readyToExchange': IDL.Bool,
    'membersComplete': IDL.Nat,
    'totalMembers': IDL.Nat,
    'blockingParties': IDL.Vec(IDL.Principal),
    'transactionId': IDL.Text,
  });
  return IDL.Service({
    'addTransactionMember': IDL.Func([IDL.Text, IDL.Principal, UserType, IDL.Bool, IDL.Bool], [IDL.Bool], []),
    'amIAdmin': IDL.Func([], [IDL.Bool], ['query']),
    'bootstrapAdmin': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'canUserAccessTransaction': IDL.Func([IDL.Principal, IDL.Text], [IDL.Bool], ['query']),
    'checkPermissionWithAudit': IDL.Func([Permission], [IDL.Bool], []),
    'createUserForPrincipal': IDL.Func([IDL.Principal, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
    'deleteUserByPrincipal': IDL.Func([IDL.Principal], [IDL.Bool], []),
    'getAllUsers': IDL.Func([], [IDL.Vec(UserProfile)], ['query']),
    'getAuditLogs': IDL.Func([IDL.Nat], [IDL.Vec(AuditLog)], ['query']),
    'getMyManagingSolicitor': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getMyProfile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getMyProfileUpdate': IDL.Func([], [IDL.Opt(UserProfile)], []),
    'getMySolicitorClients': IDL.Func([], [IDL.Vec(UserProfile)], ['query']),
    'getTransactionMembers': IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(TransactionMember))], ['query']),
    'getTransactionProgress': IDL.Func([IDL.Text], [IDL.Opt(TransactionProgress)], ['query']),
    'getUserProfile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'getUsersByFirm': IDL.Func([IDL.Text], [IDL.Vec(UserProfile)], ['query']),
    'hasPermission': IDL.Func([Permission], [IDL.Bool], ['query']),
    'linkSolicitorToClient': IDL.Func([IDL.Principal, IDL.Bool], [IDL.Bool], []),
    'linkUserToFirm': IDL.Func([IDL.Text], [IDL.Bool], []),
    'registerUser': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
    'registerUserV2': IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, UserType, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
      [IDL.Bool],
      [],
    ),
    'resendVerificationEmail': IDL.Func([], [IDL.Bool], []),
    'revokeSolicitorAccess': IDL.Func([IDL.Principal], [IDL.Bool], []),
    'unlinkUserFromFirm': IDL.Func([], [IDL.Bool], []),
    'updateMemberDocuments': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'updateTransactionMemberRequiredDocs': IDL.Func([IDL.Text, IDL.Vec(IDL.Text)], [IDL.Bool], []),
    'upgradeToAdmin': IDL.Func([IDL.Principal], [IDL.Bool], []),
    'verifyEmail': IDL.Func([IDL.Text], [IDL.Bool], []),
    'verifyUser': IDL.Func([IDL.Principal], [IDL.Bool], []),
    'whoAmI': IDL.Func([], [IDL.Principal], ['query']),
  });
};

const documentStorageIdlFactory = ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }): IDL.ServiceClass => {
  const Result_2 = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text });
  const Time = IDL.Int;
  const AuditLog = IDL.Record({
    'id': IDL.Nat,
    'action': IDL.Text,
    'metadata': IDL.Text,
    'timestamp': Time,
    'success': IDL.Bool,
    'documentId': IDL.Nat,
    'actorPrincipal': IDL.Principal,
  });
  const Result_3 = IDL.Variant({
    'ok': IDL.Record({
      'id': IDL.Nat,
      'contentType': IDL.Text,
      'fileHash': IDL.Text,
      'fileName': IDL.Text,
      'fileSize': IDL.Nat,
      'totalChunks': IDL.Nat,
      'docType': IDL.Text,
      'uploadedAt': IDL.Int,
      'uploadedBy': IDL.Principal,
      'transactionId': IDL.Opt(IDL.Text),
    }),
    'err': IDL.Text,
  });
  const DocumentProof = IDL.Record({
    'id': IDL.Nat,
    'verified': IDL.Bool,
    'contentType': IDL.Text,
    'fileHash': IDL.Text,
    'fileName': IDL.Text,
    'fileSize': IDL.Nat,
    'storageLocation': IDL.Text,
    'docType': IDL.Text,
    'uploadedAt': Time,
    'uploadedBy': IDL.Principal,
    'transactionId': IDL.Opt(IDL.Text),
  });
  const Result_1 = IDL.Variant({ 'ok': IDL.Nat, 'err': IDL.Text });
  const Result = IDL.Variant({ 'ok': IDL.Bool, 'err': IDL.Text });
  return IDL.Service({
    'deleteDocument': IDL.Func([IDL.Nat, IDL.Text], [Result_2], []),
    'generateCSRFToken': IDL.Func([], [IDL.Text], []),
    'getAuditLogs': IDL.Func([IDL.Nat], [IDL.Vec(AuditLog)], ['query']),
    'getDocumentMetadata': IDL.Func([IDL.Nat], [Result_3], ['query']),
    'getDocumentProof': IDL.Func([IDL.Nat], [IDL.Opt(DocumentProof)], ['query']),
    'getMyAuditLogs': IDL.Func([IDL.Principal], [IDL.Vec(AuditLog)], ['query']),
    'getRecentAuditLogs': IDL.Func([IDL.Nat], [IDL.Vec(AuditLog)], ['query']),
    'getStorageStats': IDL.Func(
      [],
      [IDL.Record({
        'averageFileSizeBytes': IDL.Nat,
        'totalSizeBytes': IDL.Nat,
        'verifiedDocuments': IDL.Nat,
        'totalDocuments': IDL.Nat,
      })],
      ['query'],
    ),
    'getTransactionDocuments': IDL.Func([IDL.Text], [IDL.Vec(DocumentProof)], ['query']),
    'getTransactionManagerCanister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'getUserManagementCanister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'markDocumentDeleted': IDL.Func([IDL.Nat, IDL.Text], [Result_2], []),
    'registerDocumentProof': IDL.Func(
      [IDL.Text, IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Text, IDL.Text],
      [Result_1],
      [],
    ),
    'setTransactionManagerCanister': IDL.Func([IDL.Principal, IDL.Text], [], []),
    'setUserManagementCanister': IDL.Func([IDL.Principal, IDL.Text], [], []),
    'verifyDocumentHash': IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [Result], []),
  });
};

const documentVerificationIdlFactory = ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }): IDL.ServiceClass => {
  const Time = IDL.Int;
  const AuditLog = IDL.Record({
    'id': IDL.Nat,
    'action': IDL.Text,
    'performedBy': IDL.Principal,
    'timestamp': Time,
    'details': IDL.Text,
    'success': IDL.Bool,
    'documentId': IDL.Nat,
  });
  const DocumentMetadata = IDL.Record({
    'id': IDL.Nat,
    'documentHash': IDL.Text,
    'documentType': IDL.Text,
    'contentType': IDL.Opt(IDL.Text),
    'propertyId': IDL.Nat,
    'fileName': IDL.Opt(IDL.Text),
    'fileSize': IDL.Opt(IDL.Nat),
    'isVerified': IDL.Bool,
    'lastVerificationId': IDL.Opt(IDL.Nat),
    'storageDocumentId': IDL.Opt(IDL.Nat),
    'uploadedAt': Time,
    'uploadedBy': IDL.Principal,
    'transactionId': IDL.Opt(IDL.Nat),
  });
  const VerificationMethod = IDL.Variant({
    'passport_dcs': IDL.Null,
    'commercial_api': IDL.Text,
    'system_hash_only': IDL.Null,
    'manual_solicitor': IDL.Null,
    'dvla_api': IDL.Null,
  });
  const DocumentVerification = IDL.Record({
    'id': IDL.Nat,
    'documentType': IDL.Text,
    'verificationDate': Time,
    'expiresAt': IDL.Opt(Time),
    'failureReason': IDL.Opt(IDL.Text),
    'propertyId': IDL.Nat,
    'hashVerified': IDL.Bool,
    'notes': IDL.Opt(IDL.Text),
    'documentId': IDL.Nat,
    'isValid': IDL.Bool,
    'expectedHash': IDL.Text,
    'calculatedHash': IDL.Text,
    'verifiedBy': IDL.Principal,
    'verificationMethod': VerificationMethod,
  });
  const Result = IDL.Variant({ 'ok': DocumentVerification, 'err': IDL.Text });
  return IDL.Service({
    'deleteDocument': IDL.Func([IDL.Nat], [IDL.Variant({ 'ok': IDL.Null, 'err': IDL.Text })], []),
    'getAuditLogs': IDL.Func([], [IDL.Vec(AuditLog)], ['query']),
    'getConfiguration': IDL.Func(
      [],
      [IDL.Record({
        'userManagement': IDL.Opt(IDL.Principal),
        'documentStorage': IDL.Opt(IDL.Principal),
      })],
      ['query'],
    ),
    'getDocument': IDL.Func([IDL.Nat], [IDL.Opt(DocumentMetadata)], ['query']),
    'getDocumentVerifications': IDL.Func([IDL.Nat], [IDL.Vec(DocumentVerification)], ['query']),
    'getPropertyDocuments': IDL.Func([IDL.Nat], [IDL.Vec(DocumentMetadata)], ['query']),
    'getRecentAuditLogs': IDL.Func([IDL.Nat], [IDL.Vec(AuditLog)], ['query']),
    'getStats': IDL.Func(
      [],
      [IDL.Record({
        'totalVerifications': IDL.Nat,
        'totalAuditLogs': IDL.Nat,
        'verifiedDocuments': IDL.Nat,
        'totalDocuments': IDL.Nat,
      })],
      ['query'],
    ),
    'getUnverifiedDocuments': IDL.Func([IDL.Nat], [IDL.Vec(DocumentMetadata)], ['query']),
    'getVerification': IDL.Func([IDL.Nat], [IDL.Opt(DocumentVerification)], ['query']),
    'getVerificationsByVerifier': IDL.Func([IDL.Principal], [IDL.Vec(DocumentVerification)], ['query']),
    'registerDocument': IDL.Func(
      [IDL.Nat, IDL.Opt(IDL.Nat), IDL.Text, IDL.Text, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat), IDL.Opt(IDL.Text)],
      [IDL.Nat],
      [],
    ),
    'setDocumentStorageCanister': IDL.Func([IDL.Principal], [], []),
    'setUserManagementCanister': IDL.Func([IDL.Principal], [], []),
    'verifyDocument': IDL.Func([IDL.Nat], [IDL.Bool], []),
    'verifyDocumentWithHash': IDL.Func([IDL.Nat, IDL.Opt(IDL.Text)], [Result], []),
    'verifyWithCommercialAPI': IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [Result], []),
    'verifyWithDVLA': IDL.Func([IDL.Nat, IDL.Text], [Result], []),
    'verifyWithPassportDCS': IDL.Func([IDL.Nat, IDL.Text], [Result], []),
  });
};

const propertyRegistryIdlFactory = ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }): IDL.ServiceClass => {
  const Result_3 = IDL.Variant({ 'ok': IDL.Vec(IDL.Text), 'err': IDL.Text });
  const Result_2 = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text });
  const PropertyStatus = IDL.Variant({
    'Listed': IDL.Null,
    'InTransaction': IDL.Null,
    'Cancelled': IDL.Null,
    'Completed': IDL.Null,
  });
  const Time = IDL.Int;
  const Property = IDL.Record({
    'id': IDL.Nat,
    'anonymousPropertyId': IDL.Text,
    'status': PropertyStatus,
    'propertyType': IDL.Text,
    'owner': IDL.Principal,
    'createdAt': Time,
    'size': IDL.Nat,
    'documentsComplete': IDL.Bool,
    'description': IDL.Text,
    'isVerified': IDL.Bool,
    'linkedProperties': IDL.Vec(IDL.Text),
    'address': IDL.Text,
    'chainPosition': IDL.Opt(IDL.Nat),
    'financingComplete': IDL.Bool,
    'price': IDL.Nat,
    'searchesComplete': IDL.Bool,
    'transactionId': IDL.Opt(IDL.Text),
  });
  const ChainPropertyView = IDL.Record({
    'status': PropertyStatus,
    'progressPercentage': IDL.Nat,
    'role': IDL.Text,
    'documentsComplete': IDL.Bool,
    'financingComplete': IDL.Bool,
    'searchesComplete': IDL.Bool,
    'anonymousId': IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'ok': ChainPropertyView, 'err': IDL.Text });
  const Result = IDL.Variant({ 'ok': IDL.Null, 'err': IDL.Text });
  return IDL.Service({
    'buildPropertyChain': IDL.Func([IDL.Text], [Result_3], []),
    'canViewFullPropertyDetails': IDL.Func([IDL.Text, IDL.Principal], [IDL.Bool], ['query']),
    'generateAnonymousPropertyId': IDL.Func([IDL.Text], [Result_2], []),
    'getAllProperties': IDL.Func([], [IDL.Vec(Property)], ['query']),
    'getProperty': IDL.Func([IDL.Nat], [IDL.Opt(Property)], ['query']),
    'getPropertyForChainView': IDL.Func([IDL.Text, IDL.Principal], [Result_1], ['query']),
    'registerProperty': IDL.Func([IDL.Text, IDL.Nat, IDL.Nat, IDL.Text, IDL.Text], [IDL.Nat], []),
    'transferOwnership': IDL.Func([IDL.Nat, IDL.Principal], [IDL.Bool], []),
    'updatePropertyProgress': IDL.Func([IDL.Nat, IDL.Bool, IDL.Bool, IDL.Bool], [Result], []),
    'updatePropertyStatus': IDL.Func([IDL.Nat, PropertyStatus], [Result], []),
    'updatePropertyTransaction': IDL.Func(
      [IDL.Nat, IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat), IDL.Vec(IDL.Text)],
      [Result],
      [],
    ),
    'verifyProperty': IDL.Func([IDL.Nat], [IDL.Bool], []),
  });
};

// ============================================================
// Conversion Helpers
// ============================================================

/** Extract a variant label from ICP-style { variantName: null } objects */
export function extractVariant(variant: Record<string, unknown>): string {
  const keys = Object.keys(variant);
  if (keys.length === 0) {
    throw new Error('Empty variant record');
  }
  return keys[0];
}

/** Convert ICP optional [T] | [] to T | undefined */
export function optToUndefined<T>(opt: [T] | []): T | undefined {
  if (Array.isArray(opt) && opt.length > 0) {
    return opt[0];
  }
  return undefined;
}

/** Convert a Principal to string, handling various forms */
export function principalToString(p: unknown): string {
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object') {
    if ('toText' in p && typeof (p as { toText: unknown }).toText === 'function') {
      return (p as { toText(): string }).toText();
    }
    if ('toString' in p && typeof (p as { toString: unknown }).toString === 'function') {
      return (p as { toString(): string }).toString();
    }
  }
  return String(p);
}

/** Convert a bigint-like ICP value to bigint */
function toBigInt(val: unknown): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') return BigInt(val);
  return BigInt(String(val));
}

/** Convert a bigint-like ICP value to number */
function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'bigint') return Number(val);
  return Number(val);
}

/**
 * Convert a Candid optional bigint-like value (`?Nat64` etc, encoded by
 * @icp-sdk as `[]` for None or `[value]` for Some) to bigint or undefined.
 *
 * Why this helper exists: the previous convention `raw.field ? toBigInt(...) : undefined`
 * silently fails because `[]` is truthy in JS. The truthy branch then calls
 * `optToUndefined([])` -> `undefined`, then `toBigInt(undefined)` throws
 * "Cannot convert undefined to a BigInt". Symptom: fresh transactions with
 * None-valued timestamps crash on join. Always go through optBigInt instead.
 */
function optBigInt(raw: unknown): bigint | undefined {
  const v = optToUndefined(raw as [unknown] | []);
  return v !== undefined ? toBigInt(v) : undefined;
}

/** Same shape as optBigInt, for `?Nat`/`?Int` fields converted to JS number. */
function optNumber(raw: unknown): number | undefined {
  const v = optToUndefined(raw as [unknown] | []);
  return v !== undefined ? toNumber(v) : undefined;
}

/** Convert raw ICP LandRegistryIntegration to typed version */
function convertLandRegistryIntegration(raw: Record<string, unknown>): LandRegistryIntegration {
  return {
    status: extractVariant(raw.status as Record<string, unknown>) as LandRegistryStatus,
    submittedToLRAt: optBigInt(raw.submittedToLRAt),
    lrPayloadID: optToUndefined(raw.lrPayloadID as [string] | []) ?? undefined,
    landRegistryConfirmationNumber: optToUndefined(raw.landRegistryConfirmationNumber as [string] | []) ?? undefined,
    estimatedLRCompletionTime: optBigInt(raw.estimatedLRCompletionTime),
  };
}

/** Convert raw ICP Transaction to typed Transaction */
export function convertTransaction(raw: Record<string, unknown>): Transaction {
  return {
    id: raw.id as string,
    status: extractVariant(raw.status as Record<string, unknown>) as TransactionStatus,
    propertyAddress: raw.propertyAddress as string,
    postcode: raw.postcode as string,
    propertyType: raw.propertyType as string,
    propertyCategory: raw.propertyCategory as string,
    transactionType: raw.transactionType as string,
    titleNumber: raw.titleNumber as string,
    amount: toBigInt(raw.amount),
    deposit: toBigInt(raw.deposit),
    mortgageAmount: toBigInt(raw.mortgageAmount),
    completionDate: raw.completionDate as string,
    mode: raw.mode as string,
    userRole: raw.userRole as string,
    buyer: principalToString(raw.buyer),
    seller: principalToString(raw.seller),
    solicitor: raw.solicitor ? principalToString(optToUndefined(raw.solicitor as [unknown] | [])) : undefined,
    createdBy: principalToString(raw.createdBy),
    createdAt: toBigInt(raw.createdAt),
    inviteCode: raw.inviteCode as string,
    propertyId: raw.propertyId as string,
    previousOwner: raw.previousOwner as string,
    accessList: (raw.accessList as unknown[]).map(principalToString),
    chainedTransactions: raw.chainedTransactions as string[],
    chainPosition: optNumber(raw.chainPosition),
    linkToTransaction: optToUndefined(raw.linkToTransaction as [string] | []) ?? undefined,
    exchangedAt: optBigInt(raw.exchangedAt),
    buyerSolicitorSignature: optToUndefined(raw.buyerSolicitorSignature as [string] | []) ?? undefined,
    sellerSolicitorSignature: optToUndefined(raw.sellerSolicitorSignature as [string] | []) ?? undefined,
    contractExchangeTimestamp: optBigInt(raw.contractExchangeTimestamp),
    completionInitiatedAt: optBigInt(raw.completionInitiatedAt),
    blockchainCompletedAt: optBigInt(raw.blockchainCompletedAt),
    blockchainCompletionProof: optToUndefined(raw.blockchainCompletionProof as [string] | []) ?? undefined,
    blockchainCompletionTimestamp: optBigInt(raw.blockchainCompletionTimestamp),
    buyerFundsHash: optToUndefined(raw.buyerFundsHash as [string] | []) ?? undefined,
    completionStatementHash: optToUndefined(raw.completionStatementHash as [string] | []) ?? undefined,
    landRegistryRegisteredAt: optBigInt(raw.landRegistryRegisteredAt),
    landRegistryIntegration: convertLandRegistryIntegration(
      raw.landRegistryIntegration as Record<string, unknown>,
    ),
  };
}

/** Convert raw ICP UserProfile to typed UserProfile */
export function convertUserProfile(raw: Record<string, unknown>): UserProfile {
  return {
    principal: principalToString(raw.principal),
    name: raw.name as string,
    email: raw.email as string,
    mobile: raw.mobile as string,
    userType: extractVariant(raw.userType as Record<string, unknown>) as UserType,
    isVerified: raw.isVerified as boolean,
    emailVerified: raw.emailVerified as boolean,
    createdAt: toBigInt(raw.createdAt),
    solicitorLicenseNumber: optToUndefined(raw.solicitorLicenseNumber as [string] | []) ?? undefined,
    lawFirmName: optToUndefined(raw.lawFirmName as [string] | []) ?? undefined,
    lawFirmAddress: optToUndefined(raw.lawFirmAddress as [string] | []) ?? undefined,
    firmId: optToUndefined(raw.firmId as [string] | []) ?? undefined,
    isPlatformOnlySolicitor: raw.isPlatformOnlySolicitor as boolean,
    clientPrincipals: (raw.clientPrincipals as unknown[]).map(principalToString),
    managedBySolicitor: raw.managedBySolicitor
      ? principalToString(optToUndefined(raw.managedBySolicitor as [unknown] | []))
      : undefined,
  };
}

/** Convert raw ICP DocumentProof to typed DocumentProof */
export function convertDocumentProof(raw: Record<string, unknown>): DocumentProof {
  return {
    id: toNumber(raw.id),
    fileName: raw.fileName as string,
    fileHash: raw.fileHash as string,
    fileSize: toNumber(raw.fileSize),
    contentType: raw.contentType as string,
    docType: raw.docType as string,
    storageLocation: raw.storageLocation as string,
    uploadedBy: principalToString(raw.uploadedBy),
    uploadedAt: toBigInt(raw.uploadedAt),
    transactionId: optToUndefined(raw.transactionId as [string] | []) ?? undefined,
    verified: raw.verified as boolean,
  };
}

/** Convert raw ICP Property to typed Property */
export function convertProperty(raw: Record<string, unknown>): Property {
  return {
    id: toNumber(raw.id),
    anonymousPropertyId: raw.anonymousPropertyId as string,
    status: extractVariant(raw.status as Record<string, unknown>) as PropertyStatus,
    propertyType: raw.propertyType as string,
    owner: principalToString(raw.owner),
    address: raw.address as string,
    description: raw.description as string,
    price: toNumber(raw.price),
    size: toNumber(raw.size),
    isVerified: raw.isVerified as boolean,
    documentsComplete: raw.documentsComplete as boolean,
    searchesComplete: raw.searchesComplete as boolean,
    financingComplete: raw.financingComplete as boolean,
    createdAt: toBigInt(raw.createdAt),
    transactionId: optToUndefined(raw.transactionId as [string] | []) ?? undefined,
    chainPosition: raw.chainPosition
      ? toNumber(optToUndefined(raw.chainPosition as [unknown] | []))
      : undefined,
    linkedProperties: raw.linkedProperties as string[],
  };
}

// ============================================================
// Canister Client Class
// ============================================================

export class CanisterClient {
  private agent: HttpAgent;
  private identity?: Identity;
  private actors: Map<string, ActorSubclass<Record<string, unknown>>> = new Map();

  constructor(
    private host: string = 'https://icp0.io',
    identity?: Identity,
  ) {
    this.identity = identity;
    this.agent = new HttpAgent({
      host: this.host,
      ...(identity ? { identity } : {}),
    });
  }

  private getActor(
    canisterId: string,
    idlFactory: ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }) => IDL.ServiceClass,
  ): ActorSubclass<Record<string, unknown>> {
    const cached = this.actors.get(canisterId);
    if (cached) return cached;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CJS/ESM IDL type mismatch
    const actor = Actor.createActor(idlFactory as any, {
      agent: this.agent,
      canisterId,
    }) as ActorSubclass<Record<string, unknown>>;

    this.actors.set(canisterId, actor);
    return actor;
  }

  getTransactionManager(): ActorSubclass<Record<string, unknown>> {
    return this.getActor(CANISTER_IDS.transactionManager, transactionManagerIdlFactory);
  }

  getUserManagement(): ActorSubclass<Record<string, unknown>> {
    return this.getActor(CANISTER_IDS.userManagement, userManagementIdlFactory);
  }

  getDocumentStorage(): ActorSubclass<Record<string, unknown>> {
    return this.getActor(CANISTER_IDS.documentStorage, documentStorageIdlFactory);
  }

  getDocumentVerification(): ActorSubclass<Record<string, unknown>> {
    return this.getActor(CANISTER_IDS.documentVerification, documentVerificationIdlFactory);
  }

  getPropertyRegistry(): ActorSubclass<Record<string, unknown>> {
    return this.getActor(CANISTER_IDS.propertyRegistry, propertyRegistryIdlFactory);
  }

  /** Get the bot's principal ID as a text string */
  getPrincipal(): string {
    if (this.identity && typeof this.identity.getPrincipal === 'function') {
      return this.identity.getPrincipal().toText();
    }
    return 'anonymous';
  }
}

/** Factory function to create a new CanisterClient instance */
export function createCanisterClient(identity?: Identity): CanisterClient {
  return new CanisterClient('https://icp0.io', identity);
}
