/**
 * useErrorModal - Reusable hook to display server/load error modals
 *
 * Usage:
 *   const { showError } = useErrorModal();
 *   showError('bookings.loadError');           // key de traducción
 *   showError('bookings.loadError', 'Error detalle'); // key + detalle opcional
 */

import { useCallback } from 'react';
import { useAppDispatch } from '~/store/hooks';
import { openModal } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';

interface ShowErrorOptions {
  /** Translation key for the error title (default: common.error) */
  titleKey?: string;
  /** Translation key for the error message */
  messageKey: string;
  /** Optional fallback plain string if translation returns null */
  fallback?: string;
  /** Optional unique modal id (auto-generated if omitted) */
  id?: string;
}

export function useErrorModal(): { showError: (options: ShowErrorOptions) => void } {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showError = useCallback(
    ({ titleKey = 'common.error', messageKey, fallback, id }: ShowErrorOptions) => {
      const title = t(titleKey) ?? 'Error';
      const message = t(messageKey) ?? fallback ?? 'An error occurred';
      const modalId = id ?? `error-modal-${Date.now()}`;

      dispatch(
        openModal({
          id: modalId,
          type: 'confirm',
          title,
          isOpen: true,
          data: { message, icon: 'alert' },
        })
      );
    },
    [dispatch, t]
  );

  return { showError };
}
