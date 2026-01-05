import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectModals, closeModal } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';

export function ModalRoot() {
  const modals = useAppSelector(selectModals);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  if (!modals || modals.length === 0) return null;

  // Render the last opened modal (stack behavior)
  const modal = modals[modals.length - 1];
  if (!modal || !modal.isOpen) return null;

  const { id, type, title, data } = modal as any;
  const message = data?.message || '';
  const iconType = data?.icon || type || 'info';

  const iconMap: Record<string, string> = {
    success: '✅',
    error: '⛔',
    alert: '⚠️',
    info: 'ℹ️',
  };

  const icon = iconMap[iconType] || iconMap.info;

  const handleClose = () => {
    dispatch(closeModal(id));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(720px, 96%)',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 34 }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{title || t('common.notice')}</h3>
            {message && <p style={{ marginTop: 8, color: 'var(--color-neutral-700)' }}>{message}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              background: 'var(--color-primary-500)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}
