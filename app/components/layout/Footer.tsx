/**
 * Footer Component - Copyright Information
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '~/lib/i18n/utils';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <footer 
      style={{
        backgroundColor: 'var(--color-neutral-50)',
        borderTop: '1px solid var(--color-neutral-200)',
        padding: isMobile ? 'var(--space-4) var(--space-4)' : 'var(--space-4) var(--space-6)',
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-neutral-500)',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 'var(--space-4)' : 0,
          textAlign: isMobile ? 'center' : 'left',
        }}
      >
        <p style={{ margin: 0 }}>{t('footer.copyright', { year: currentYear })}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 'var(--space-3)' : 'var(--space-4)', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <a 
            href="#"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-700)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'inherit';
            }}
          >
            {t('footer.privacyPolicy')}
          </a>
          <a 
            href="#"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-700)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'inherit';
            }}
          >
            {t('footer.termsOfService')}
          </a>
          <a 
            href="#"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-700)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'inherit';
            }}
          >
            {t('footer.support')}
          </a>
        </div>
      </div>
    </footer>
  );
}
