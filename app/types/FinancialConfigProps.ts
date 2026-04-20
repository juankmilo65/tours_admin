/**
 * Financial Config Types - Type definitions for Financial Configuration Management
 */

export interface FinancialConfig {
  id: string;
  countryCode: string;
  stripeConnectEnabled: boolean;
  kycRequired: boolean;
  paymentMethodTypes: string[];
  commissionDefaultPercent: string;
  holdPeriodHours: number;
  stripeMaxRefundDays: number;
  stripeMaxDisputeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialConfigDto {
  countryCode: string;
  commissionDefaultPercent: number;
  holdPeriodHours: number;
  paymentMethodTypes: string[];
  stripeConnectEnabled: boolean;
  kycRequired: boolean;
}

export interface UpdateFinancialConfigDto {
  commissionDefaultPercent?: number;
  holdPeriodHours?: number;
  paymentMethodTypes?: string[];
  stripeConnectEnabled?: boolean;
  kycRequired?: boolean;
}

export interface FinancialConfigResponse {
  success: boolean;
  data?: FinancialConfig;
  message?: string;
  error?: {
    message?: string;
  };
}

export interface FinancialConfigsResponse {
  success: boolean;
  data?: FinancialConfig[];
  message?: string;
  error?: { message?: string };
}
