/**
 * KycSection
 * KYC verification status and actions for owners
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { kycEn, kycEs } from '~/lib/i18n';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken } from '~/store/slices/authSlice';
import { fetchKycStart, fetchKycError } from '~/store/slices/kycSlice';
import { initKycBusiness } from '~/server/businessLogic/kycBusinessLogic';
import { formatKycStatus, getKycRequirementsMessage } from '~/services/kycService';
import type { KycStatus } from '~/types/kyc';

interface KycSectionProps {
  kycStatus: KycStatus | null;
  ownerKycStatus: string | null;
}

export function KycSection({ kycStatus, ownerKycStatus }: KycSectionProps): JSX.Element {
  const { language } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const kycT = language === 'en' ? kycEn : kycEs;
  const [isInitializing, setIsInitializing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmKyc = async (): Promise<void> => {
    setIsInitializing(true);
    dispatch(fetchKycStart());
    try {
      const returnUrl = `${window.location.origin}/profile`;
      const refreshUrl = `${window.location.origin}/profile`;
      const result = await initKycBusiness(token ?? undefined, language, returnUrl, refreshUrl);
      if (
        result.success &&
        typeof result.onboardingUrl === 'string' &&
        result.onboardingUrl !== ''
      ) {
        window.location.href = result.onboardingUrl;
      } else {
        dispatch(fetchKycError(result.error ?? 'Error'));
        setIsInitializing(false);
        setShowConfirmModal(false);
      }
    } catch (error) {
      dispatch(fetchKycError(error instanceof Error ? error.message : 'Error'));
      setIsInitializing(false);
      setShowConfirmModal(false);
    }
  };

  // completed state: green card with success message
  if (ownerKycStatus === 'completed') {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '22px' }}>✅</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{kycT.kycCompletedTitle}</h3>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {kycT.kycCompletedBadge}
          </span>
        </div>
        <p style={{ fontSize: '14px', color: '#166534', lineHeight: '1.5', margin: 0 }}>
          {kycT.kycCompletedDescription}
        </p>
      </div>
    );
  }

  // in_progress state: yellow card, no verification button
  if (ownerKycStatus === 'in_progress') {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fffbeb',
          borderRadius: '8px',
          border: '1px solid #fde68a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            {kycT.kycInProgressTitle}
          </h3>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              backgroundColor: '#fef9c3',
              color: '#854d0e',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {kycT.kycInProgressBadge}
          </span>
        </div>
        <p style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.5', margin: 0 }}>
          {kycT.kycInProgressDescription}
        </p>
      </div>
    );
  }

  if (kycStatus === null || kycStatus === undefined) {
    return (
      <>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            {kycT.kycTitle}
          </h3>
          <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '12px' }}>
            {kycT.kycNotInitiated}
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            {kycT.verificationOpensNewTab}
          </p>
          <button
            onClick={() => {
              setShowConfirmModal(true);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary-500, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {kycT.startKyc}
          </button>
        </div>
        {showConfirmModal && (
          <KycConfirmModal
            kycT={kycT}
            isLoading={isInitializing}
            onConfirm={() => {
              void handleConfirmKyc();
            }}
            onCancel={() => {
              setShowConfirmModal(false);
            }}
          />
        )}
      </>
    );
  }

  const isComplete = kycStatus.isComplete;
  const bgColor = isComplete ? '#f0fdf4' : '#fffbeb';
  const borderColor = isComplete ? '#bbf7d0' : '#fde68a';

  return (
    <>
      <div
        style={{
          padding: '16px',
          backgroundColor: bgColor,
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{kycT.kycTitle}</h3>

        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            backgroundColor: isComplete ? '#dcfce7' : '#fef9c3',
            color: isComplete ? '#166534' : '#854d0e',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '12px',
          }}
        >
          {formatKycStatus(kycStatus, language)}
        </div>

        {!isComplete && kycStatus.percentageComplete > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${kycStatus.percentageComplete}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-primary-500, #3b82f6)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          <strong>{kycT.requirements}:</strong>{' '}
          {getKycRequirementsMessage(kycStatus.requirementsNeeded, language)}
        </div>

        <button
          onClick={() => {
            setShowConfirmModal(true);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary-500, #3b82f6)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {kycT.updateKyc}
        </button>
      </div>
      {showConfirmModal && (
        <KycConfirmModal
          kycT={kycT}
          isLoading={isInitializing}
          onConfirm={() => {
            void handleConfirmKyc();
          }}
          onCancel={() => {
            setShowConfirmModal(false);
          }}
        />
      )}
    </>
  );
}

/* ─── Confirmation Modal ─── */

function KycConfirmModal({
  kycT,
  isLoading,
  onConfirm,
  onCancel,
}: {
  kycT: typeof kycEs;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '520px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            🔐
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            {kycT.confirmModalTitle}
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p
            style={{
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.6',
              margin: '0 0 12px 0',
            }}
          >
            {kycT.confirmModalBody}
          </p>
          <p
            style={{
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.6',
              margin: '0 0 12px 0',
            }}
          >
            {kycT.confirmModalBody2}
          </p>
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
            <p
              style={{
                fontSize: '13px',
                color: '#92400e',
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              {kycT.confirmModalBody3}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isLoading ? 0.5 : 1,
              transition: 'background-color 0.15s',
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {kycT.confirmModalCancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary-500, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.15s',
            }}
          >
            {isLoading ? kycT.confirmModalRedirecting : kycT.confirmModalContinue}
            {isLoading && (
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
