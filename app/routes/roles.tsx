/**
 * Roles Route - Roles Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table, type Column } from '~/components/ui/Table';
import { Input } from '~/components/ui/Input';
import { Textarea } from '~/components/ui/Textarea';
import { Dialog } from '~/components/ui/Dialog';
import {
  getRolesBusiness,
  createRoleBusiness,
  updateRoleBusiness,
  deleteRoleBusiness,
  type Role,
  type CreateRoleDto,
  type UpdateRoleDto,
} from '~/server/businessLogic/rolesBusinessLogic';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Roles(): JSX.Element {
  const { t, language } = useTranslation();
  const token = useAppSelector(selectAuthToken) ?? undefined;

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    from: 1,
    to: 1,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<CreateRoleDto>({
    name: '',
    name_es: '',
    name_en: '',
    description: '',
  });
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

  const dispatch = useAppDispatch();

  useEffect(() => {
    // Don't fetch if token is not available yet
    if (token === undefined) {
      return;
    }

    const fetchRoles = async () => {
      setIsLoading(true);
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Loading' }));

      try {
        const result = await getRolesBusiness({
          page,
          limit,
          language,
          token,
        });

        if (result.success === true) {
          setRoles(result.data ?? []);
          setPagination(
            result.pagination ?? {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false,
              from: 1,
              to: 1,
            }
          );
        } else {
          setRoles([]);
          setPagination({
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            from: 1,
            to: 1,
          });
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          from: 1,
          to: 1,
        });
      } finally {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        setIsLoading(false);
      }
    };

    void fetchRoles();
  }, [page, language, token, limit]);

  const resetForm = () => {
    setNewRole({
      name: '',
      name_es: '',
      name_en: '',
      description: '',
    });
    setErrors({});
    setIsEditMode(false);
    setEditingRoleId(null);
  };

  const handleCreateRole = async () => {
    if (token === undefined) {
      console.error('No token available');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!newRole.name || newRole.name.trim() === '') {
      newErrors.name = t('roles.validation.slugRequired') ?? 'Required';
    } else if (!/^[a-z0-9-]+$/.test(newRole.name)) {
      newErrors.name = t('roles.validation.slugInvalid') ?? 'Invalid slug';
    }

    if (!newRole.name_es || newRole.name_es.trim() === '') {
      newErrors.name_es = t('roles.validation.nameEsRequired') ?? 'Required';
    }

    if (!newRole.name_en || newRole.name_en.trim() === '') {
      newErrors.name_en = t('roles.validation.nameEnRequired') ?? 'Required';
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
            ? (t('roles.updating') ?? 'Updating...')
            : (t('roles.creating') ?? 'Creating...'),
        })
      );

      if (isEditMode === true && editingRoleId !== null) {
        const updateData: UpdateRoleDto = {
          name: newRole.name,
          name_es: newRole.name_es,
          name_en: newRole.name_en,
          description: newRole.description,
        };

        const result = await updateRoleBusiness(editingRoleId, updateData, token, language);

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('roles.errorUpdateTitle') ?? 'Error',
            message: result.message ?? t('roles.errorUpdate') ?? 'Error updating role',
          });
          return;
        }
      } else {
        const result = await createRoleBusiness(newRole, token, language);

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('roles.errorCreateTitle') ?? 'Error',
            message: result.message ?? t('roles.errorCreate') ?? 'Error creating role',
          });
          return;
        }
      }

      setSuccessModal({
        isOpen: true,
        title: isEditMode
          ? (t('roles.roleUpdated') ?? 'Role Updated')
          : (t('roles.roleCreated') ?? 'Role Created'),
        message: isEditMode
          ? (t('roles.roleUpdatedSuccess') ?? 'Role updated successfully')
          : (t('roles.roleCreatedSuccess') ?? 'Role created successfully'),
      });
      setIsCreateModalOpen(false);
      resetForm();

      const refreshResult = await getRolesBusiness({
        page,
        limit,
        language,
        token,
      });

      if (refreshResult.success === true) {
        setRoles(refreshResult.data ?? []);
        setPagination(
          refreshResult.pagination ?? {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            from: 1,
            to: 1,
          }
        );
      }
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    } catch (error) {
      console.error('Error in role saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleOpenEditModal = (role: Role) => {
    setNewRole({
      name: role.name,
      name_es: role.name_es,
      name_en: role.name_en,
      description: role.description,
    });
    setIsEditMode(true);
    setEditingRoleId(role.id);
    setIsCreateModalOpen(true);
  };

  const handleOpenDeleteModal = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (token === undefined || roleToDelete === null) return;

    try {
      dispatch(
        setGlobalLoading({ isLoading: true, message: t('roles.deleting') ?? 'Deleting...' })
      );

      const result = await deleteRoleBusiness(roleToDelete.id, token);

      if (result.success === true) {
        setSuccessModal({
          isOpen: true,
          title: t('roles.successDelete') ?? 'Role Deleted',
          message: t('roles.successDelete') ?? 'Role deleted successfully',
        });
        setIsDeleteModalOpen(false);
        setRoleToDelete(null);

        const refreshResult = await getRolesBusiness({
          page,
          limit,
          language,
          token,
        });

        if (refreshResult.success === true) {
          setRoles(refreshResult.data ?? []);
          setPagination(
            refreshResult.pagination ?? {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false,
              from: 1,
              to: 1,
            }
          );
        }
      } else {
        const deps = result.error?.dependencies;
        setErrorModal({
          isOpen: true,
          title:
            deps !== undefined
              ? t('roles.cannotDeleteTitle')
              : (t('roles.errorDeleteTitle') ?? 'Error'),
          message:
            deps !== undefined
              ? `${t('roles.cannotDeleteMessage') ?? 'Cannot delete role'}\n\n${t('roles.dependencies') ?? 'Dependencies:'}\n${deps.join(', ')}`
              : (result.message ?? t('roles.errorDelete') ?? 'Error deleting role'),
        });
      }
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    } catch (error) {
      console.error('Error deleting role:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: t('roles.errorDeleteTitle') ?? 'Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      label: t('roles.name') ?? 'Name',
      render: (_value: unknown, row: Role) => (
        <div>
          <div className="font-semibold text-gray-900">
            {language === 'es' ? row.name_es : row.name_en}
          </div>
          <div className="text-sm text-gray-500">{row.name}</div>
        </div>
      ),
    },
    {
      key: 'description',
      label: t('roles.description') ?? 'Description',
      render: (_value: unknown, row: Role) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">{row.description}</div>
      ),
    },
    {
      key: 'menuRolesCount',
      label: t('roles.menusCount') ?? 'Menus',
      render: (_value: unknown, row: Role) => (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
          {row._count?.menuRoles ?? 0}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: t('roles.status') ?? 'Status',
      render: (_value: unknown, row: Role) => (
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
            row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {row.isActive ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('roles.createdAt') ?? 'Created At',
      render: (value: unknown) => {
        if (value !== null && value !== undefined) {
          return (
            <div className="text-sm text-gray-600">
              {new Date(value as string).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
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
      render: (_value: unknown, row: Role) => (
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
            title={t('roles.editRole') ?? 'Edit Role'}
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
            onClick={() => handleOpenDeleteModal(row)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: 'none',
              cursor: 'pointer',
            }}
            title={t('roles.deleteRole') ?? 'Delete Role'}
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('roles.allRoles') ?? 'All Roles'}>
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
              placeholder={t('roles.searchPlaceholder') ?? 'Search roles...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          >
            {t('roles.addNewRole')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-base font-medium">{t('common.loading')}</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-lg font-medium">{t('roles.noRolesFound')}</p>
            <p className="text-sm">{t('roles.noRolesDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={roles} columns={columns} />
          </div>
        )}

        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('pagination.showing')} {pagination.from} {t('pagination.to')} {pagination.to}{' '}
              {t('pagination.of')} {pagination.total} {t('pagination.results')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrevPage}
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
                disabled={!pagination.hasNextPage}
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
        title={isEditMode ? t('roles.editRoleTitle') : t('roles.createRoleTitle')}
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
            <Button variant="primary" onClick={() => void handleCreateRole()}>
              {isEditMode ? t('common.save') : t('roles.createRole')}
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
            label={t('roles.slug')}
            placeholder="admin-role"
            value={newRole.name}
            onChange={(e) => {
              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
              setNewRole({ ...newRole, name: value });
              if (errors.name !== undefined && errors.name !== '') {
                setErrors({ ...errors, name: '' });
              }
            }}
            error={errors.name}
            required
          />

          <Input
            label={t('roles.nameEs')}
            placeholder="Administrador"
            value={newRole.name_es}
            onChange={(e) => {
              setNewRole({ ...newRole, name_es: e.target.value });
              if (errors.name_es !== undefined && errors.name_es !== '') {
                setErrors({ ...errors, name_es: '' });
              }
            }}
            error={errors.name_es}
            required
          />

          <Input
            label={t('roles.nameEn')}
            placeholder="Administrator"
            value={newRole.name_en}
            onChange={(e) => {
              setNewRole({ ...newRole, name_en: e.target.value });
              if (errors.name_en !== undefined && errors.name_en !== '') {
                setErrors({ ...errors, name_en: '' });
              }
            }}
            error={errors.name_en}
            required
          />

          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea
              label={t('roles.description')}
              value={newRole.description}
              onChange={(e) => {
                setNewRole({ ...newRole, description: e.target.value });
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        title={t('roles.confirmDeleteTitle')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setRoleToDelete(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleDeleteRole()}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('roles.deleteRole')}
            </Button>
          </>
        }
      >
        <div>
          <p style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-4)' }}>
            {t('roles.confirmDeleteMessage')}
          </p>
          <p style={{ color: 'var(--color-neutral-700)', fontSize: 'var(--text-sm)' }}>
            {t('roles.deleteWarning')}
          </p>
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
