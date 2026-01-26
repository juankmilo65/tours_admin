/**
 * Users Route - Users and Roles Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect, useMemo } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table, type Column } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';
import {
  getAllUsersBusiness,
  createUserBusiness,
  updateUserBusiness,
  toggleUserStatusBusiness,
  uploadUserAvatarBusiness,
  deleteUserAvatarBusiness,
  type User,
  type CreateUserDto,
  type UpdateUserDto,
} from '~/server/businessLogic/usersBusinessLogic';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Users(): JSX.Element {
  const { t, language } = useTranslation();
  const token = useAppSelector(selectAuthToken) ?? undefined;

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<CreateUserDto>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUserId, setAvatarUserId] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchUsers = async () => {
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Loading' }));

      try {
        const result = await getAllUsersBusiness({
          page,
          limit,
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          role: roleFilter === '' ? undefined : roleFilter,
          search: searchTerm === '' ? undefined : searchTerm,
          language,
          token,
        });

        if (result.success === true && result.data !== undefined) {
          setUsers(result.data.users ?? []);
          setPagination(result.data.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 });
        } else {
          setUsers([]);
          setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        }
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchUsers();
  }, [page, statusFilter, roleFilter, searchTerm, limit, language, dispatch, t, token]);

  const avatarPreview = useMemo(() => {
    if (selectedAvatar !== null) {
      return URL.createObjectURL(selectedAvatar);
    }
    if (isEditMode === true) {
      return existingAvatarUrl;
    }
    return null;
  }, [selectedAvatar, isEditMode, existingAvatarUrl]);

  const resetForm = () => {
    setNewUser({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'user',
    });
    setConfirmPassword('');
    setSelectedAvatar(null);
    setExistingAvatarUrl(null);
    setErrors({});
    setIsEditMode(false);
    setEditingUserId(null);
  };

  const handleCreateUser = async () => {
    if (token === undefined) {
      console.error('No token available');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!newUser.email || newUser.email.trim() === '') {
      newErrors.email = t('users.validation.emailRequired') ?? 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      newErrors.email = t('users.validation.invalidEmail') ?? 'Invalid email';
    }

    if (!newUser.firstName || newUser.firstName.trim() === '') {
      newErrors.firstName = t('users.validation.firstNameRequired') ?? 'Required';
    }
    if (!newUser.lastName || newUser.lastName.trim() === '') {
      newErrors.lastName = t('users.validation.lastNameRequired') ?? 'Required';
    }

    if (isEditMode === false) {
      if (!newUser.password || newUser.password.trim() === '') {
        newErrors.password = t('users.validation.passwordRequired') ?? 'Required';
      } else if (newUser.password.length < 8) {
        newErrors.password = t('users.validation.passwordMinLength') ?? 'Minimum 8 characters';
      }
      if (newUser.password !== confirmPassword) {
        newErrors.confirmPassword = t('users.passwordMismatch') ?? 'Passwords do not match';
      }
    } else if (newUser.password.trim() !== '' && newUser.password.length < 8) {
      newErrors.password = t('users.validation.passwordMinLength') ?? 'Minimum 8 characters';
    }

    if (newUser.role === '') {
      newErrors.role = t('users.validation.roleRequired') ?? 'Required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: isEditMode
            ? (t('users.updating') ?? 'Updating...')
            : (t('users.createUser') ?? 'Creating User'),
        })
      );

      let userId = editingUserId;

      if (isEditMode === true && userId !== null) {
        const updateData: Partial<UpdateUserDto> = {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        };

        const result = await updateUserBusiness(userId, updateData, token, language);

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('users.errorUpdateTitle') ?? 'Error',
            message: result.message ?? t('users.errorUpdate') ?? 'Error updating user',
          });
          return;
        }
      } else {
        const result = await createUserBusiness(newUser, token, language);

        if (result.success === false || result.data?.id === undefined) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('users.errorCreateTitle') ?? 'Error',
            message: result.message ?? t('users.errorCreate') ?? 'Error creating user',
          });
          return;
        }
        userId = result.data.id;
      }

      if (selectedAvatar !== null && userId !== null && userId !== '') {
        dispatch(
          setGlobalLoading({
            isLoading: true,
            message: t('users.uploadingAvatar') ?? 'Uploading avatar...',
          })
        );

        const uploadResult = await uploadUserAvatarBusiness(
          userId,
          selectedAvatar,
          token,
          language
        );

        if (uploadResult.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('users.avatarUploadFailed') ?? 'Upload Failed',
            message:
              uploadResult.message ??
              t('users.userCreatedButAvatarUploadFailed') ??
              'User created but avatar upload failed',
          });
          return;
        }
      }

      setSuccessModal({
        isOpen: true,
        title: isEditMode
          ? (t('users.userUpdated') ?? 'User Updated')
          : (t('users.userCreated') ?? 'User Created'),
        message: isEditMode
          ? (t('users.userUpdatedSuccess') ?? 'User updated successfully')
          : (t('users.userCreatedSuccess') ?? 'User created successfully'),
      });
      setIsCreateModalOpen(false);
      resetForm();

      const refreshResult = await getAllUsersBusiness({
        page,
        limit,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
        role: roleFilter === '' ? undefined : roleFilter,
        search: searchTerm === '' ? undefined : searchTerm,
        language,
        token,
      });

      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setUsers(refreshResult.data.users ?? []);
        setPagination(
          refreshResult.data.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }
        );
      }
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    } catch (error) {
      console.error('Error in user saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleOpenEditModal = (user: User) => {
    setNewUser({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setConfirmPassword('');
    setExistingAvatarUrl(user.avatarUrl ?? null);
    setIsEditMode(true);
    setEditingUserId(user.id);
    setIsCreateModalOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    if (user.role === 'admin') {
      setErrorModal({
        isOpen: true,
        title: t('users.actionNotAllowed') ?? 'Action Not Allowed',
        message: t('users.adminCannotBeBlocked') ?? 'Admin users cannot be blocked',
      });
      return;
    }

    if (token === undefined) return;

    try {
      dispatch(
        setGlobalLoading({ isLoading: true, message: t('users.updating') ?? 'Updating...' })
      );

      const newStatus = !user.isActive;
      const result = await toggleUserStatusBusiness(user.id, newStatus, token, language);

      if (result.success === true) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u)));
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        setErrorModal({
          isOpen: true,
          title: t('users.errorUpdateTitle') ?? 'Error',
          message: result.message ?? t('users.toggleStatusError') ?? 'Error toggling status',
        });
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  const handleOpenAvatarModal = (user: User) => {
    setAvatarUserId(user.id);
    setExistingAvatarUrl(user.avatarUrl ?? null);
    setSelectedAvatar(null);
    setIsAvatarModalOpen(true);
  };

  const handleSaveAvatar = async () => {
    if (token === undefined || avatarUserId === null) return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('users.uploadingAvatar') ?? 'Uploading avatar...',
        })
      );

      if (selectedAvatar !== null) {
        const result = await uploadUserAvatarBusiness(
          avatarUserId,
          selectedAvatar,
          token,
          language
        );

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('users.avatarUploadFailed') ?? 'Upload Failed',
            message: result.message ?? t('users.avatarUploadFailed') ?? 'Failed to upload avatar',
          });
          return;
        }
      } else if (existingAvatarUrl === null) {
        const result = await deleteUserAvatarBusiness(avatarUserId, token, language);

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('users.avatarDeleteFailed') ?? 'Delete Failed',
            message: result.message ?? t('users.avatarDeleteFailed') ?? 'Failed to delete avatar',
          });
          return;
        }
      }

      setIsAvatarModalOpen(false);
      setAvatarUserId(null);
      setSelectedAvatar(null);
      setExistingAvatarUrl(null);

      const refreshResult = await getAllUsersBusiness({
        page,
        limit,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
        role: roleFilter === '' ? undefined : roleFilter,
        search: searchTerm === '' ? undefined : searchTerm,
        language,
        token,
      });

      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setUsers(refreshResult.data.users ?? []);
      }
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    } catch (error) {
      console.error('Error saving avatar:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'avatarUrl',
      label: t('users.avatar') ?? 'Avatar',
      render: (value: unknown, row: User) => (
        <div className="flex-shrink-0">
          {value !== null && value !== undefined && (value as string) !== '' ? (
            <img
              src={value as string}
              alt={`${row.firstName} ${row.lastName}`}
              className="w-12 h-12 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
              {row.firstName.charAt(0)}
              {row.lastName.charAt(0)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: t('users.name') ?? 'Name',
      render: (_value: unknown, row: User) => (
        <div>
          <div className="font-semibold text-gray-900">
            {row.firstName} {row.lastName}
          </div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('users.role') ?? 'Role',
      render: (value: unknown) => {
        const roleValue = value as string;
        const roleColors: Record<string, string> = {
          admin: 'bg-purple-100 text-purple-700',
          staff: 'bg-blue-100 text-blue-700',
          user: 'bg-gray-100 text-gray-700',
        };
        const roleLabels: Record<string, string> = {
          admin: t('users.admin') ?? 'Admin',
          staff: t('users.staff') ?? 'Staff',
          user: t('users.user') ?? 'User',
        };
        const colorClass = roleColors[roleValue] ?? 'bg-gray-100 text-gray-700';
        const labelText = roleLabels[roleValue] ?? roleValue;
        return (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}
          >
            {labelText}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      label: t('users.status') ?? 'Status',
      render: (value: unknown) => {
        const isActiveValue = value as boolean;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              isActiveValue
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isActiveValue ? 'bg-green-600' : 'bg-red-600'}`}
            />
            {isActiveValue ? (t('users.active') ?? 'Active') : (t('users.inactive') ?? 'Inactive')}
          </span>
        );
      },
    },
    {
      key: 'isEmailVerified',
      label: t('users.isEmailVerified') ?? 'Verified',
      render: (value: unknown) => {
        const isVerifiedValue = value as boolean;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isVerifiedValue ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {isVerifiedValue
              ? (t('users.verified') ?? 'Verified')
              : (t('users.notVerified') ?? 'Not Verified')}
          </span>
        );
      },
    },
    {
      key: 'lastLoginAt',
      label: t('users.lastLoginAt') ?? 'Last Login',
      render: (value: unknown) => {
        if (value !== null && value !== undefined) {
          return (
            <div className="text-sm text-gray-600">
              {new Date(value as string).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          );
        }
        return <span className="text-sm text-gray-400">-</span>;
      },
    },
    {
      key: 'actions',
      label: t('common.actions') ?? 'Actions',
      render: (_value: unknown, row: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              border: 'none',
              cursor: 'pointer',
            }}
            title={t('users.editUser') ?? 'Edit User'}
          >
            <svg
              style={{ width: '16px', height: '16px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAvatarModal(row)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#8b5cf6',
              border: 'none',
              cursor: 'pointer',
            }}
            title={t('users.changeAvatar') ?? 'Change Avatar'}
          >
            <svg
              style={{ width: '16px', height: '16px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          <div
            onClick={() => void handleToggleStatus(row)}
            style={{
              position: 'relative',
              width: '40px',
              height: '20px',
              backgroundColor: row.isActive ? '#10b981' : '#e5e7eb',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: row.isActive ? '22px' : '2px',
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('users.allUsers') ?? 'All Users'}>
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ flex: 1 }}>
            <input
              type="search"
              className="form-input"
              placeholder={t('users.searchPlaceholder') ?? 'Search users...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            options={[
              { value: '', label: t('users.allRoles') ?? 'All Roles' },
              { value: 'admin', label: t('users.admin') ?? 'Admin' },
              { value: 'staff', label: t('users.staff') ?? 'Staff' },
              { value: 'user', label: t('users.user') ?? 'User' },
            ]}
            value={roleFilter}
            onChange={(v: string) => {
              setRoleFilter(v);
              setPage(1);
            }}
            placeholder={t('users.allRoles') ?? 'All Roles'}
            className="select-compact"
          />

          <Select
            options={[
              { value: '', label: t('users.allStatus') ?? 'All Status' },
              { value: 'true', label: t('users.active') ?? 'Active' },
              { value: 'false', label: t('users.inactive') ?? 'Inactive' },
            ]}
            value={statusFilter}
            onChange={(v: string) => {
              setStatusFilter(v);
              setPage(1);
            }}
            placeholder={t('users.allStatus') ?? 'All Status'}
            className="select-compact"
          />

          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          >
            {t('users.addNewUser')}
          </Button>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-lg font-medium">{t('users.noUsersFound')}</p>
            <p className="text-sm">{t('users.noUsersDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={users} columns={columns} />
          </div>
        )}

        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('pagination.showing')} {(page - 1) * limit + 1} {t('pagination.to')}{' '}
              {Math.min(page * limit, pagination.total)} {t('pagination.of')} {pagination.total}{' '}
              {t('pagination.results')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('pagination.previous')}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                  .map((p, index, arr) => {
                    const prev = arr[index - 1];
                    const showEllipsis = prev !== undefined && prev + 1 !== p;

                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={isEditMode ? t('users.editUserTitle') : t('users.createUserTitle')}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleCreateUser()}>
              {isEditMode ? t('common.save') : t('users.createUser')}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <Input
            label={t('auth.email')}
            type="email"
            placeholder="user@example.com"
            value={newUser.email}
            onChange={(e) => {
              setNewUser({ ...newUser, email: e.target.value });
              if (errors.email !== undefined && errors.email !== '') {
                setErrors({ ...errors, email: '' });
              }
            }}
            error={errors.email}
            required
          />

          {isEditMode === false && (
            <>
              <Input
                label={t('auth.password')}
                type="password"
                placeholder="••••••"
                value={newUser.password}
                onChange={(e) => {
                  setNewUser({ ...newUser, password: e.target.value });
                  if (errors.password !== undefined && errors.password !== '') {
                    setErrors({ ...errors, password: '' });
                  }
                }}
                error={errors.password}
                required
              />
              <Input
                label={t('auth.confirmPassword')}
                type="password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword !== undefined && errors.confirmPassword !== '') {
                    setErrors({ ...errors, confirmPassword: '' });
                  }
                }}
                error={errors.confirmPassword}
                required
              />
            </>
          )}

          <Input
            label={t('auth.firstName')}
            placeholder="Juan"
            value={newUser.firstName}
            onChange={(e) => {
              setNewUser({ ...newUser, firstName: e.target.value });
              if (errors.firstName !== undefined && errors.firstName !== '') {
                setErrors({ ...errors, firstName: '' });
              }
            }}
            error={errors.firstName}
            required
          />

          <Input
            label={t('auth.lastName')}
            placeholder="Pérez"
            value={newUser.lastName}
            onChange={(e) => {
              setNewUser({ ...newUser, lastName: e.target.value });
              if (errors.lastName !== undefined && errors.lastName !== '') {
                setErrors({ ...errors, lastName: '' });
              }
            }}
            error={errors.lastName}
            required
          />

          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('users.role')}
            </label>
            <Select
              options={[
                { value: 'user', label: t('users.user') ?? 'User' },
                { value: 'staff', label: t('users.staff') ?? 'Staff' },
                { value: 'admin', label: t('users.admin') ?? 'Admin' },
              ]}
              value={newUser.role}
              onChange={(v: string) => {
                setNewUser({ ...newUser, role: v });
                if (errors.role !== undefined && errors.role !== '') {
                  setErrors({ ...errors, role: '' });
                }
              }}
              className="w-full"
            />
            {errors.role !== null ? (
              <p
                style={{
                  marginTop: '4px',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.role}
              </p>
            ) : null}
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isAvatarModalOpen}
        onClose={() => {
          setIsAvatarModalOpen(false);
          setAvatarUserId(null);
          setSelectedAvatar(null);
          setExistingAvatarUrl(null);
        }}
        title={t('users.changeAvatar') ?? 'Change Avatar'}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAvatarModalOpen(false);
                setAvatarUserId(null);
                setSelectedAvatar(null);
                setExistingAvatarUrl(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveAvatar()}>
              {t('users.uploadAvatar')}
            </Button>
          </>
        }
      >
        <div>
          <div
            style={{
              border: '2px dashed var(--color-neutral-300)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--color-primary-500)';
              e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
              e.currentTarget.style.backgroundColor = 'transparent';
              const files = e.dataTransfer.files;
              if (files !== null && files.length > 0) {
                const file = files[0];
                if (file !== undefined && file !== null) {
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                  if (!validTypes.includes(file.type)) {
                    setErrors({ avatar: t('users.validation.invalidFormat') ?? 'Invalid format' });
                    return;
                  }
                  setSelectedAvatar(file);
                  setErrors({});
                }
              }
            }}
            onClick={() => {
              const input = document.getElementById('avatar-upload');
              if (input !== null) input.click();
            }}
          >
            <input
              id="avatar-upload"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = e.target.files;
                if (files !== null && files.length > 0) {
                  const file = files[0];
                  if (file !== undefined && file !== null) {
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    if (!validTypes.includes(file.type)) {
                      setErrors({
                        avatar: t('users.validation.invalidFormat') ?? 'Invalid format',
                      });
                      return;
                    }
                    setSelectedAvatar(file);
                    setErrors({});
                  }
                }
              }}
            />
            {avatarPreview !== null ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                  {t('users.changeAvatar')}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg
                  style={{ width: 48, height: 48, color: 'var(--color-neutral-400)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                  {t('users.uploadAvatar')}
                </span>
              </div>
            )}
          </div>

          {existingAvatarUrl !== null && (
            <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExistingAvatarUrl(null);
                  setSelectedAvatar(null);
                }}
              >
                {t('users.removeAvatar')}
              </Button>
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setErrorModal({ ...errorModal, isOpen: false })}>
            {t('common.accept')}
          </Button>
        }
      >
        <div style={{ padding: 'var(--space-2)' }}>
          <p
            style={{
              margin: 0,
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {errorModal.title}
          </p>
          <p style={{ color: 'var(--color-neutral-700)', lineHeight: 'var(--leading-relaxed)' }}>
            {errorModal.message}
          </p>
        </div>
      </Dialog>

      <Dialog
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
          >
            {t('common.accept')}
          </Button>
        }
      >
        <div style={{ padding: 'var(--space-2)' }}>
          <p
            style={{
              margin: 0,
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {successModal.title}
          </p>
          <p style={{ color: 'var(--color-neutral-700)', lineHeight: 'var(--leading-relaxed)' }}>
            {successModal.message}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
