/**
 * Users Business Logic - Business layer for User Management
 */

import type { User, UsersResponse, GetUsersParams, CreateUserDto, UpdateUserDto } from '../users';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  uploadUserAvatar,
  deleteUserAvatar,
  getUsersDropdown,
} from '../users';

export type { User, CreateUserDto, UpdateUserDto, UsersResponse, GetUsersParams };

// In-memory cache for users dropdown to avoid rate limiting
const usersDropdownCache = new Map<string, { data: User[]; timestamp: number }>();
const USERS_DROPDOWN_TTL = 5 * 60 * 1000; // 5 minutes

/** Clear the in-memory users dropdown cache (call after user mutations) */
export const clearUsersDropdownCache = (): void => {
  usersDropdownCache.clear();
};

/**
 * Get all users with filters and pagination
 */
export const getAllUsersBusiness = async (params?: GetUsersParams): Promise<UsersResponse> => {
  try {
    const result = (await getAllUsers(params)) as {
      success?: boolean;
      data?: {
        users: User[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    };

    if (result.success === true && result.data !== undefined) {
      return result as UsersResponse;
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

/**
 * Get users for dropdown (simplified format for filters)
 * @param roles - Array of roles to filter users (e.g., ['admin', 'owner'] or ['user'])
 * @param isActive - Optional active status filter
 * @param token - Auth token
 * @param language - Language preference
 */
/** Shape returned by getUsersDropdownBusiness */
export interface UserDropdownItem {
  id: string;
  firstName: string;
  email: string;
  ownerKycVerified?: boolean;
  nationalityId?: string;
  nationality?: { id: string; code: string; name_es: string; name_en: string };
  identificationTypeId?: string;
  identificationType?: { id: string; code: string; name_es: string; name_en: string };
  identificationNumber?: string;
  birthday?: string;
}

/** Raw shape coming from the dropdown API (may have extra flat fields) */
interface UserDropdownRaw {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  ownerKycVerified?: boolean;
  nationalityId?: string;
  nationality?: { id: string; code: string; name_es: string; name_en: string };
  identificationTypeId?: string;
  identificationType?: { id: string; code: string; name_es: string; name_en: string };
  identificationNumber?: string;
  birthday?: string;
}

const mapUserDropdown = (user: UserDropdownRaw): UserDropdownItem => ({
  id: user.id,
  firstName: user.name ?? `${user.firstName} ${user.lastName}`,
  email: user.email,
  ownerKycVerified: user.ownerKycVerified,
  nationalityId: user.nationalityId,
  nationality: user.nationality,
  identificationTypeId: user.identificationTypeId,
  identificationType: user.identificationType,
  identificationNumber: user.identificationNumber,
  birthday: user.birthday,
});

export const getUsersDropdownBusiness = async (
  roles: string[] | null = null,
  isActive: string | null = null,
  token: string | undefined = undefined,
  language = 'es'
): Promise<{
  success: boolean;
  data?: UserDropdownItem[];
}> => {
  try {
    // Create cache key from parameters
    const cacheKey = JSON.stringify({
      roles: roles?.sort(),
      isActive,
      language,
    });

    // Check cache first
    const cached = usersDropdownCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < USERS_DROPDOWN_TTL) {
      // eslint-disable-next-line no-console
      console.log('📦 [USERS CACHE] Using cached data');
      return { success: true, data: cached.data.map(mapUserDropdown) };
    }

    // Fetch from API if cache miss or expired
    const result = (await getUsersDropdown(roles, isActive, token, language)) as {
      success?: boolean;
      data?: UserDropdownRaw[];
    };

    if (result.success === true && result.data !== undefined) {
      // Store raw data in cache
      usersDropdownCache.set(cacheKey, {
        data: result.data as unknown as User[],
        timestamp: Date.now(),
      });
      // eslint-disable-next-line no-console
      console.log('💾 [USERS CACHE] Data cached');

      return { success: true, data: result.data.map(mapUserDropdown) };
    }

    // If API call fails but we have cached data, return it even if expired
    if (cached && cached.data.length > 0) {
      // eslint-disable-next-line no-console
      console.log('🔄 [USERS CACHE] API failed, returning stale cached data');
      return { success: true, data: cached.data.map(mapUserDropdown) };
    }

    return { success: false };
  } catch (error) {
    console.error('❌ [USERS CACHE] Error in getUsersDropdownBusiness:', error);

    // If there's a 429 error, try to return stale cached data
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ERR_BAD_REQUEST'
    ) {
      const cacheKey = JSON.stringify({
        roles: roles?.sort(),
        isActive,
        language,
      });
      const cached = usersDropdownCache.get(cacheKey);
      if (cached && cached.data.length > 0) {
        // eslint-disable-next-line no-console
        console.log('🔄 [USERS CACHE] Rate limited, returning stale cached data');
        return { success: true, data: cached.data.map(mapUserDropdown) };
      }
    }

    return { success: false };
  }
};
