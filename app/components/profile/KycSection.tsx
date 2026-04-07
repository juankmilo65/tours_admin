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
}

export function KycSection({ kycStatus }: KycSectionProps): JSX.Element {
  const { language } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const kycT = language === 'en' ? kycEn : kycEs;
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitKyc = async () => {
    setIsInitializing(true);
    dispatch(fetchKycStart());
    try {
      const result = await initKycBusiness(token ?? undefined, language);
      if (
        result.success &&
        typeof result.onboardingUrl === 'string' &&
        result.onboardingUrl !== ''
      ) {
        window.open(result.onboardingUrl, '_blank');
      } else {
        dispatch(fetchKycError(result.error ?? 'Error'));
      }
    } catch (error) {
      dispatch(fetchKycError(error instanceof Error ? error.message : 'Error'));
    } finally {
      setIsInitializing(false);
    }
  };

  if (kycStatus === null || kycStatus === undefined) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{kycT.kycTitle}</h3>
        <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '12px' }}>
          {kycT.kycNotInitiated}
        </p>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          {kycT.verificationOpensNewTab}
        </p>
        <button
          onClick={() => {
            void handleInitKyc();
          }}
          disabled={isInitializing}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary-500, #3b82f6)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isInitializing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isInitializing ? 0.6 : 1,
          }}
        >
          {isInitializing ? '...' : kycT.startKyc}
        </button>
      </div>
    );
  }

  const isComplete = kycStatus.isComplete;
  const bgColor = isComplete ? '#f0fdf4' : '#fffbeb';
  const borderColor = isComplete ? '#bbf7d0' : '#fde68a';

  return (
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
          void handleInitKyc();
        }}
        disabled={isInitializing}
        style={{
          padding: '8px 16px',
          backgroundColor: 'var(--color-primary-500, #3b82f6)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isInitializing ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: isInitializing ? 0.6 : 1,
        }}
      >
        {isInitializing ? '...' : kycT.updateKyc}
      </button>
    </div>
  );
}
