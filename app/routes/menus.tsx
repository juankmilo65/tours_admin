/**
 * Menus Route - Menus Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import {
  getMenusBusiness,
  createMenuBusinessDirect,
  updateMenuBusinessDirect,
  deleteMenuBusinessDirect,
  associateRolesToMenuBusinessDirect,
  type Menu,
  type CreateMenuDto,
  type UpdateMenuDto,
} from '~/server/businessLogic/menusBusinessLogic';
import type { Column } from '~/components/ui/Table';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Menus(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Local state for menus and pagination
  const [menus, setMenus] = useState<Menu[]>([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMenu, setNewMenu] = useState<CreateMenuDto>({
    path: '',
    labelKey: '',
    icon: '',
    order: 0,
    isActive: true,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isInitialMount, setIsInitialMount] = useState(true);
  const dispatch = useAppDispatch();

  // Role association state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedMenuForRoles, setSelectedMenuForRoles] = useState<Menu | null>(null);
  const availableRoles = [
    { id: 'admin', name: 'Admin' },
    { id: 'staff', name: 'Staff' },
    { id: 'user', name: 'User' },
  ];
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Fetch menus when filters or pagination change
  useEffect(() => {
    const fetchMenus = async () => {
      if (isInitialMount) {
        setIsInitialMount(false);
        return;
      }

      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = await getMenusBusiness({
          page,
          limit,
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          language,
          token: token ?? undefined,
        });

        if (result.success && result.data !== undefined) {
          setMenus(result.data);
          setPagination({
            page: result.pagination?.page ?? 1,
            limit: result.pagination?.limit ?? 10,
            total: result.pagination?.total ?? 0,
            totalPages: result.pagination?.totalPages ?? 0,
          });
        }
      } catch (error) {
        console.error('Error fetching menus:', error);
        setMenus([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchMenus();
  }, [page, statusFilter, limit, language, token, dispatch, t, isInitialMount]);

  const resetForm = () => {
    setNewMenu({
      path: '',
      labelKey: '',
      icon: '',
      order: 0,
      isActive: true,
    });
    setErrors({});
    setIsEditMode(false);
    setEditingMenuId(null);
  };

  const handleOpenEditModal = (menu: Menu) => {
    setNewMenu({
      path: menu.path,
      labelKey: menu.labelKey,
      icon: menu.icon,
      order: menu.order,
      isActive: menu.isActive,
    });
    setIsEditMode(true);
    setEditingMenuId(menu.id);
    setIsCreateModalOpen(true);
  };

  // Handle status toggle
  const handleToggleStatus = async (menu: Menu) => {
    if (token === null || token === '') return;

    try {
      dispatch(setGlobalLoading({ isLoading: true, message: 'Updating...' }));

      const result = await updateMenuBusinessDirect(
        menu.id,
        { isActive: !menu.isActive },
        token,
        language
      );

      if (result.success) {
        setMenus(menus.map((m) => (m.id === menu.id ? { ...m, isActive: !m.isActive } : m)));
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Error',
          message: result.error?.message ?? 'Failed to update menu status',
        });
      }
    } catch (error) {
      console.error('Error toggling menu status:', error);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle delete menu
  const handleDeleteMenu = async (menu: Menu) => {
    if (token === null || token === '') return;

    const labelKey = menu.labelKey ?? '';
    const label = labelKey !== '' ? t(labelKey) : 'this menu';
    const confirmed = window.confirm(`Are you sure you want to delete menu "${label}"?`);

    if (!confirmed) return;

    try {
      dispatch(setGlobalLoading({ isLoading: true, message: 'Deleting...' }));

      const result = await deleteMenuBusinessDirect(menu.id, token);

      if (result.success) {
        setMenus(menus.filter((m) => m.id !== menu.id));
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Error',
          message: result.error?.message ?? 'Failed to delete menu',
        });
      }
    } catch (error) {
      console.error('Error deleting menu:', error);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle open role association modal
  const handleOpenRoleModal = (menu: Menu) => {
    setSelectedMenuForRoles(menu);
    setSelectedRoles([]); // Reset selected roles
    setIsRoleModalOpen(true);
  };

  // Handle save roles association
  const handleSaveRoles = async () => {
    if (token === null || token === '' || selectedMenuForRoles === null) return;

    try {
      dispatch(setGlobalLoading({ isLoading: true, message: 'Associating roles...' }));

      const result = await associateRolesToMenuBusinessDirect(
        selectedMenuForRoles.id,
        selectedRoles,
        token
      );

      if (result.success) {
        setIsRoleModalOpen(false);
        setSelectedMenuForRoles(null);
        setSelectedRoles([]);
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Error',
          message: result.error?.message ?? 'Failed to associate roles',
        });
      }
    } catch (error) {
      console.error('Error associating roles:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to associate roles',
      });
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle create or update menu
  const handleSaveMenu = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation
    const newErrors: Record<string, string> = {};

    if (!newMenu.path.trim()) newErrors.path = 'Path is required';
    if (!newMenu.labelKey.trim()) newErrors.labelKey = 'Label key is required';
    if (!newMenu.icon.trim()) newErrors.icon = 'Icon is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: isEditMode ? 'Updating...' : 'Creating...',
        })
      );

      if (isEditMode && editingMenuId !== null) {
        // Update
        const result = await updateMenuBusinessDirect(
          editingMenuId,
          newMenu as UpdateMenuDto,
          token,
          language
        );

        if (!result.success) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: 'Error',
            message: result.error?.message ?? 'Failed to update menu',
          });
          return;
        }

        // Update local state
        setMenus(menus.map((m) => (m.id === editingMenuId ? { ...m, ...newMenu } : m)));
      } else {
        // Create
        const result = await createMenuBusinessDirect(newMenu, token, language);

        if (!result.success) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: 'Error',
            message: result.error?.message ?? 'Failed to create menu',
          });
          return;
        }

        // Refetch menus
        const refreshResult = await getMenusBusiness({
          page: 1,
          limit,
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          language,
          token,
        });

        if (refreshResult.success && refreshResult.data !== undefined) {
          setMenus(refreshResult.data);
          setPagination({
            page: refreshResult.pagination?.page ?? 1,
            limit: refreshResult.pagination?.limit ?? 10,
            total: refreshResult.pagination?.total ?? 0,
            totalPages: refreshResult.pagination?.totalPages ?? 0,
          });
          setPage(1);
        }
      }

      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving menu:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save menu',
      });
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Filter menus by search term
  const filteredMenus = menus.filter((menu) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      menu.path.toLowerCase().includes(searchLower) ||
      menu.labelKey.toLowerCase().includes(searchLower) ||
      menu.icon.toLowerCase().includes(searchLower)
    );
  });

  const columns: Column<Menu>[] = [
    {
      key: 'icon',
      label: 'Icon',
      render: (value: unknown) => <span style={{ fontSize: '24px' }}>{value as string}</span>,
    },
    {
      key: 'labelKey',
      label: 'Label Key',
      render: (_: unknown, row: Menu) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {row.labelKey !== undefined && row.labelKey !== '' ? t(row.labelKey) : row.labelKey}
          </div>
          <div className="text-sm text-gray-500 font-mono mt-0.5">{row.labelKey}</div>
        </div>
      ),
    },
    {
      key: 'path',
      label: 'Path',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
          {value as string}
        </span>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700 font-medium">{value as number}</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: unknown) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            (value as boolean)
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
              : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              (value as boolean) ? 'bg-green-600' : 'bg-red-600'
            }`}
          />
          {(value as boolean) ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_: unknown, row: Menu) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Associate Roles Button */}
          <button
            type="button"
            onClick={() => handleOpenRoleModal(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              color: '#7c3aed',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Associate Roles"
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Edit Menu"
          >
            <svg
              style={{ width: '20px', height: '20px' }}
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

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => void handleDeleteMenu(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Delete Menu"
          >
            <svg
              style={{ width: '20px', height: '20px' }}
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

          {/* Status Toggle */}
          <div
            onClick={() => void handleToggleStatus(row)}
            style={{
              position: 'relative',
              width: '48px',
              height: '24px',
              backgroundColor: row.isActive ? '#10b981' : '#e5e7eb',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: row.isActive ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: row.isActive ? '26px' : '2px',
                width: '20px',
                height: '20px',
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
      <Card title="Menu Management">
        {/* Filters & Actions Toolbar */}
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          {/* Search */}
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <svg
                  style={{ height: '1.25rem', width: '1.25rem', color: 'var(--color-neutral-400)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search menus..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(v: string) => {
                setStatusFilter(v);
                setPage(1);
              }}
              placeholder="All Status"
              className="w-full"
            />
          </div>

          {/* Add Button */}
          <Button
            variant="primary"
            className="whitespace-nowrap"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          >
            <span className="flex items-center gap-2">
              <svg
                style={{ width: '20px', height: '20px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Menu
            </span>
          </Button>
        </div>

        {/* Table */}
        {menus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <p className="text-lg font-medium">No menus found</p>
            <p className="text-sm">Create your first menu item to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredMenus} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                }}
              >
                Previous
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
                          onClick={() => {
                            setPage(p);
                          }}
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
                onClick={() => {
                  setPage((p) => Math.min(pagination.totalPages, p + 1));
                }}
              >
                Next
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
        title={isEditMode ? 'Edit Menu' : 'Create Menu'}
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
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveMenu()}>
              {isEditMode ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          <Input
            label="Path"
            placeholder="/dashboard"
            value={newMenu.path}
            onChange={(e) => {
              setNewMenu({ ...newMenu, path: e.target.value });
              if (errors.path !== undefined && errors.path !== '')
                setErrors({ ...errors, path: '' });
            }}
            error={errors.path}
            required
          />
          <Input
            label="Label Key"
            placeholder="sidebar.dashboard"
            value={newMenu.labelKey}
            onChange={(e) => {
              setNewMenu({ ...newMenu, labelKey: e.target.value });
              if (errors.labelKey !== undefined && errors.labelKey !== '')
                setErrors({ ...errors, labelKey: '' });
            }}
            error={errors.labelKey}
            required
          />
          <Input
            label="Icon (Emoji)"
            placeholder="📊"
            value={newMenu.icon}
            onChange={(e) => {
              setNewMenu({ ...newMenu, icon: e.target.value });
              if (errors.icon !== undefined && errors.icon !== '')
                setErrors({ ...errors, icon: '' });
            }}
            error={errors.icon}
            required
          />
          <Input
            type="number"
            label="Order"
            placeholder="0"
            value={newMenu.order.toString()}
            onChange={(e) => {
              setNewMenu({ ...newMenu, order: Number.parseInt(e.target.value, 10) || 0 });
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <input
              type="checkbox"
              id="menu-active"
              checked={newMenu.isActive}
              onChange={(e) => setNewMenu({ ...newMenu, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: 'var(--color-primary-600)',
              }}
            />
            <label
              htmlFor="menu-active"
              style={{
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              Active
            </label>
          </div>
        </div>
      </Dialog>

      {/* Role Association Modal */}
      <Dialog
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedMenuForRoles(null);
          setSelectedRoles([]);
        }}
        title="Associate Roles"
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsRoleModalOpen(false);
                setSelectedMenuForRoles(null);
                setSelectedRoles([]);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveRoles()}>
              Save Roles
            </Button>
          </>
        }
      >
        <div
          style={{
            padding: 'var(--space-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          {selectedMenuForRoles && (
            <div>
              <p
                style={{
                  margin: '0 0 var(--space-2) 0',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                Menu: {selectedMenuForRoles.labelKey}
              </p>
              <p
                style={{
                  margin: '0 0 var(--space-4) 0',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-600)',
                }}
              >
                Select the roles that should have access to this menu:
              </p>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            {availableRoles.map((role) => (
              <div
                key={role.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  backgroundColor: selectedRoles.includes(role.id)
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'var(--color-neutral-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  borderColor: selectedRoles.includes(role.id)
                    ? 'var(--color-primary-300)'
                    : 'var(--color-neutral-200)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  setSelectedRoles((prev) =>
                    prev.includes(role.id) ? prev.filter((r) => r !== role.id) : [...prev, role.id]
                  );
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => {}}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                    accentColor: 'var(--color-primary-600)',
                  }}
                />
                <span
                  style={{
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {role.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Dialog>

      {/* Error Modal */}
      <Dialog
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setErrorModal({ ...errorModal, isOpen: false });
              setIsCreateModalOpen(false);
            }}
          >
            Accept
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
          <p
            style={{
              color: 'var(--color-neutral-700)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            {errorModal.message}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
