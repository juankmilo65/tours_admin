import type { AppDispatch } from '~/store';
import { addNotification, setNotificationCount } from '~/store/slices/uiSlice';

export interface RealtimeNotificationEvent {
  id?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  unreadCount?: number;
  duration?: number;
}

export interface NotificationsTransport {
  connect: (params: {
    token: string;
    onEvent: (event: RealtimeNotificationEvent) => void;
    onError?: (error: unknown) => void;
  }) => () => void;
}

class NoopNotificationsTransport implements NotificationsTransport {
  connect(): () => void {
    // Placeholder transport. Replace with WebSocket/SSE transport when backend is ready.
    return () => {};
  }
}

interface StartParams {
  token: string;
  dispatch: AppDispatch;
}

export class NotificationsRealtimeService {
  private readonly transport: NotificationsTransport;
  private unsubscribe: (() => void) | null = null;

  constructor(transport?: NotificationsTransport) {
    this.transport = transport ?? new NoopNotificationsTransport();
  }

  start(params: StartParams): void {
    const token = params.token.trim();
    if (token === '') return;

    this.stop();

    this.unsubscribe = this.transport.connect({
      token,
      onEvent: (event) => {
        if (typeof event.unreadCount === 'number') {
          params.dispatch(setNotificationCount(Math.max(0, event.unreadCount)));
        }

        if (
          typeof event.message === 'string' &&
          event.message.trim() !== '' &&
          event.type !== undefined
        ) {
          params.dispatch(
            addNotification({
              id: event.id ?? `rt-${Date.now()}`,
              type: event.type,
              message: event.message,
              duration: event.duration,
            })
          );
        }
      },
      onError: () => {
        // Intentionally silent for now. Consumers can inject a transport with richer logging.
      },
    });
  }

  stop(): void {
    if (this.unsubscribe !== null) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const notificationsRealtimeService = new NotificationsRealtimeService();
