/**
 * ProfileComponent
 * Owner profile page with KYC verification section
 */

import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { kycEn, kycEs } from '~/lib/i18n';
import { useAppSelector } from '~/store/hooks';
import { selectAuth } from '~/store/slices/authSlice';
import { selectKycStatus } from '~/store/slices/kycSlice';
import { KycSection } from './KycSection';

export function ProfileComponent(): JSX.Element {
  const { language } = useTranslation();
  const kycStatus = useAppSelector(selectKycStatus);
  const auth = useAppSelector(selectAuth);
  const role = auth.user?.role;
  const kycT = language === 'en' ? kycEn : kycEs;

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

      <KycSection kycStatus={kycStatus} />
    </div>
  );
}
