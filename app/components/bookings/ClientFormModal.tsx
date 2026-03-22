/**
 * ClientFormModal
 * Small modal for adding/editing a client within Create/Edit Booking modals.
 * Renders: clientName, clientAge, nationality, idType, clientId, isPrimary.
 */

import type { JSX, CSSProperties } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Input } from '~/components/ui/Input';
import Select from '~/components/ui/Select';
import {
  useDropdownCache,
  useCachedNationalities,
  useAllCachedIdentificationTypes,
} from '~/hooks/useDropdownCache';

export interface ClientFormData {
  clientName: string;
  clientAge: number;
  clientEmail?: string;
  countryCode: string;
  identificationTypeId: string;
  clientId: string;
  isPrimary?: boolean;
}

interface ClientFormModalProps {
  isOpen: boolean;
  language: 'es' | 'en' | string;
  /** When set, modal is in edit mode and fields are pre-filled */
  initialData?: ClientFormData | null;
  /** Whether "isPrimary" radio is shown (Create modal has it, Edit doesn't) */
  showPrimary?: boolean;
  /** Whether this is first client (first client is always primary) */
  isFirstClient?: boolean;
  /** List of users with role 'user' to select from */
  users?: Array<{ id: string; name: string; email: string }>;
  onSave: (data: ClientFormData) => void;
  onClose: () => void;
  translations: {
    clientName: string;
    clientAge: string;
    clientNamePlaceholder: string;
    clientAgePlaceholder: string;
    selectNationality: string;
    selectIdType: string;
    enterClientId: string;
    isPrimary: string;
    clientNameMinLength: string;
    clientNameMaxLength: string;
    clientAgeMin: string;
    clientAgeMax: string;
  };
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 500,
  color: 'var(--color-neutral-700)',
  fontSize: 'var(--text-sm)',
};

const emptyForm: ClientFormData = {
  clientName: '',
  clientAge: 0,
  clientEmail: '',
  countryCode: '',
  identificationTypeId: '',
  clientId: '',
  isPrimary: false,
};

export function ClientFormModal({
  isOpen,
  language,
  initialData,
  showPrimary = false,
  isFirstClient = false,
  users = [],
  onSave,
  onClose,
  translations: tr,
}: ClientFormModalProps): JSX.Element | null {
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { loadNationalities, loadIdentificationTypes } = useDropdownCache();
  const countries = useCachedNationalities(language);
  const allIdTypesByCountry = useAllCachedIdentificationTypes();

  // Track previous isOpen to detect open transition
  const prevOpenRef = useRef(false);

  // Populate form on open (avoid setState inside effect body)
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;

    if (!isOpen) return;
    // Only reset when modal transitions from closed → open
    if (wasOpen) return;

    if (initialData !== undefined && initialData !== null) {
      setForm({ ...initialData });
      if (initialData.countryCode !== '') {
        void loadIdentificationTypes(initialData.countryCode, language);
      }
    } else {
      setForm({ ...emptyForm });
    }
    setErrors({});
    void loadNationalities(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};

    if (!form.clientName.trim()) {
      errs.clientName = `${tr.clientName}: ${language === 'en' ? 'Required' : 'Requerido'}`;
    } else if (form.clientName.trim().length < 3) {
      errs.clientName = tr.clientNameMinLength;
    } else if (form.clientName.trim().length > 100) {
      errs.clientName = tr.clientNameMaxLength;
    }

    if (form.clientAge < 0) {
      errs.clientAge = tr.clientAgeMin;
    } else if (form.clientAge > 120) {
      errs.clientAge = tr.clientAgeMax;
    }

    if (!form.countryCode) {
      errs.countryCode = tr.selectNationality;
    }

    if (form.countryCode && !form.identificationTypeId) {
      errs.identificationTypeId = tr.selectIdType;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (): void => {
    if (!validate()) return;
    onSave(form);
  };

  const handleNationalityChange = (code: string): void => {
    setForm((p) => ({ ...p, countryCode: code, identificationTypeId: '' }));
    if (code) void loadIdentificationTypes(code, language);
    setErrors((p) => {
      const next = { ...p };
      delete next.countryCode;
      return next;
    });
  };

  if (!isOpen) return null;

  const isEdit = initialData !== null && initialData !== undefined;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px 12px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
            {isEdit
              ? language === 'en'
                ? 'Edit Client'
                : 'Editar Cliente'
              : language === 'en'
                ? 'Add Client'
                : 'Agregar Cliente'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.1rem',
              color: '#9ca3af',
              padding: 4,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          {/* isPrimary - Only show for first client in add mode */}
          {showPrimary && isFirstClient && !isEdit && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'default',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-neutral-700)',
                userSelect: 'none',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-50, #eff6ff)',
                border: '1px solid var(--color-primary-200, #bfdbfe)',
              }}
            >
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'default',
                  accentColor: 'var(--color-primary-500)',
                }}
              />
              {tr.isPrimary}
            </label>
          )}

          {/* isPrimary - Only show for non-first clients or in edit mode */}
          {showPrimary && (!isFirstClient || isEdit) && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-neutral-700)',
                userSelect: 'none',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor:
                  form.isPrimary === true
                    ? 'var(--color-primary-50, #eff6ff)'
                    : 'var(--color-neutral-50)',
                border: `1px solid ${form.isPrimary === true ? 'var(--color-primary-200, #bfdbfe)' : 'var(--color-neutral-200)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={form.isPrimary === true}
                onChange={(e) => setForm((p) => ({ ...p, isPrimary: e.target.checked }))}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary-500)',
                }}
              />
              {tr.isPrimary}
            </label>
          )}

          {/* User Select - Only show for first client in add mode when there are users */}
          {showPrimary && isFirstClient && !isEdit && users.length > 0 && (
            <div>
              <label style={labelStyle}>
                {language === 'en' ? 'Select User' : 'Seleccionar Usuario'}
              </label>
              <Select
                options={[
                  { value: '', label: language === 'en' ? 'Manual Entry' : 'Ingreso Manual' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: u.name,
                  })),
                ]}
                value={selectedUserId}
                onChange={(value) => {
                  setSelectedUserId(value);
                  if (value) {
                    const selectedUser = users.find((u) => u.id === value);
                    if (selectedUser) {
                      setForm((p) => ({
                        ...p,
                        clientName: selectedUser.name,
                        clientEmail: selectedUser.email,
                      }));
                      if (errors.clientName !== undefined) {
                        setErrors((p) => {
                          const n = { ...p };
                          delete n.clientName;
                          return n;
                        });
                      }
                    }
                  } else {
                    setForm((p) => ({ ...p, clientName: '', clientEmail: '' }));
                  }
                }}
                placeholder={language === 'en' ? 'Select User' : 'Seleccionar Usuario'}
                id="client-modal-user"
              />
            </div>
          )}

          {/* Grid for fields */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-4)',
            }}
          >
            {/* Client Name */}
            <div>
              <label style={labelStyle}>
                {tr.clientName} <span style={{ color: 'red' }}>*</span>
              </label>
              <Input
                type="text"
                value={form.clientName}
                onChange={(e) => {
                  setForm((p) => ({ ...p, clientName: e.target.value }));
                  if (errors.clientName !== undefined)
                    setErrors((p) => {
                      const n = { ...p };
                      delete n.clientName;
                      return n;
                    });
                }}
                placeholder={tr.clientNamePlaceholder}
                error={errors.clientName}
              />
            </div>

            {/* Client Email */}
            <div>
              <label style={labelStyle}>{language === 'en' ? 'Email' : 'Correo Electrónico'}</label>
              <Input
                type="email"
                value={form.clientEmail ?? ''}
                onChange={(e) => {
                  setForm((p) => ({ ...p, clientEmail: e.target.value }));
                }}
                placeholder={language === 'en' ? 'Enter email' : 'Ingresar correo'}
              />
            </div>

            {/* Client Age */}
            <div>
              <label style={labelStyle}>
                {tr.clientAge} <span style={{ color: 'red' }}>*</span>
              </label>
              <Input
                type="number"
                value={form.clientAge}
                onChange={(e) => {
                  setForm((p) => ({ ...p, clientAge: Number(e.target.value) }));
                  if (errors.clientAge !== undefined)
                    setErrors((p) => {
                      const n = { ...p };
                      delete n.clientAge;
                      return n;
                    });
                }}
                placeholder={tr.clientAgePlaceholder}
                min={0}
                max={120}
                error={errors.clientAge}
              />
            </div>

            {/* Nationality */}
            <div>
              <label style={labelStyle}>
                {language === 'en' ? 'Nationality' : 'Nacionalidad'}{' '}
                <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: '', label: tr.selectNationality },
                  ...countries.map((c) => ({
                    value: c.code,
                    label:
                      language === 'en'
                        ? (c.nationality_en ?? c.name_en)
                        : (c.nationality_es ?? c.name_es),
                  })),
                ]}
                value={form.countryCode}
                onChange={handleNationalityChange}
                placeholder={tr.selectNationality}
                id="client-modal-nationality"
              />
              {errors.countryCode !== undefined && (
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-error-500)',
                    marginTop: 4,
                  }}
                >
                  {errors.countryCode}
                </p>
              )}
            </div>

            {/* ID Type */}
            <div>
              <label style={labelStyle}>
                {language === 'en' ? 'ID Type' : 'Tipo de ID'}{' '}
                <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: '', label: tr.selectIdType },
                  ...(allIdTypesByCountry[form.countryCode] ?? []).map((it) => ({
                    value: it.id,
                    label: language === 'en' ? it.name_en : it.name_es,
                  })),
                ]}
                value={form.identificationTypeId}
                onChange={(v) => {
                  setForm((p) => ({ ...p, identificationTypeId: v }));
                  if (errors.identificationTypeId !== undefined)
                    setErrors((p) => {
                      const n = { ...p };
                      delete n.identificationTypeId;
                      return n;
                    });
                }}
                placeholder={tr.selectIdType}
                id="client-modal-idtype"
                disabled={form.countryCode === ''}
              />
              {errors.identificationTypeId !== undefined && (
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-error-500)',
                    marginTop: 4,
                  }}
                >
                  {errors.identificationTypeId}
                </p>
              )}
            </div>

            {/* Client ID */}
            <div>
              <label style={labelStyle}>{language === 'en' ? 'Client ID' : 'ID Cliente'}</label>
              <Input
                type="text"
                value={form.clientId}
                onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                placeholder={tr.enterClientId}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            padding: '12px 20px 16px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button type="button" onClick={onClose} className="modal-btn modal-btn-secondary">
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>
          <button type="button" onClick={handleSave} className="modal-btn modal-btn-primary">
            {isEdit
              ? language === 'en'
                ? 'Save'
                : 'Guardar'
              : language === 'en'
                ? 'Add'
                : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
