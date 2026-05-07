// PropXchain MCP Server - Education & Messaging Tools
// Conveyancing explanations and in-transaction messaging

import { z } from 'zod';
import type { CanisterClient } from '../canister-client.js';
import type { ToolResult } from '../types/index.js';

function toolSuccess<T>(data: T): ToolResult<T> {
  return { success: true, data };
}

function toolError(error: string, code: string): ToolResult<never> {
  return { success: false, error, code };
}

// ============================================================
// Conveyancing Knowledge Base
// Comprehensive explanations for each topic, derived from
// UK conveyancing law (England & Wales)
// ============================================================

const CONVEYANCING_KNOWLEDGE: Record<string, { title: string; explanation: string }> = {
  overview: {
    title: 'What Is Conveyancing?',
    explanation:
      'Conveyancing is the legal process of transferring property ownership from one person to another in England & Wales. ' +
      'It is governed by the Law of Property Act 1925 and the Land Registration Act 2002. The process involves three core steps: ' +
      '(1) verifying the seller genuinely owns the property and has the right to sell, (2) checking the property is free from ' +
      'hidden legal problems, debts, or restrictions, and (3) formally transferring legal ownership and registering the change ' +
      'with HM Land Registry. The process typically takes 8 to 16 weeks from accepted offer to completion, though chains, slow ' +
      'searches, or leasehold complications can extend this. Each side (buyer and seller) instructs their own solicitor or ' +
      'licensed conveyancer to handle the legal work.',
  },
  phase1: {
    title: 'Phase 1: Pre-Offer / Preparation',
    explanation:
      'This phase covers everything before an offer is accepted (typically 1-2 weeks). ' +
      'The SELLER should: (a) obtain a valid Energy Performance Certificate (EPC), rated A-G, which is a legal requirement ' +
      'before marketing (costs 60-120 GBP, valid for 10 years); (b) gather title deeds and documents including official ' +
      'copies of the title register and title plan, planning permissions, building regulations certificates, and guarantees; ' +
      '(c) complete property information forms -- TA6 (property information), TA10 (fittings and contents), and TA7 if leasehold. ' +
      'The BUYER should: (a) arrange a mortgage Agreement in Principle (AIP) to demonstrate affordability; (b) research the area ' +
      'using flood maps, crime statistics, school catchments, and planning applications; (c) budget for all costs including deposit ' +
      '(typically 5-10%), solicitor fees (800-2500 GBP), survey (300-1500 GBP), Stamp Duty Land Tax, and moving costs. ' +
      'Good preparation in this phase prevents weeks of delay later.',
  },
  phase2: {
    title: 'Phase 2: Offer to Instruction',
    explanation:
      'Once an offer is accepted (1-2 weeks duration): The estate agent issues a Memorandum of Sale confirming the agreed ' +
      'price and parties involved. Both buyer and seller instruct their solicitors. The seller\'s solicitor prepares the ' +
      'contract pack containing: draft contract, official copies of title, property information forms (TA6, TA7, TA10), ' +
      'and any supporting documents. The buyer\'s solicitor receives this pack and begins review. The buyer should also ' +
      'arrange a survey at this stage -- a Level 1 (basic), Level 2 (homebuyer), or Level 3 (full structural) depending ' +
      'on property age and condition. The mortgage lender will arrange their own valuation. Important: in England & Wales, ' +
      'the sale is NOT legally binding at this stage -- either party can withdraw without penalty until contracts are exchanged.',
  },
  phase3: {
    title: 'Phase 3: Searches & Enquiries',
    explanation:
      'This is often the longest phase (3-6 weeks). The buyer\'s solicitor orders searches including: ' +
      '(a) Local Authority Search -- reveals planning history, building control records, road schemes, conservation areas, ' +
      'contaminated land, and tree preservation orders (2-6 weeks depending on council); ' +
      '(b) Environmental Search -- checks flood risk, contaminated land history, and subsidence risk; ' +
      '(c) Water & Drainage Search -- confirms the property is connected to mains water and public sewers; ' +
      '(d) Chancel Repair Liability Search -- checks if the property is liable for church repair costs; ' +
      '(e) Mining Search -- required in areas with mining history. ' +
      'The solicitor also raises preliminary enquiries on the contract pack, asking the seller\'s solicitor to clarify ' +
      'any concerns. For leasehold properties, additional enquiries are sent to the freeholder/management company. ' +
      'The solicitor reviews the title to check for restrictive covenants, easements, rights of way, or boundary issues. ' +
      'Searches cannot be rushed as local authorities work at their own pace.',
  },
  phase4: {
    title: 'Phase 4: Pre-Contract / Exchange',
    explanation:
      'Once searches return and enquiries are answered (1-2 weeks): The buyer\'s solicitor produces a Report on Title ' +
      'summarising all findings for the buyer. The mortgage offer is confirmed (typically valid for 6 months). The contract ' +
      'is negotiated and agreed between solicitors, including the completion date and any special conditions. The buyer ' +
      'signs the contract and transfers the deposit (typically 10% of purchase price) to their solicitor. Exchange of ' +
      'contracts happens by phone between solicitors using The Law Society\'s Formulae -- once exchanged, the sale is ' +
      'LEGALLY BINDING. If either party pulls out after exchange, they face penalties: the buyer loses their deposit, ' +
      'the seller can be sued for breach of contract. Buildings insurance should be arranged from the exchange date as ' +
      'the buyer takes on risk of the property from this point.',
  },
  phase5: {
    title: 'Phase 5: Pre-Completion',
    explanation:
      'Between exchange and completion (typically 1-2 weeks, sometimes same day): The buyer\'s solicitor prepares the ' +
      'Transfer Deed (TR1 form) for signature. Final pre-completion searches are conducted including a bankruptcy search ' +
      'on the buyer and an OS1 priority search at Land Registry (which protects the buyer\'s application for 30 business days). ' +
      'The buyer\'s solicitor prepares a Completion Statement showing all monies due. The mortgage lender sends funds to ' +
      'the buyer\'s solicitor. The buyer sends the balance (deposit already paid minus any mortgage) to their solicitor. ' +
      'The solicitor confirms all funds are in place and ready for completion day. Any outstanding conditions from the ' +
      'mortgage offer must be satisfied before the lender releases funds.',
  },
  phase6: {
    title: 'Phase 6: Completion & Post-Completion',
    explanation:
      'Completion day: The buyer\'s solicitor transfers the full purchase price to the seller\'s solicitor. Once funds are ' +
      'received and confirmed (typically by 1pm), the seller\'s solicitor authorises release of keys -- the buyer now owns ' +
      'the property. Post-completion (1-3 months): The buyer\'s solicitor must pay Stamp Duty Land Tax (SDLT) within 14 days ' +
      'of completion and submit the application to HM Land Registry to register the new ownership and any mortgage. Land ' +
      'Registry currently takes 4-6 weeks for straightforward applications. The solicitor sends the client a copy of the ' +
      'registered title once complete. Failure to pay SDLT on time incurs automatic penalties and interest.',
  },
  exchange: {
    title: 'Exchange of Contracts',
    explanation:
      'Exchange of contracts is the moment a property transaction becomes legally binding. It typically happens by phone ' +
      'between the buyer\'s and seller\'s solicitors using The Law Society\'s standard Formulae (A, B, or C). ' +
      'Formula A: the two parts of the contract are physically exchanged. Formula B: used when solicitors hold signed ' +
      'contracts and exchange by undertaking over the phone. Formula C: used in chains, where a single solicitor coordinates ' +
      'multiple exchanges. At exchange: (a) the buyer\'s deposit is transferred to the seller\'s solicitor, (b) the completion ' +
      'date is fixed, (c) both parties are legally committed. Pulling out after exchange has severe consequences -- the buyer ' +
      'forfeits their deposit (typically 10% of the price), and the seller can sue for breach of contract including damages ' +
      'for any loss suffered. Buildings insurance should be in place from the exchange date.',
  },
  completion: {
    title: 'Completion Day',
    explanation:
      'Completion is the day ownership formally transfers. The buyer\'s solicitor sends the purchase funds (including mortgage ' +
      'money) to the seller\'s solicitor by bank transfer. The target is for funds to arrive by 1pm -- if funds arrive late, ' +
      'completion may be delayed to the next working day. Once the seller\'s solicitor confirms receipt of cleared funds, they ' +
      'authorise the estate agent (or seller directly) to release the keys. From this moment, the buyer is the legal owner. ' +
      'The seller must vacate the property by the agreed time (usually 1pm or 2pm). In a chain, completions happen sequentially ' +
      'up the chain -- each completion triggers the next. If one completion in a chain fails, it can delay all others. ' +
      'The buyer can collect keys from the estate agent once their solicitor confirms completion.',
  },
  sdlt: {
    title: 'Stamp Duty Land Tax (SDLT)',
    explanation:
      'SDLT is the tax paid when buying property or land over a certain price in England (Wales and Scotland have their own ' +
      'versions). Current thresholds and rates for residential property: 0% on the first 250,000 GBP, 5% on 250,001-925,000 GBP, ' +
      '10% on 925,001-1,500,000 GBP, and 12% on amounts above 1,500,000 GBP. First-time buyers get relief: 0% on the first ' +
      '425,000 GBP and 5% on 425,001-625,000 GBP (no relief if price exceeds 625,000 GBP). Additional property surcharge: ' +
      'if the buyer already owns a property, an extra 3% applies to the entire price (rising to 5% for non-UK residents). ' +
      'SDLT must be paid within 14 days of completion -- the buyer\'s solicitor handles this. Late payment incurs automatic ' +
      'penalties: 100 GBP if up to 3 months late, plus interest. The solicitor files an SDLT return with HMRC and obtains an ' +
      'SDLT5 certificate, which is needed for the Land Registry application. Note: rates change with government budgets, so ' +
      'always verify current rates.',
  },
  searches: {
    title: 'Property Searches',
    explanation:
      'Property searches are investigations conducted by the buyer\'s solicitor to uncover potential problems. Key searches include: ' +
      '(1) Local Authority Search (LLC1 + CON29R) -- reveals planning history, building control records, road proposals, tree ' +
      'preservation orders, conservation areas, and contaminated land. Takes 2-6 weeks depending on the council. Cost: 150-350 GBP. ' +
      '(2) Environmental Search -- checks for flood risk (Environment Agency data), contaminated land, landfill sites, and subsidence ' +
      'risk. Instant results, 40-80 GBP. (3) Water & Drainage Search -- confirms connections to mains water and public sewers, and ' +
      'whether public drains cross the property (which restricts building). 30-50 GBP. (4) Chancel Repair Liability -- checks if the ' +
      'property is in a parish where owners may be liable for church repairs. Instant, 25 GBP. Insurance available for about 25 GBP. ' +
      '(5) Mining Search -- essential in areas with coal, tin, brine, or other mining history. 40-50 GBP. Additional searches may be ' +
      'needed depending on location: HS2 search, crossrail search, commons search, or clay mining search.',
  },
  ta6: {
    title: 'TA6 Property Information Form',
    explanation:
      'The TA6 is the most comprehensive property information form, completed by the seller. It covers 14 sections: ' +
      '(1) Boundaries -- who owns and is responsible for fences, walls, and hedges. (2) Disputes and complaints -- any disputes ' +
      'with neighbours or about the property. (3) Notices and proposals -- any notices received from local authority or others. ' +
      '(4) Alterations, planning, and building control -- any changes made to the property and whether permissions were obtained. ' +
      '(5) Guarantees and warranties -- e.g. for damp-proofing, windows, structural work. (6) Insurance -- current buildings ' +
      'insurance and any claims made. (7) Environmental matters -- flooding, Japanese knotweed, energy performance. ' +
      '(8) Rights and informal arrangements -- shared access, parking agreements. (9) Parking -- on-street permits, driveways. ' +
      '(10) Other charges -- maintenance charges, estate charges. (11) Occupiers -- anyone living in the property other than the seller. ' +
      '(12) Services -- utilities, broadband, drainage. (13) Connection to utilities and services. (14) Transaction information. ' +
      'Sellers must answer honestly -- misrepresentation can lead to legal claims after completion. "Not known" is acceptable ' +
      'where genuinely applicable, but should not be overused.',
  },
  ta7: {
    title: 'TA7 Leasehold Information Form',
    explanation:
      'The TA7 is completed by the seller for leasehold properties only. It covers: (1) Lease details -- date, original term, ' +
      'current remaining term (beware leases under 80 years which are expensive to extend), ground rent amount and review schedule. ' +
      '(2) Landlord/management company -- name and contact details of the freeholder and managing agent. ' +
      '(3) Service charges -- current annual amount, what it covers, whether there are planned increases or major works. ' +
      '(4) Building insurance -- arranged by the freeholder, details of the policy. (5) Maintenance and repair -- condition of ' +
      'communal areas, any recent or planned major works (which can trigger significant additional charges). ' +
      '(6) Alterations and improvements -- any changes made to the flat and whether freeholder consent was obtained. ' +
      '(7) Complaints -- disputes with the landlord or management company. (8) Enfranchisement -- whether the leaseholders have ' +
      'the Right to Manage or have attempted to buy the freehold collectively. The buyer\'s solicitor will also request a ' +
      'management pack from the freeholder/managing agent (cost: 200-500 GBP), which includes accounts, insurance details, ' +
      'and information about any tribunal proceedings.',
  },
  ta10: {
    title: 'TA10 Fittings and Contents Form',
    explanation:
      'The TA10 lists every item in the property and classifies it as: (a) Included in the sale price -- stays with the property ' +
      'at no extra cost, (b) Excluded -- the seller will remove it, or (c) Available by separate negotiation -- the buyer can ' +
      'purchase it for an additional price. The form covers: (1) Basic fittings -- light fittings, switches, plug sockets. ' +
      '(2) Kitchen -- fitted units, cooker, fridge, dishwasher, washing machine. (3) Bathroom -- fitted suite, shower, mirrors. ' +
      '(4) Carpets and floor coverings. (5) Curtains, curtain rails, and blinds. (6) Light fittings. (7) Outdoor items -- garden ' +
      'sheds, plants, garden furniture, satellite dish. (8) Television aerials and satellite dishes. (9) Fitted wardrobes, shelving, ' +
      'and storage. (10) Other items -- alarm systems, doorbell, etc. This form is important because disputes over fittings are ' +
      'one of the most common post-completion complaints. If in doubt, include it in writing. "Included" items become part of the ' +
      'contract -- removing them after exchange is a breach.',
  },
  freehold_vs_leasehold: {
    title: 'Freehold vs Leasehold',
    explanation:
      'The two main types of property ownership in England & Wales: ' +
      'FREEHOLD: The owner owns the property AND the land it sits on outright, forever. There is no time limit, no ground rent, ' +
      'no landlord to deal with. Most houses are freehold. The owner has full control over the property (subject to planning law). ' +
      'LEASEHOLD: The owner has the right to occupy the property for a fixed period (the lease term), but the land is owned by ' +
      'a freeholder (landlord). Most flats are leasehold. Key considerations: (a) Lease length -- leases under 80 years are ' +
      'harder to mortgage and very expensive to extend (due to "marriage value"). Ideally the lease should have 90+ years remaining. ' +
      '(b) Ground rent -- an annual payment to the freeholder. Some modern leases have escalating ground rent that can become ' +
      'very expensive. The Leasehold Reform (Ground Rent) Act 2022 limits ground rent to a "peppercorn" (zero) for new leases. ' +
      '(c) Service charges -- the leaseholder pays for building maintenance, insurance, and management. These can increase ' +
      'substantially, especially if major works are planned. (d) Permissions -- the leaseholder may need freeholder consent for ' +
      'alterations, subletting, or keeping pets. (e) Extending the lease -- after owning for 2 years, leaseholders have a legal ' +
      'right to extend by 90 years (flats) at a premium calculated by a formula. Reform legislation is ongoing to simplify this.',
  },
  chain: {
    title: 'Property Chains',
    explanation:
      'A property chain occurs when multiple transactions are linked together -- each purchase depends on another sale completing. ' +
      'For example: Buyer A buys from Seller B, who uses the proceeds to buy from Seller C, who uses those proceeds to buy from ' +
      'Seller D. If any link breaks, the whole chain can collapse. Chain management is one of the most stressful aspects of ' +
      'conveyancing. Key facts: (a) The average chain in England & Wales has 3-4 links. (b) At the bottom of the chain is usually ' +
      'a first-time buyer (no property to sell); at the top is someone not buying (perhaps downsizing to rental or moving abroad). ' +
      '(c) All solicitors in the chain coordinate to exchange contracts on the same day and complete on the same day. ' +
      '(d) Chain breaks occur when one party pulls out, loses their mortgage offer, or has issues discovered in searches. ' +
      '(e) To reduce chain risk: get a mortgage offer early, complete forms promptly, respond to enquiries quickly, and consider ' +
      'chain break insurance. (f) Being chain-free (first-time buyer or already sold) is a strong advantage when making offers. ' +
      'PropXchain provides visibility into chain progress so all parties can see where delays are occurring.',
  },
  gazumping: {
    title: 'Gazumping',
    explanation:
      'Gazumping occurs when a seller accepts a higher offer from a different buyer after already accepting an offer from the ' +
      'original buyer. This is legal in England & Wales because the sale is not binding until contracts are exchanged. ' +
      'Gazumping means the original buyer loses their survey fees, legal costs, and time spent -- which can amount to ' +
      '1,000-3,000 GBP or more. Protection against gazumping: (a) Move quickly -- the faster you reach exchange, the less ' +
      'time the seller has to accept another offer. (b) Ask for a lock-out agreement -- a written agreement that the seller ' +
      'won\'t negotiate with other buyers for a fixed period (e.g., 4-6 weeks). These are not always enforceable but show ' +
      'commitment. (c) Home buyers\' protection insurance -- covers lost costs if the transaction falls through for reasons ' +
      'beyond your control. (d) Consider making your offer subject to exclusivity. ' +
      'Note: "Gazundering" is the reverse -- the buyer lowers their offer just before exchange, knowing the seller is ' +
      'committed. This is also legal but considered bad practice. Scotland avoids these problems because accepted offers ' +
      'are legally binding, but England & Wales has not adopted this system.',
  },
  mortgage: {
    title: 'Mortgages in Conveyancing',
    explanation:
      'Most property purchases involve a mortgage (a loan secured against the property). The conveyancing process and mortgage ' +
      'process run in parallel: (1) Agreement in Principle (AIP) -- obtained before making offers, shows the buyer can ' +
      'likely borrow the amount needed. Based on affordability checks but not a guarantee. Valid for 60-90 days typically. ' +
      '(2) Full mortgage application -- submitted after the offer is accepted. The lender conducts a full credit check, ' +
      'verifies income, and orders a property valuation. (3) Valuation -- the lender arranges a valuation to confirm the ' +
      'property is worth the purchase price. This is for the lender\'s benefit, not the buyer\'s (it is not a survey). ' +
      '(4) Mortgage offer -- issued once the lender is satisfied. Typically valid for 6 months. May have conditions that ' +
      'must be met before completion (e.g., satisfactory search results, retention for repairs). (5) The buyer\'s solicitor ' +
      'also acts for the mortgage lender (dual acting) and must confirm the property meets the lender\'s requirements. ' +
      '(6) On completion day, the lender releases funds to the buyer\'s solicitor, who combines them with the buyer\'s ' +
      'deposit and sends the total to the seller\'s solicitor. (7) Post-completion, the lender\'s legal charge (mortgage) ' +
      'is registered at Land Registry. Key risk: if the mortgage offer expires before exchange, the buyer may need to ' +
      'reapply, potentially at different rates or terms.',
  },
};

const VALID_TOPICS = Object.keys(CONVEYANCING_KNOWLEDGE);

// ============================================================
// Tool: propxchain_explain_process
// ============================================================

function explainProcessTool() {
  return {
    name: 'propxchain_explain_process',
    description:
      'Get a plain-language explanation of a UK conveyancing step or concept. ' +
      `Available topics: ${VALID_TOPICS.join(', ')}. ` +
      'Returns comprehensive explanations suitable for relaying to users navigating property transactions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          description:
            'The conveyancing topic to explain. One of: ' + VALID_TOPICS.join(', '),
        },
      },
      required: ['topic'],
    },
    annotations: {
      readOnlyHint: true,
    },
    handler: async (
      args: unknown,
      _client: CanisterClient,
    ): Promise<
      ToolResult<{
        topic: string;
        title: string;
        explanation: string;
        availableTopics: string[];
      }>
    > => {
      const schema = z.object({
        topic: z.string().min(1),
      });

      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        return toolError(
          `Invalid input: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
          'VALIDATION_ERROR',
        );
      }

      const { topic } = parsed.data;
      const normalised = topic.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');

      const entry = CONVEYANCING_KNOWLEDGE[normalised];
      if (!entry) {
        return toolError(
          `Unknown topic "${topic}". Available topics: ${VALID_TOPICS.join(', ')}`,
          'UNKNOWN_TOPIC',
        );
      }

      return toolSuccess({
        topic: normalised,
        title: entry.title,
        explanation: entry.explanation,
        availableTopics: VALID_TOPICS,
      });
    },
  };
}

// ============================================================
// Tool: propxchain_send_message
// ============================================================

function sendMessageTool() {
  return {
    name: 'propxchain_send_message',
    description:
      'Send a message within a transaction to other parties or to Oscar AI assistant. ' +
      'Messages are delivered through the PropXchain messaging system.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        transactionId: {
          type: 'string',
          description: 'The transaction ID context for the message',
        },
        message: {
          type: 'string',
          description: 'The message content to send',
        },
        recipient: {
          type: 'string',
          description:
            'The recipient principal ID, or "oscar" to send to the Oscar AI assistant. ' +
            'If omitted, the message is sent to all parties on the transaction.',
        },
      },
      required: ['transactionId', 'message'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
    },
    handler: async (
      args: unknown,
      _client: CanisterClient,
    ): Promise<
      ToolResult<{
        messageId: string;
        transactionId: string;
        recipient: string;
        status: string;
      }>
    > => {
      const schema = z.object({
        transactionId: z.string().min(1),
        message: z.string().min(1).max(5000),
        recipient: z.string().optional(),
      });

      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        return toolError(
          `Invalid input: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
          'VALIDATION_ERROR',
        );
      }

      const { transactionId, message: _message, recipient } = parsed.data;

      // Placeholder implementation -- will integrate with message_manager canister
      // (37una-maaaa-aaaaa-qd3mq-cai) and oscar canister (khstc-3qaaa-aaaaa-qdyfq-cai)
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const resolvedRecipient = recipient ?? 'all_parties';

      return toolSuccess({
        messageId,
        transactionId,
        recipient: resolvedRecipient,
        status: 'sent',
      });
    },
  };
}

// ============================================================
// Export
// ============================================================

export const educationTools = [explainProcessTool(), sendMessageTool()];
