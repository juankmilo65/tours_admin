/**
 * Languages Route - Languages Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import { getLanguages, createLanguage, updateLanguage } from '~/server/languages';
import type { LanguageOption } from '~/server/languages';
import type { Column } from '~/components/ui/Table';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectAuthToken } from '~/store/slices/authSlice';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Languages(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);
  const dispatch = useAppDispatch();

  // Local state for languages
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<LanguageOption[]>([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState<{
    code: string;
    name_es: string;
    name_en: string;
    isActive: boolean;
  }>({
    code: '',
    name_es: '',
    name_en: '',
    isActive: true,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch languages on component mount
  useEffect(() => {
    const fetchLanguages = async () => {
      if (token === null || token === '') return;

      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = await getLanguages({
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          language,
        });

        if (result.success === true && result.data !== undefined) {
          setLanguages(result.data);
          setFilteredLanguages(result.data);
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        setLanguages([]);
        setFilteredLanguages([]);
      } finally {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchLanguages();
  }, [statusFilter, token, language, dispatch, t]);

  // Filter languages by search term
  useEffect(() => {
    const filtered = languages.filter((lang) => {
      const searchLower = searchTerm.toLowerCase();
      const name = language === 'en' ? lang.name_en : lang.name_es;
      const code = lang.code.toLowerCase();

      return name.toLowerCase().includes(searchLower) || code.includes(searchLower);
    });
    setFilteredLanguages(filtered);
  }, [searchTerm, languages, language]);

  const resetForm = () => {
    setNewLanguage({
      code: '',
      name_es: '',
      name_en: '',
      isActive: true,
    });
    setErrors({});
    setIsEditMode(false);
    setEditingLanguageId(null);
  };

  const handleOpenEditModal = (lang: LanguageOption) => {
    setNewLanguage({
      code: lang.code,
      name_es: lang.name_es,
      name_en: lang.name_en,
      isActive: lang.isActive ?? true,
    });
    setIsEditMode(true);
    setEditingLanguageId(lang.id);
    setIsCreateModalOpen(true);
  };

  // Handle status toggle
  const handleToggleStatus = async (lang: LanguageOption) => {
    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('languages.updating') || 'Updating...',
        })
      );

      const result = (await updateLanguage(
        lang.id,
        { isActive: !(lang.isActive ?? true) },
        token,
        language
      )) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setLanguages(
          languages.map((l) => (l.id === lang.id ? { ...l, isActive: !(l.isActive ?? true) } : l))
        );
      } else {
        setErrorModal({
          isOpen: true,
          title: t('languages.errorUpdateTitle'),
          message: result.message ?? result.error?.message ?? t('languages.errorUpdate'),
        });
      }
    } catch (error) {
      console.error('Error toggling language status:', error);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle create or update language
  const handleSaveLanguage = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation
    const newErrors: Record<string, string> = {};

    if (!newLanguage.code.trim())
      newErrors.code = t('languages.validation.codeRequired') || 'Required';
    if (!newLanguage.name_es.trim())
      newErrors.name_es = t('languages.validation.nameEsRequired') || 'Required';
    if (!newLanguage.name_en.trim())
      newErrors.name_en = t('languages.validation.nameEnRequired') || 'Required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if valid
    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: isEditMode
            ? t('languages.updating') || 'Updating...'
            : t('languages.creating') || 'Creating...',
        })
      );

      if (isEditMode === true && editingLanguageId !== null) {
        // Update
        const result = (await updateLanguage(editingLanguageId, newLanguage, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (result.error !== undefined || result.success === false) {
          console.error('Error updating language:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('languages.errorUpdateTitle') || 'Error',
            message: result.message ?? result.error?.message ?? t('languages.errorUpdate'),
          });
          return;
        }
      } else {
        // Create
        const result = (await createLanguage(newLanguage, token, language)) as {
          success?: boolean;
          message?: string;
          data?: { id: string };
          error?: { message?: string };
        };

        if (
          result.error !== undefined ||
          result.success === false ||
          result.data?.id === undefined
        ) {
          console.error('Error creating language:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('languages.errorCreateTitle'),
            message: result.message ?? result.error?.message ?? t('languages.errorCreate'),
          });
          return;
        }
      }

      // Success
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const refreshResult = await getLanguages({
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
        language,
      });
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setLanguages(refreshResult.data);
      }
    } catch (error) {
      console.error('Error in language saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const columns: Column<LanguageOption>[] = [
    {
      key: 'code',
      label: t('languages.code'),
      render: (value: unknown) => (
        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
          {value as string}
        </div>
      ),
    },
    {
      key: 'name',
      label: t('languages.language'),
      render: (_: unknown, row: LanguageOption) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {language === 'en' ? row.name_en : row.name_es}
          </div>
        </div>
      ),
    },
    {
      key: 'isActive',
      label: t('languages.status'),
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
          {(value as boolean) ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('languages.created'),
      render: (value: unknown) => (
        <div className="text-sm text-gray-600">
          {value !== undefined
            ? new Date(value as string).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '-'}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'id',
      label: t('common.actions'),
      render: (_: unknown, row: LanguageOption) => (
        <div className="flex items-center gap-4">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="language-edit-btn"
            title="Edit Language"
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

          {/* Toggle Switch */}
          <div className="language-toggle-wrapper">
            <div
              onClick={() => void handleToggleStatus(row)}
              className={`language-toggle-switch ${(row.isActive ?? true) ? 'active' : ''}`}
            >
              <div className="language-toggle-knob" />
            </div>
            <span className={`language-toggle-label ${(row.isActive ?? true) ? 'active' : ''}`}>
              {(row.isActive ?? true) ? t('common.active') : t('common.inactive')}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('languages.allLanguages')}>
        {/* Filters & Actions Toolbar */}
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px' }}>
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
                placeholder={t('languages.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ width: '14rem', minWidth: '150px' }}>
            <Select
              options={[
                { value: '', label: t('languages.allStatus') },
                { value: 'true', label: t('common.active') },
                { value: 'false', label: t('common.inactive') },
              ]}
              value={statusFilter}
              onChange={(v: string) => {
                setStatusFilter(v);
              }}
              placeholder={t('languages.allStatus')}
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
                className="w-5 h-5"
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
              {t('languages.addNewLanguage')}
            </span>
          </Button>
        </div>

        {/* Table */}
        {filteredLanguages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.4 20.25M19.4 15a18.022 18.022 0 01-3.552-12.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-lg font-medium">{t('languages.noLanguagesFound')}</p>
            <p className="text-sm">{t('languages.noLanguagesDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredLanguages} columns={columns} />
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
          isEditMode === true
            ? t('languages.editLanguageTitle')
            : t('languages.createLanguageTitle')
        }
        size="lg"
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
              {t('languages.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveLanguage()}>
              {isEditMode === true ? t('common.save') : t('languages.save')}
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
            label={t('languages.code')}
            placeholder="Ex: es, en, fr"
            value={newLanguage.code}
            onChange={(e) => {
              const val = e.target.value;
              setNewLanguage({ ...newLanguage, code: val.toLowerCase() });
              if (errors.code !== undefined && errors.code !== '')
                setErrors({ ...errors, code: '' });
            }}
            error={errors.code}
            required
          />
          <Input
            label={t('languages.nameEs')}
            placeholder="Ej: Español"
            value={newLanguage.name_es}
            onChange={(e) => {
              setNewLanguage({ ...newLanguage, name_es: e.target.value });
              if (errors.name_es !== undefined && errors.name_es !== '')
                setErrors({ ...errors, name_es: '' });
            }}
            error={errors.name_es}
            required
          />
          <Input
            label={t('languages.nameEn')}
            placeholder="Ex: Spanish"
            value={newLanguage.name_en}
            onChange={(e) => {
              setNewLanguage({ ...newLanguage, name_en: e.target.value });
              if (errors.name_en !== undefined && errors.name_en !== '')
                setErrors({ ...errors, name_en: '' });
            }}
            error={errors.name_en}
            required
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
              id="language-active"
              checked={newLanguage.isActive}
              onChange={(e) => setNewLanguage({ ...newLanguage, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: 'var(--color-primary-600)',
              }}
            />
            <label
              htmlFor="language-active"
              style={{
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('common.active')}
            </label>
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
            {t('common.accept')}
          </Button>
        }
      >
        <div style={{ padding: 'var(--space-2)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-2)',
                backgroundColor: 'var(--color-error-50)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <svg
                style={{ width: 24, height: 24, color: 'var(--color-error-600)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p
              style={{
                margin: 0,
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-900)',
              }}
            >
              {t('common.errorOccurred')}
            </p>
          </div>
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
