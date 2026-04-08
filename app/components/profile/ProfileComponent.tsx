/**
 * ProfileComponent
 * Owner profile page with KYC verification section
 */

import type { JSX } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { kycEn, kycEs } from '~/lib/i18n';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import {
  selectAuth,
  selectAuthToken,
  selectOwnerKycStatus,
  setOwnerKycStatus,
} from '~/store/slices/authSlice';
import { selectKycStatus } from '~/store/slices/kycSlice';
import { getUserKycStatusBusiness } from '~/server/businessLogic/kycBusinessLogic';
import { KycSection } from './KycSection';

export function ProfileComponent(): JSX.Element {
  const { language } = useTranslation();
  const kycStatus = useAppSelector(selectKycStatus);
  const auth = useAppSelector(selectAuth);
  const token = useAppSelector(selectAuthToken);
  const ownerKycStatus = useAppSelector(selectOwnerKycStatus);
  const dispatch = useAppDispatch();
  const role = auth.user?.role;
  const kycT = language === 'en' ? kycEn : kycEs;

  // Fetch KYC status on mount for owners
  useEffect(() => {
    if (role !== 'owner' || token === null) return;

    const fetchStatus = async (): Promise<void> => {
      const result = await getUserKycStatusBusiness(token, language);
      if (result.success && result.kycStatus !== undefined) {
        dispatch(setOwnerKycStatus(result.kycStatus));
      }
    };

    void fetchStatus();
  }, [role, token, language, dispatch]);

  // Poll every 30s while in_progress to detect status changes
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (ownerKycStatus !== 'in_progress' || role !== 'owner' || token === null) {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = window.setInterval(() => {
      void (async () => {
        const result = await getUserKycStatusBusiness(token, language);
        if (result.success && result.kycStatus !== undefined) {
          dispatch(setOwnerKycStatus(result.kycStatus));
        }
      })();
    }, 30_000);

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [ownerKycStatus, role, token, language, dispatch]);

  if (role !== 'owner') {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#9ca3af',
        }}
      >
        {language === 'en' ? 'Not available' : 'No disponible'}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        {language === 'en' ? 'Owner Profile' : 'Perfil del Propietario'}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '24px',
        }}
      >
        {kycT.kycDescription}
      </p>

      <KycSection kycStatus={kycStatus} ownerKycStatus={ownerKycStatus} />
    </div>
  );
}
