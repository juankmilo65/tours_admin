/**
 * Users Business Logic - Business layer for User Management
 */

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  uploadUserAvatar,
  deleteUserAvatar,
  type User,
  type CreateUserDto,
  type UpdateUserDto,
  type UsersResponse,
  type GetUsersParams,
} from '../users';

export type { User, CreateUserDto, UpdateUserDto, UsersResponse, GetUsersParams };

/**
 * Get all users with filters and pagination
 */
export const getAllUsersBusiness = async (params?: GetUsersParams): Promise<UsersResponse> => {
  try {
    const result = (await getAllUsers(params)) as UsersResponse;

    if (result.success === true && result.data !== undefined) {
      return result;
    }

    return {
      success: false,
      data: {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      },
    };
  } catch (error) {
    console.error('Error in getAllUsersBusiness:', error);
    return {
      success: false,
      data: {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      },
    };
  }
};

/**
 * Get user by ID
 */
export const getUserByIdBusiness = async (
  userId: string,
  token: string,
  language = 'es'
): Promise<User | null> => {
  try {
    const result = (await getUserById(userId, token, language)) as {
      success?: boolean;
      data?: User;
    };

    if (result.success === true && result.data !== undefined) {
      return result.data;
    }

    return null;
  } catch (error) {
    console.error('Error in getUserByIdBusiness:', error);
    return null;
  }
};

/**
 * Create new user
 */
export const createUserBusiness = async (
  userData: CreateUserDto,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: { id: string } }> => {
  try {
    const result = (await createUser(userData, token, language)) as {
      success?: boolean;
      message?: string;
      data?: { id: string };
      error?: { message?: string };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: { id: string } };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error creating user',
    };
  } catch (error) {
    console.error('Error in createUserBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error creating user',
    };
  }
};

/**
 * Update user
 */
export const updateUserBusiness = async (
  userId: string,
  userData: Partial<UpdateUserDto>,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: User }> => {
  try {
    const result = (await updateUser(userId, userData, token, language)) as {
      success?: boolean;
      message?: string;
      data?: User;
      error?: { message?: string };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: User };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error updating user',
    };
  } catch (error) {
    console.error('Error in updateUserBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error updating user',
    };
  }
};

/**
 * Toggle user active status
 */
export const toggleUserStatusBusiness = async (
  userId: string,
  isActive: boolean,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string }> => {
  try {
    const result = (await toggleUserStatus(userId, isActive, token, language)) as {
      success?: boolean;
      message?: string;
      error?: { message?: string };
    };

    if (result.success === true) {
      return result as { success: boolean; message?: string };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error toggling user status',
    };
  } catch (error) {
    console.error('Error in toggleUserStatusBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error toggling user status',
    };
  }
};

/**
 * Upload user avatar
 */
export const uploadUserAvatarBusiness = async (
  userId: string,
  imageFile: File,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: { avatarUrl: string } }> => {
  try {
    const result = (await uploadUserAvatar(userId, imageFile, token, language)) as {
      success?: boolean;
      message?: string;
      data?: { avatarUrl: string };
      error?: { message?: string };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: { avatarUrl: string } };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error uploading avatar',
    };
  } catch (error) {
    console.error('Error in uploadUserAvatarBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error uploading avatar',
    };
  }
};

/**
 * Delete user avatar
 */
export const deleteUserAvatarBusiness = async (
  userId: string,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string }> => {
  try {
    const result = (await deleteUserAvatar(userId, token, language)) as {
      success?: boolean;
      message?: string;
      error?: { message?: string };
    };

    if (result.success === true) {
      return result as { success: boolean; message?: string };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error deleting avatar',
    };
  } catch (error) {
    console.error('Error in deleteUserAvatarBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error deleting avatar',
    };
  }
};
