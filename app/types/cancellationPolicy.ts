/**
 * Cancellation Policy Types
 * Types for cancellation policies and refund calculations
 */

export interface CancellationPolicyTier {
  id: string;
  hoursBeforeTour: number;
  refundPercentage: number;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  tiers: CancellationPolicyTier[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CancellationRefundCalculation {
  policyId: string;
  hoursTillTour: number;
  totalPrice: number;
  refundPercentage: number;
  refundAmount: number;
  isEligibleForRefund: boolean;
  reason?: string;
}
