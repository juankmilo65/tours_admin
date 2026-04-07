/**
 * KYC Types
 * Types for Know Your Customer verification
 */

export interface KycStatus {
  isRequired: boolean;
  isComplete: boolean;
  percentageComplete: number;
  stripeAccountId?: string;
  contactEmail?: string;
  requirementsNeeded?: string[];
  lastUpdated?: string;
}
