/**
 * User Commission Types - Type definitions for User Commission Management
 */

export interface UserCommissionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface UserCommission {
  id: string;
  userId: string;
  commissionPercentage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: UserCommissionUser;
}

export interface CreateUserCommissionDto {
  userId: string;
  commissionPercentage: number;
  isActive: boolean;
}

export interface UpdateUserCommissionDto {
  commissionPercentage?: number;
  isActive?: boolean;
}

export interface UserCommissionResponse {
  success: boolean;
  data?: UserCommission;
  message?: string;
  error?: {
    message?: string;
  };
}

export interface UserCommissionsResponse {
  success: boolean;
  data?: UserCommission[];
  message?: string;
  error?: { message?: string };
}
