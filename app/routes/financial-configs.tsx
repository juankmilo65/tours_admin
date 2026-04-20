/**
 * Financial Configs Route - Financial Configuration Management
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
  getFinancialConfigsBusiness,
  getFinancialConfigByCountryBusiness,
  createFinancialConfigBusiness,
  updateFinancialConfigBusiness,
  type FinancialConfig,
  type CreateFinancialConfigDto,
  type UpdateFinancialConfigDto,
} from '~/server/businessLogic/financialConfigsBusinessLogic';
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

export default function FinancialConfigs(): JSX.Element {
  const { t, language } = useTranslation();
  const token = useAppSelector(selectAuthToken) ?? undefined;

  const [configs, setConfigs] = useState<FinancialConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<FinancialConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCountryCode, setEditingCountryCode] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailConfig, setDetailConfig] = useState<FinancialConfig | null>(null);

  const [newConfig, setNewConfig] = useState<CreateFinancialConfigDto>({
    countryCode: '',
    commissionDefaultPercent: 10,
    holdPeriodHours: 48,
    paymentMethodTypes: ['card'],
    stripeConnectEnabled: true,
    kycRequired: true,
  });
  const [paymentMethodInput, setPaymentMethodInput] = useState('card');
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

  const fetchConfigs = async () => {
    if (token === undefined) return;

    setIsLoading(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Loading' }));

    try {
      const result = await getFinancialConfigsBusiness({ token });

      if (result.success === true) {
        setConfigs(result.data ?? []);
      } else {
        setConfigs([]);
        showError({ messageKey: 'financialConfigs.configsLoadError' });
      }
    } catch (error) {
      console.error('Error fetching financial configs:', error);
      setConfigs([]);
      showError({ messageKey: 'financialConfigs.configsLoadError' });
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token === undefined) return;
    void fetchConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredConfigs(configs);
    } else {
      const term = searchTerm.toUpperCase();
      setFilteredConfigs(configs.filter((c) => c.countryCode.includes(term)));
    }
  }, [configs, searchTerm]);

  const resetForm = () => {
    setNewConfig({
      countryCode: '',
      commissionDefaultPercent: 10,
      holdPeriodHours: 48,
      paymentMethodTypes: ['card'],
      stripeConnectEnabled: true,
      kycRequired: true,
    });
    setPaymentMethodInput('card');
    setErrors({});
    setIsEditMode(false);
    setEditingCountryCode(null);
  };

  const handleSaveConfig = async () => {
    if (token === undefined) {
      console.error('No token available');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!isEditMode) {
      if (!newConfig.countryCode || newConfig.countryCode.trim() === '') {
        newErrors.countryCode = t('financialConfigs.validation.countryCodeRequired') ?? 'Required';
      } else if (!/^[A-Z]{2}$/.test(newConfig.countryCode)) {
        newErrors.countryCode =
          t('financialConfigs.validation.countryCodeInvalid') ?? 'Invalid country code';
      }
    }

    if (
      newConfig.commissionDefaultPercent === undefined ||
      newConfig.commissionDefaultPercent === null
    ) {
      newErrors.commissionDefaultPercent =
        t('financialConfigs.validation.commissionRequired') ?? 'Required';
    } else if (newConfig.commissionDefaultPercent < 0 || newConfig.commissionDefaultPercent > 100) {
      newErrors.commissionDefaultPercent =
        t('financialConfigs.validation.commissionInvalid') ?? 'Invalid';
    }

    if (newConfig.holdPeriodHours === undefined || newConfig.holdPeriodHours === null) {
      newErrors.holdPeriodHours = t('financialConfigs.validation.holdPeriodRequired') ?? 'Required';
    } else if (newConfig.holdPeriodHours < 0) {
      newErrors.holdPeriodHours = t('financialConfigs.validation.holdPeriodInvalid') ?? 'Invalid';
    }

    const methods = paymentMethodInput
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m !== '');
    if (methods.length === 0) {
      newErrors.paymentMethodTypes =
        t('financialConfigs.validation.paymentMethodsRequired') ?? 'Required';
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
            ? (t('financialConfigs.updating') ?? 'Updating...')
            : (t('financialConfigs.creating') ?? 'Creating...'),
        })
      );

      if (isEditMode === true && editingCountryCode !== null) {
        const updateData: UpdateFinancialConfigDto = {
          commissionDefaultPercent: newConfig.commissionDefaultPercent,
          holdPeriodHours: newConfig.holdPeriodHours,
          paymentMethodTypes: methods,
          stripeConnectEnabled: newConfig.stripeConnectEnabled,
          kycRequired: newConfig.kycRequired,
        };

        const result = await updateFinancialConfigBusiness(editingCountryCode, updateData, token);

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('financialConfigs.errorUpdateTitle') ?? 'Error',
            message:
              result.message ?? t('financialConfigs.errorUpdate') ?? 'Error updating configuration',
          });
          return;
        }
      } else {
        const createData: CreateFinancialConfigDto = {
          ...newConfig,
          paymentMethodTypes: methods,
        };

        const result = await createFinancialConfigBusiness(createData, token);

        if (result.success === false) {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('financialConfigs.errorCreateTitle') ?? 'Error',
            message:
              result.message ?? t('financialConfigs.errorCreate') ?? 'Error creating configuration',
          });
          return;
        }
      }

      setSuccessModal({
        isOpen: true,
        title: isEditMode
          ? (t('financialConfigs.configUpdated') ?? 'Configuration Updated')
          : (t('financialConfigs.configCreated') ?? 'Configuration Created'),
        message: isEditMode
          ? (t('financialConfigs.configUpdatedSuccess') ?? 'Configuration updated successfully')
          : (t('financialConfigs.configCreatedSuccess') ?? 'Configuration created successfully'),
      });
      setIsCreateModalOpen(false);
      resetForm();

      await fetchConfigs();
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    } catch (error) {
      console.error('Error in financial config saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleOpenEditModal = (config: FinancialConfig) => {
    setNewConfig({
      countryCode: config.countryCode,
      commissionDefaultPercent: parseFloat(config.commissionDefaultPercent),
      holdPeriodHours: config.holdPeriodHours,
      paymentMethodTypes: config.paymentMethodTypes,
      stripeConnectEnabled: config.stripeConnectEnabled,
      kycRequired: config.kycRequired,
    });
    setPaymentMethodInput(config.paymentMethodTypes.join(', '));
    setIsEditMode(true);
    setEditingCountryCode(config.countryCode);
    setIsCreateModalOpen(true);
  };

  const handleViewDetails = async (config: FinancialConfig) => {
    if (token === undefined) return;

    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Loading' }));

    try {
      const result = await getFinancialConfigByCountryBusiness(config.countryCode, token);

      if (result.success === true && result.data !== undefined) {
        setDetailConfig(result.data);
      } else {
        setDetailConfig(config);
      }
    } catch {
      setDetailConfig(config);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setIsDetailModalOpen(true);
    }
  };

  const columns: Column<FinancialConfig>[] = [
    {
      key: 'countryCode',
      label: t('financialConfigs.countryCode') ?? 'Country Code',
      render: (_value: unknown, row: FinancialConfig) => (
        <div className="font-semibold text-gray-900">{row.countryCode}</div>
      ),
    },
    {
      key: 'commissionDefaultPercent',
      label: t('financialConfigs.commissionDefaultPercent') ?? 'Commission (%)',
      render: (_value: unknown, row: FinancialConfig) => (
        <div className="text-sm text-gray-600">{row.commissionDefaultPercent}%</div>
      ),
    },
    {
      key: 'holdPeriodHours',
      label: t('financialConfigs.holdPeriodHours') ?? 'Hold Period',
      render: (_value: unknown, row: FinancialConfig) => (
        <div className="text-sm text-gray-600">{row.holdPeriodHours}h</div>
      ),
    },
    {
      key: 'paymentMethodTypes',
      label: t('financialConfigs.paymentMethodTypes') ?? 'Payment Methods',
      render: (_value: unknown, row: FinancialConfig) => (
        <div className="flex flex-wrap gap-1">
          {row.paymentMethodTypes.map((method) => (
            <span
              key={method}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"
            >
              {method}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'stripeConnectEnabled',
      label: t('financialConfigs.stripeConnectEnabled') ?? 'Stripe Connect',
      render: (_value: unknown, row: FinancialConfig) => (
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
            row.stripeConnectEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {row.stripeConnectEnabled
            ? (t('financialConfigs.enabled') ?? 'Enabled')
            : (t('financialConfigs.disabled') ?? 'Disabled')}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: t('financialConfigs.status') ?? 'Status',
      render: (_value: unknown, row: FinancialConfig) => (
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
      key: 'actions',
      label: t('common.actions') ?? 'Actions',
      render: (_value: unknown, row: FinancialConfig) => (
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
            title={t('financialConfigs.viewDetails') ?? 'View Details'}
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
            title={t('financialConfigs.editConfig') ?? 'Edit'}
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
      <Card title={t('financialConfigs.allConfigs') ?? 'All Financial Configurations'}>
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
              placeholder={t('financialConfigs.searchPlaceholder') ?? 'Search by country code...'}
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
            {t('financialConfigs.addNewConfig')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-base font-medium">{t('common.loading')}</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-lg font-medium">{t('financialConfigs.noConfigsFound')}</p>
            <p className="text-sm">{t('financialConfigs.noConfigsDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredConfigs} columns={columns} />
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
        title={
          isEditMode
            ? t('financialConfigs.editConfigTitle')
            : t('financialConfigs.createConfigTitle')
        }
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
            <Button variant="primary" onClick={() => void handleSaveConfig()}>
              {isEditMode ? t('common.save') : t('financialConfigs.createConfig')}
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
            label={t('financialConfigs.countryCode')}
            placeholder="US"
            value={newConfig.countryCode}
            onChange={(e) => {
              const value = e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 2);
              setNewConfig({ ...newConfig, countryCode: value });
              if (errors.countryCode !== undefined && errors.countryCode !== '') {
                setErrors({ ...errors, countryCode: '' });
              }
            }}
            error={errors.countryCode}
            required
            disabled={isEditMode}
          />

          <Input
            label={t('financialConfigs.commissionDefaultPercent')}
            placeholder="10"
            type="number"
            value={String(newConfig.commissionDefaultPercent)}
            onChange={(e) => {
              setNewConfig({
                ...newConfig,
                commissionDefaultPercent: parseFloat(e.target.value) || 0,
              });
              if (
                errors.commissionDefaultPercent !== undefined &&
                errors.commissionDefaultPercent !== ''
              ) {
                setErrors({ ...errors, commissionDefaultPercent: '' });
              }
            }}
            error={errors.commissionDefaultPercent}
            required
          />

          <Input
            label={t('financialConfigs.holdPeriodHours')}
            placeholder="48"
            type="number"
            value={String(newConfig.holdPeriodHours)}
            onChange={(e) => {
              setNewConfig({
                ...newConfig,
                holdPeriodHours: parseInt(e.target.value, 10) || 0,
              });
              if (errors.holdPeriodHours !== undefined && errors.holdPeriodHours !== '') {
                setErrors({ ...errors, holdPeriodHours: '' });
              }
            }}
            error={errors.holdPeriodHours}
            required
          />

          <Input
            label={t('financialConfigs.paymentMethodTypes')}
            placeholder="card, oxxo"
            value={paymentMethodInput}
            onChange={(e) => {
              setPaymentMethodInput(e.target.value);
              if (errors.paymentMethodTypes !== undefined && errors.paymentMethodTypes !== '') {
                setErrors({ ...errors, paymentMethodTypes: '' });
              }
            }}
            error={errors.paymentMethodTypes}
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
              {t('financialConfigs.stripeConnectEnabled')}
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
                checked={newConfig.stripeConnectEnabled}
                onChange={(e) =>
                  setNewConfig({ ...newConfig, stripeConnectEnabled: e.target.checked })
                }
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                {newConfig.stripeConnectEnabled
                  ? (t('financialConfigs.enabled') ?? 'Enabled')
                  : (t('financialConfigs.disabled') ?? 'Disabled')}
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('financialConfigs.kycRequired')}
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
                checked={newConfig.kycRequired}
                onChange={(e) => setNewConfig({ ...newConfig, kycRequired: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                {newConfig.kycRequired
                  ? (t('financialConfigs.yes') ?? 'Yes')
                  : (t('financialConfigs.no') ?? 'No')}
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
          setDetailConfig(null);
        }}
        title={`${t('financialConfigs.viewDetails')} — ${detailConfig?.countryCode ?? ''}`}
        size="md"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setIsDetailModalOpen(false);
              setDetailConfig(null);
            }}
          >
            {t('common.accept')}
          </Button>
        }
      >
        {detailConfig !== null && (
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
                {t('financialConfigs.countryCode')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailConfig.countryCode}
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
                {t('financialConfigs.commissionDefaultPercent')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailConfig.commissionDefaultPercent}%
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
                {t('financialConfigs.holdPeriodHours')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailConfig.holdPeriodHours}h
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
                {t('financialConfigs.stripeMaxRefundDays')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailConfig.stripeMaxRefundDays}
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
                {t('financialConfigs.stripeMaxDisputeDays')}
              </p>
              <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {detailConfig.stripeMaxDisputeDays}
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
                {t('financialConfigs.paymentMethodTypes')}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {detailConfig.paymentMethodTypes.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  marginBottom: '2px',
                }}
              >
                {t('financialConfigs.stripeConnectEnabled')}
              </p>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                  detailConfig.stripeConnectEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {detailConfig.stripeConnectEnabled
                  ? (t('financialConfigs.enabled') ?? 'Enabled')
                  : (t('financialConfigs.disabled') ?? 'Disabled')}
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
                {t('financialConfigs.kycRequired')}
              </p>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                  detailConfig.kycRequired
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {detailConfig.kycRequired
                  ? (t('financialConfigs.yes') ?? 'Yes')
                  : (t('financialConfigs.no') ?? 'No')}
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
                {t('financialConfigs.status')}
              </p>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                  detailConfig.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {detailConfig.isActive ? t('common.active') : t('common.inactive')}
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
                {t('financialConfigs.createdAt')}
              </p>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                {new Date(detailConfig.createdAt).toLocaleDateString(
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
                {t('financialConfigs.updatedAt')}
              </p>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                {new Date(detailConfig.updatedAt).toLocaleDateString(
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
