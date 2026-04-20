/**
 * User Commissions Route - User Commission Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table, type Column } from '~/components/ui/Table';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';
import {
  getUserCommissionsBusiness,
  getUserCommissionByUserIdBusiness,
  createUserCommissionBusiness,
  type UserCommission,
  type CreateUserCommissionDto,
} from '~/server/businessLogic/userCommissionsBusinessLogic';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useErrorModal } from '~/utilities/useErrorModal';
import { useTranslation } from '~/lib/i18n/utils';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function UserCommissions(): JSX.Element {
  const { t, language } = useTranslation();
  const token = useAppSelector(selectAuthToken) ?? undefined;

  const [commissions, setCommissions] = useState<UserCommission[]>([]);
  const [filteredCommissions, setFilteredCommissions] = useState<UserCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCommission, setDetailCommission] = useState<UserCommission | null>(null);

  const [newCommission, setNewCommission] = useState<CreateUserCommissionDto>({
    userId: '',
    commissionPercentage: 10,
    isActive: true,
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
  const { showError } = useErrorModal();

  const fetchCommissions = async () => {
    if (token === undefined) return;

    setIsLoading(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Loading' }));

    try {
      const result = await getUserCommissionsBusiness({ token });

      if (result.success === true) {
        setCommissions(result.data ?? []);
      } else {
        setCommissions([]);
        showError({ messageKey: 'userCommissions.commissionsLoadError' });
      }
    } catch (error) {
      console.error('Error fetching user commissions:', error);
      setCommissions([]);
      showError({ messageKey: 'userCommissions.commissionsLoadError' });
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token === undefined) return;
    void fetchCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCommissions(commissions);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredCommissions(
        commissions.filter(
          (c) =>
            c.user.firstName.toLowerCase().includes(term) ||
            c.user.lastName.toLowerCase().includes(term) ||
            c.user.email.toLowerCase().includes(term)
        )
      );
    }
  }, [commissions, searchTerm]);

  const resetForm = () => {
    setNewCommission({
      userId: '',
      commissionPercentage: 10,
      isActive: true,
    });
    setErrors({});
  };

  const handleSaveCommission = async () => {
    if (token === undefined) {
      console.error('No token available');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!newCommission.userId || newCommission.userId.trim() === '') {
      newErrors.userId = t('userCommissions.validation.userIdRequired') ?? 'Required';
    } else if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newCommission.userId)
    ) {
      newErrors.userId = t('userCommissions.validation.userIdInvalid') ?? 'Invalid UUID';
    }

    if (
      newCommission.commissionPercentage === undefined ||
      newCommission.commissionPercentage === null
    ) {
      newErrors.commissionPercentage =
        t('userCommissions.validation.commissionRequired') ?? 'Required';
    } else if (newCommission.commissionPercentage < 0 || newCommission.commissionPercentage > 100) {
      newErrors.commissionPercentage =
        t('userCommissions.validation.commissionInvalid') ?? 'Invalid';
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
          message: t('userCommissions.creating') ?? 'Saving...',
        })
      );

      const result = await createUserCommissionBusiness(newCommission, token);

      if (result.success === false) {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        setErrorModal({
          isOpen: true,
          title: t('userCommissions.errorCreateTitle') ?? 'Error',
          message: result.message ?? t('userCommissions.errorCreate') ?? 'Error saving commission',
        });
        return;
      }

      setSuccessModal({
        isOpen: true,
        title: t('userCommissions.commissionCreated') ?? 'Commission Saved',
        message: t('userCommissions.commissionCreatedSuccess') ?? 'Commission saved successfully',
      });
      setIsCreateModalOpen(false);
      resetForm();

      await fetchCommissions();
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    } catch (error) {
      console.error('Error in commission saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleViewDetails = async (commission: UserCommission) => {
    if (token === undefined) return;

    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Loading' }));

    try {
      const result = await getUserCommissionByUserIdBusiness(commission.userId, token);

      if (result.success === true && result.data !== undefined) {
        setDetailCommission(result.data);
      } else {
        setDetailCommission(commission);
      }
    } catch {
      setDetailCommission(commission);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setIsDetailModalOpen(true);
    }
  };

  const handleOpenEditModal = (commission: UserCommission) => {
    setNewCommission({
      userId: commission.userId,
      commissionPercentage: parseFloat(commission.commissionPercentage),
      isActive: commission.isActive,
    });
    setIsCreateModalOpen(true);
  };

  const columns: Column<UserCommission>[] = [
    {
      key: 'user',
      label: t('userCommissions.user') ?? 'User',
      render: (_value: unknown, row: UserCommission) => (
        <div>
          <div className="font-semibold text-gray-900">
            {row.user.firstName} {row.user.lastName}
          </div>
          <div className="text-sm text-gray-500">{row.user.email}</div>
        </div>
      ),
    },
    {
      key: 'commissionPercentage',
      label: t('userCommissions.commissionPercentage') ?? 'Commission (%)',
      render: (_value: unknown, row: UserCommission) => (
        <div className="text-sm font-semibold text-gray-900">{row.commissionPercentage}%</div>
      ),
    },
    {
      key: 'user' as keyof UserCommission,
      label: t('userCommissions.role') ?? 'Role',
      render: (_value: unknown, row: UserCommission) => (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
          {row.user.role}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: t('userCommissions.status') ?? 'Status',
      render: (_value: unknown, row: UserCommission) => (
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
            row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {row.isActive
            ? (t('userCommissions.active') ?? 'Active')
            : (t('userCommissions.inactive') ?? 'Inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('userCommissions.createdAt') ?? 'Created At',
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
      render: (_value: unknown, row: UserCommission) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => void handleViewDetails(row)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: 'none',
              cursor: 'pointer',
            }}
            title={t('userCommissions.viewDetails') ?? 'View Details'}
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

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
            title={t('userCommissions.editCommission') ?? 'Edit'}
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
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('userCommissions.allCommissions') ?? 'All User Commissions'}>
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
              placeholder={t('userCommissions.searchPlaceholder') ?? 'Search by name or email...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          >
            {t('userCommissions.addNewCommission')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-base font-medium">{t('common.loading')}</p>
          </div>
        ) : filteredCommissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-lg font-medium">{t('userCommissions.noCommissionsFound')}</p>
            <p className="text-sm">{t('userCommissions.noCommissionsDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredCommissions} columns={columns} />
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={t('userCommissions.createCommissionTitle')}
        size="md"
        closeOnOverlayClick={false}
        closeOnEscape={false}
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
            <Button variant="primary" onClick={() => void handleSaveCommission()}>
              {t('userCommissions.createCommission')}
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
            label={t('userCommissions.userId')}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={newCommission.userId}
            onChange={(e) => {
              setNewCommission({ ...newCommission, userId: e.target.value.trim() });
              if (errors.userId !== undefined && errors.userId !== '') {
                setErrors({ ...errors, userId: '' });
              }
            }}
            error={errors.userId}
            required
          />

          <Input
            label={t('userCommissions.commissionPercentage')}
            placeholder="10"
            type="number"
            value={String(newCommission.commissionPercentage)}
            onChange={(e) => {
              setNewCommission({
                ...newCommission,
                commissionPercentage: parseFloat(e.target.value) || 0,
              });
              if (errors.commissionPercentage !== undefined && errors.commissionPercentage !== '') {
                setErrors({ ...errors, commissionPercentage: '' });
              }
            }}
            error={errors.commissionPercentage}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('userCommissions.status')}
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={newCommission.isActive}
                onChange={(e) => setNewCommission({ ...newCommission, isActive: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                {newCommission.isActive
                  ? (t('userCommissions.active') ?? 'Active')
                  : (t('userCommissions.inactive') ?? 'Inactive')}
              </span>
            </label>
          </div>
        </div>
      </Dialog>

      {/* Detail Modal */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailCommission(null);
        }}
        title={`${t('userCommissions.viewDetails')} — ${detailCommission?.user.firstName ?? ''} ${detailCommission?.user.lastName ?? ''}`}
        size="md"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setIsDetailModalOpen(false);
              setDetailCommission(null);
            }}
          >
            {t('common.accept')}
          </Button>
        }
      >
        {detailCommission !== null && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-4)',
              padding: 'var(--space-2)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.name')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailCommission.user.firstName} {detailCommission.user.lastName}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.email')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailCommission.user.email}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.role')}
              </p>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                {detailCommission.user.role}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.commissionPercentage')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-lg)' }}>
                {detailCommission.commissionPercentage}%
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.status')}
              </p>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                  detailCommission.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {detailCommission.isActive
                  ? (t('userCommissions.active') ?? 'Active')
                  : (t('userCommissions.inactive') ?? 'Inactive')}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.userId')}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'monospace',
                  color: 'var(--color-neutral-600)',
                }}
              >
                {detailCommission.userId}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.createdAt')}
              </p>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                {new Date(detailCommission.createdAt).toLocaleDateString(
                  language === 'es' ? 'es-ES' : 'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' }
                )}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('userCommissions.updatedAt')}
              </p>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                {new Date(detailCommission.updatedAt).toLocaleDateString(
                  language === 'es' ? 'es-ES' : 'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' }
                )}
              </p>
            </div>
          </div>
        )}
      </Dialog>

      {/* Error Modal */}
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

      {/* Success Modal */}
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
