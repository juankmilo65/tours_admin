# 🚀 SUPER PROMPT - MULTI-TOUR BOOKING FRONTEND REFACTORING
## Tours Admin | Claude Opus 4.6 | Remix + Redux + TypeScript

**Status**: ✅ READY FOR IMPLEMENTATION  
**Generated**: April 4, 2026  
**Target**: Production-ready multi-tour booking system with split payments + KYC

---

## CONTENIDOS

1. [CONTEXTO EJECUTIVO](#contexto-ejecutivo)
2. [ARQUITECTURA CONFIRMADA](#arquitectura-confirmada)
3. [ESPECIFICACIONES TÉCNICAS](#especificaciones-técnicas)
4. [SERVICIOS & BUSINESS LOGIC](#servicios--business-logic)
5. [REDUX STATE SHAPE](#redux-state-shape)
6. [COMPONENTES DETALLADOS](#componentes-detallados)
7. [FLUJOS COMPLETOS](#flujos-completos)
8. [i18n STRINGS](#i18n-strings)
9. [IMPLEMENTATION CHECKLIST](#implementation-checklist)
10. [INSTRUCCIONES PARA IMPLEMENTACIÓN](#instrucciones-para-implementación)

---

## CONTEXTO EJECUTIVO

### Objetivo
Refactorizar el sistema de reservas de single-tour a multi-tour con:
- ✅ Múltiples tours por reserva (mismo día con validación 1h margin)
- ✅ Split payments (depósito + pago final)
- ✅ KYC integrado (verificación de usuarios owner)
- ✅ Políticas de cancelación con refunds automáticos
- ✅ Timeline de pagos y eventos
- ✅ Soporte completo i18n (ES/EN)

### Cambios NO Breaking
- ✅ Backward compatible con booking único
- ✅ Single-tour flow funciona igual
- ✅ EditBookingModal usa el mismo 48h policy
- ✅ BookingStatusModal extendida con más eventos

### Estado Actual
- ✅ Backend + webhooks Stripe: LISTO  
- ✅ Response JSON confirmado
- ✅ Codebase patterns identificados
- ✅ Redux structure definida
- ✅ i18n module structure ready

---

## ARQUITECTURA CONFIRMADA

### Stack Tecnológico
```
Framework        → Remix (server + client)
State Mgmt       → Redux + Redux Persist
Styling          → CSS Tokens + inline styles
HTTP Layer       → axios + createServiceREST
Drag-Drop        → @dnd-kit/core (@dnd-kit/sortable)
i18n             → Custom module pattern
TypeScript       → Strict mode (no any types)
```

### Estructura de Carpetas (Nueva)

```
app/
├── server/
│   ├── kyc.tsx (NEW - HTTP layer)
│   ├── businessLogic/
│   │   └── kycBusinessLogic.tsx (NEW - business logic)
│   ├── bookings.tsx (MODIFICADO - multi-tour support)
│   └── bookingAvailability.tsx (NUEVO si requerido)
│
├── services/
│   ├── bookingService.ts (NEW - client-side service)
│   ├── paymentService.ts (NEW - payment client logic)
│   └── kycService.ts (NEW - KYC client logic)
│
├── components/
│   ├── bookings/
│   │   ├── CreateBookingModal.tsx (REFACTORIZADO)
│   │   ├── EditBookingModal.tsx (MEJORADO)
│   │   ├── BookingStatusModal.tsx (EXTENDIDO)
│   │   ├── MultiTourSelector.tsx (NEW)
│   │   └── TourWarningInline.tsx (NEW)
│   │
│   ├── profile/ (NEW folder)
│   │   ├── ProfileComponent.tsx (NEW)
│   │   └── KycSection.tsx (NEW)
│   │
│   └── payments/ (si necesario)
│       └── PaymentTimeline.tsx (NEW)
│
├── hooks/
│   ├── useAppCache.ts (REFACTORIZADO from useDropdownCache)
│   ├── useErrorHandler.ts (NEW)
│   └── useMultiTourValidation.ts (NEW)
│
├── store/
│   ├── slices/
│   │   ├── bookingsSlice.ts (MODIFICADO)
│   │   ├── paymentsSlice.ts (NEW)
│   │   ├── kycSlice.ts (NEW)
│   │   └── cancellationPoliciesSlice.ts (NEW)
│   └── index.ts (ACTUALIZADO)
│
├── lib/i18n/
│   ├── bookings/
│   │   ├── en.ts (EXTENDIDO)
│   │   └── es.ts (EXTENDIDO)
│   ├── payments/ (NEW)
│   │   ├── en.ts
│   │   └── es.ts
│   ├── kyc/ (NEW)
│   │   ├── en.ts
│   │   └── es.ts
│   └── errors/ (NEW)
│       ├── en.ts
│       └── es.ts
│
├── types/
│   ├── booking.ts (EXTENDIDO)
│   ├── payment.ts (NEW)
│   ├── kyc.ts (NEW)
│   └── cancellationPolicy.ts (NEW)
│
├── routes/
│   ├── profile._index.tsx (NEW)
│   └── _index.tsx (MODIFICADO - agregar links)
│
└── utilities/
    └── validationHelpers.ts (NEW - multi-tour validation)
```

### Decisiones Arquitectónicas

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Services Location** | `app/server/` | Consistency con pattern actual (kyc.tsx + kycBusinessLogic.tsx) |
| **Timestamps** | String "HH:MM" (timezone del país) | Backend maneja conversión, frontend display solo |
| **Drag-Drop** | @dnd-kit/core | Como ActivitiesByDay.tsx (closestCorners collision) |
| **Validation** | Frontend GET /api/tours/{id}/availability | Veloz + feedback inmediato al usuario |
| **Polling** | .env configurable (default 5s) | VITE_PAYMENT_POLLING_INTERVAL |
| **KYC Access** | role === 'owner' check | Privado; GET /api/kyc/status solo para owners |
| **Pagination** | Full tour objects en booking.tours[] | Frontend accede sin fetches adicionales |
| **Error Handling** | FetchError + useErrorHandler hook | Centralizado; Redux notifications |
| **State Mgmt** | Slices separados (Opción A) | Escalable; clear separation of concerns |

---

## ESPECIFICACIONES TÉCNICAS

### F1: Services Architecture Pattern

**HTTP Layer Pattern** (`app/server/kyc.tsx`):
```typescript
// Replicate from app/server/bookings.tsx pattern
import { createServiceREST } from './_index';

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

// Functions: getKycStatus, initKyc, updateKycData, etc.
// Each returns Promise<unknown>
// Each uses createServiceREST(BASE_URL, endpoint, token)
// Each includes error handling with extractApiError helper
// Each includes console.warn logging
```

**Business Logic Pattern** (`app/server/businessLogic/kycBusinessLogic.tsx`):
```typescript
// Replicate from app/server/businessLogic/bookingsBusinessLogic.tsx pattern
import { getKycStatus, initKyc } from '../kyc';

export interface KycStatusResponse {
  success: boolean;
  data?: KycStatus;
  error?: string;
}

export const getKycStatusBusiness = async (
  token: string,
  language = 'es'
): Promise<KycStatusResponse> => {
  try {
    const result = await getKycStatus(token, language);
    if (result.success === true && result.data !== undefined) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error ?? 'KYC error' };
  } catch (error) {
    console.error('Error in getKycStatusBusiness:', error);
    return { success: false, error: 'Unexpected error' };
  }
};

// One function per endpoint: initKycBusiness, updateKycBusiness, etc.
```

### F2: Tour Timestamps
```typescript
// Tours return times in format "HH:MM" (string)
// Example: startTime: "17:30", endTime: "12:00"
// Timezone: ALWAYS del país del tour (backend conversion)
// Frontend: DISPLAY ONLY (respeta timezone provided by backend)

// Validation logic for multi-tour same-day:
const validateSameDayMargin = (tours: BookingTour[]): { valid: boolean; warning?: string } => {
  const sortedTours = [...tours].sort((a, b) => {
    const aStart = parseTime(a.startTime); // "09:30" → minutes
    const bStart = parseTime(b.startTime);
    return aStart - bStart;
  });

  for (let i = 0; i < sortedTours.length - 1; i++) {
    const current = sortedTours[i];
    const next = sortedTours[i + 1];
    
    const currentEnd = parseTime(current.endTime);
    const nextStart = parseTime(next.startTime);
    const marginMinutes = nextStart - currentEnd;

    if (marginMinutes < 60) {
      return {
        valid: true, // NO bloqueamos, just warning
        warning: `Very tight schedule between tours: ${marginMinutes}min margin`
      };
    }
  }
  return { valid: true };
};
```

### F3: Drag-Drop Library (@dnd-kit)

**Pattern from ActivitiesByDay.tsx**:
```typescript
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Usage:
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  
  const oldIndex = tours.findIndex(t => t.id === active.id);
  const newIndex = tours.findIndex(t => t.id === over.id);
  
  const reorderedTours = arrayMove(tours, oldIndex, newIndex);
  // Call useMultiTourValidation(reorderedTours) to revalidate
  onTourReorder(reorderedTours);
};

// In JSX:
<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
  <SortableContext items={tours.map(t => t.id)} strategy={verticalListSortingStrategy}>
    {tours.map(tour => <TourItem key={tour.id} tour={tour} />)}
  </SortableContext>
  <DragOverlay>{activeId ? <TourItemPreview /> : null}</DragOverlay>
</DndContext>
```

### F4: Frontend Multi-Tour Validation

```typescript
// Call GET /api/tours/{id}/availability for each added tour
// On drag-drop reorder: re-validate all tours
// Validation: Check date overlap + 1h margin

const validateMultiTourAvailability = async (tours: BookingTour[]) => {
  const errors: Record<string, string> = {};
  
  for (const tour of tours) {
    try {
      const availability = await getTourAvailability(tour.id, tour.startDate);
      if (!availability.canCreateBooking) {
        errors[tour.id] = 'Tour not available on this date';
      }
    } catch (error) {
      errors[tour.id] = 'Error checking availability';
    }
  }

  // Check same-day margin validation
  const sameDayTours = groupBy(tours, t => t.startDate);
  for (const [date, dateTours] of Object.entries(sameDayTours)) {
    if (dateTours.length > 1) {
      const marginCheck = validateSameDayMargin(dateTours);
      if (marginCheck.warning && dateTours.some(t => !errors[t.id])) {
        // Show inline warning (not blocking)
        showWarning(marginCheck.warning);
      }
    }
  }

  return errors;
};
```

### F5: Polling Interval Configuration

**In .env.local**:
```env
VITE_PAYMENT_POLLING_INTERVAL=5000
```

**In Redux modal polling**:
```typescript
const pollingInterval = import.meta.env.VITE_PAYMENT_POLLING_INTERVAL 
  ? Number(import.meta.env.VITE_PAYMENT_POLLING_INTERVAL) 
  : 5000; // 5 seconds default

useEffect(() => {
  if (!isModalOpen) return;
  
  const timer = setInterval(async () => {
    const payment = await getBookingPaymentStatus(bookingId);
    if (payment.status === 'completed') {
      dispatch(updateBookingSuccess({ ...booking, status: 'paid' }));
      clearInterval(timer);
    }
  }, pollingInterval);

  return () => clearInterval(timer);
}, [isModalOpen, pollingInterval]);
```

### F6: KYC Endpoint - Permissions

**Backend responsibility** (pero frontend valida):
```typescript
// GET /api/kyc/status - PRIVATE (role === 'owner' only)
// Backend retorna 403 si no es owner

// Frontend check en loader:
export const loader = async ({ request, context }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const role = session.get('role'); // 'tourist' | 'owner' | 'admin'
  
  let kycStatus = null;
  if (role === 'owner' && token) {
    try {
      const result = await getKycStatusBusiness(token, language);
      if (result.success) {
        kycStatus = result.data;
      }
    } catch (error) {
      // Silently fail; UI checks for null
    }
  }

  return { kycStatus, role, ... };
};

// Frontend component checks:
if (!kycStatus && role === 'owner') {
  // Show CTA "Complete KYC"
}
```

### F7: Pagination - Multi-Tour Response

**Backend returns** (confirmado):
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "bk-001",
      "userId": "usr-001",
      "status": { "code": "pending_payment", "name_es": "Pendiente Pago", ... },
      "tours": [
        {
          "id": "tour-1",
          "name_es": "Tour Casco Antiguo",
          "startDate": "2026-05-20",
          "startTime": "09:30",
          "endTime": "12:00",
          "price": 150,
          "currency": "USD",
          ...full tour object...
        },
        {
          "id": "tour-2",
          "name_es": "Tour Cenotes",
          "startDate": "2026-05-20",
          "startTime": "14:00",
          "endTime": "17:30",
          "price": 120,
          "currency": "USD",
          ...full tour object...
        }
      ],
      "clients": [...],
      "totalPrice": 270,
      "paymentInfo": {...}
    }
  }
}
```

**Frontend treats tours as** (NO additional fetches):
```typescript
booking.tours.map(tour => (
  <TourCard key={tour.id} tour={tour} booking={booking} />
))
// All info available; no GET /api/tours/{id} needed
```

---

## SERVICIOS & BUSINESS LOGIC

### 1. app/server/kyc.tsx (HTTP Layer)

```typescript
/**
 * KYC Service - HTTP layer for KYC API
 * Follows exact pattern from bookings.tsx
 */

import { createServiceREST } from './_index';

interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}
interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL = (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

/**
 * Get KYC status for current owner
 */
export const getKycStatus = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: null };
  }

  try {
    const kycEndpoint = 'kyc/status';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);
    
    const result = await kycService.get({
      headers: { 'X-Language': language },
    });

    return result;
  } catch (error) {
    console.error('Error in getKycStatus:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Initialize KYC flow (returns Stripe Express dashboard URL)
 */
export const initKyc = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const kycEndpoint = 'kyc/init';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);
    
    const result = await kycService.create({}, {
      headers: { 'X-Language': language },
    });

    return result;
  } catch (error) {
    console.error('Error in initKyc:', error);
    return { error, success: false };
  }
};

/**
 * Get KYC dashboard URL (for viewing/updating KYC info)
 */
export const getKycDashboardUrl = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const kycEndpoint = 'kyc/dashboard-url';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);
    
    const result = await kycService.get({
      headers: { 'X-Language': language },
    });

    return result;
  } catch (error) {
    console.error('Error in getKycDashboardUrl:', error);
    return { error, success: false };
  }
};
```

### 2. app/server/businessLogic/kycBusinessLogic.tsx

```typescript
/**
 * KYC Business Logic - Business layer for KYC
 * Follows exact pattern from bookingsBusinessLogic.tsx
 */

import {
  getKycStatus,
  initKyc,
  getKycDashboardUrl,
} from '../kyc';

export interface KycStatusData {
  isRequired: boolean;
  isComplete: boolean;
  percentageComplete: number;
  stripeAccountId?: string;
  contactEmail?: string;
  requirementsNeeded?: string[];
  lastUpdated?: string;
}

export interface KycStatusResponse {
  success: boolean;
  data?: KycStatusData;
  error?: string;
}

export interface KycInitResponse {
  success: boolean;
  dashboardUrl?: string;
  error?: string;
}

/**
 * Get KYC status for current owner
 */
export const getKycStatusBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<KycStatusResponse> => {
  try {
    const result = (await getKycStatus(token ?? '', language)) as {
      success?: boolean;
      data?: KycStatusData;
      error?: unknown;
    };

    if (result.success === true && result.data !== undefined) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: language === 'en' ? 'Could not fetch KYC status' : 'No se pudo obtener estado KYC',
    };
  } catch (error) {
    console.error('Error in getKycStatusBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error loading KYC status' : 'Error al cargar estado KYC',
    };
  }
};

/**
 * Initialize KYC flow
 */
export const initKycBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<KycInitResponse> => {
  try {
    const result = (await initKyc(token ?? '', language)) as {
      success?: boolean;
      dashboardUrl?: string;
      error?: {
        message?: string;
        response?: { data?: { error?: string } };
      };
    };

    if (result.success === true && result.dashboardUrl !== undefined) {
      return { success: true, dashboardUrl: result.dashboardUrl };
    }

    let errorMessage = language === 'en' ? 'Could not initialize KYC' : 'No se pudo iniciar KYC';
    if (result.error?.response?.data?.error) {
      errorMessage = result.error.response.data.error;
    } else if (result.error?.message) {
      errorMessage = result.error.message;
    }

    return { success: false, error: errorMessage };
  } catch (error) {
    console.error('Error in initKycBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error initializing KYC' : 'Error al iniciar KYC',
    };
  }
};

/**
 * Get KYC dashboard URL for owner to view/update KYC info
 */
export const getKycDashboardUrlBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<KycInitResponse> => {
  try {
    const result = (await getKycDashboardUrl(token ?? '', language)) as {
      success?: boolean;
      dashboardUrl?: string;
      error?: { message?: string };
    };

    if (result.success === true && result.dashboardUrl !== undefined) {
      return { success: true, dashboardUrl: result.dashboardUrl };
    }

    return {
      success: false,
      error: language === 'en' ? 'Could not get KYC dashboard URL' : 'No se pudo obtener URL dashboard KYC',
    };
  } catch (error) {
    console.error('Error in getKycDashboardUrlBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error loading KYC dashboard' : 'Error al cargar dashboard KYC',
    };
  }
};
```

### 3. app/services/bookingService.ts (Client-side)

```typescript
/**
 * Client-side booking service
 * Handles multi-tour booking logic, NOT raw API calls
 */

import type { Booking, Client, BookingTour } from '~/types/booking';
import { validateSameDayMargin } from '~/utilities/validationHelpers';

export interface CreateMultiTourBookingInput {
  tours: Array<{ id: string; startDate: string }>;
  clients: Client[];
  specialRequests?: string;
  countryCode: string;
  currency: string;
}

export interface MultiTourValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

/**
 * Validate multiple tours for booking compatibility
 * Checks: availability + same-day margin
 */
export const validateMultiTourBooking = async (
  tours: BookingTour[],
  getTourAvailability: (tourId: string, date: string) => Promise<any>
): Promise<MultiTourValidationResult> => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // Check availability for each tour
  for (const tour of tours) {
    try {
      const availability = await getTourAvailability(tour.id, tour.startDate);
      if (!availability.canCreateBooking) {
        errors[tour.id] = `Tour not available on ${tour.startDate}`;
      }
    } catch (error) {
      errors[tour.id] = 'Error checking availability';
    }
  }

  // If any tour has availability error, fail early
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, warnings };
  }

  // Check same-day margin for tours on same date
  const toursByDate = new Map<string, BookingTour[]>();
  for (const tour of tours) {
    if (!toursByDate.has(tour.startDate)) {
      toursByDate.set(tour.startDate, []);
    }
    toursByDate.get(tour.startDate)!.push(tour);
  }

  for (const [, dateTours] of toursByDate) {
    if (dateTours.length > 1) {
      const marginCheck = validateSameDayMargin(dateTours);
      if (marginCheck.warning) {
        warnings.push(marginCheck.warning);
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Calculate total booking price
 */
export const calculateBookingTotal = (tours: BookingTour[]): number => {
  return tours.reduce((sum, tour) => sum + (tour.price ?? 0), 0);
};

/**
 * Calculate deposit amount (typically 30% or configurable)
 */
export const calculateDepositAmount = (total: number, depositPercentage = 0.3): number => {
  return Math.round(total * depositPercentage * 100) / 100;
};
```

### 4. app/services/paymentService.ts (Client-side)

```typescript
/**
 * Client-side payment service
 * Handles payment flow logic
 */

import type { Payment } from '~/types/booking';

export interface PaymentStatusCheckResult {
  status: 'pending' | 'completed' | 'failed' | 'error';
  lastUpdated: string;
  payment?: Payment;
}

/**
 * Poll payment status until completion or timeout
 */
export const pollPaymentStatus = async (
  bookingId: string,
  getPaymentStatus: (bookingId: string) => Promise<Payment>,
  options = { maxAttempts: 12, intervalMs: 5000 }
): Promise<PaymentStatusCheckResult> => {
  let attempts = 0;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      attempts++;

      try {
        const payment = await getPaymentStatus(bookingId);

        if (payment.status === 'completed' || payment.status === 'paid') {
          clearInterval(interval);
          resolve({
            status: 'completed',
            lastUpdated: new Date().toISOString(),
            payment,
          });
          return;
        }

        if (payment.status === 'failed') {
          clearInterval(interval);
          resolve({
            status: 'failed',
            lastUpdated: new Date().toISOString(),
            payment,
          });
          return;
        }

        if (attempts >= options.maxAttempts) {
          clearInterval(interval);
          resolve({
            status: 'pending',
            lastUpdated: new Date().toISOString(),
            payment,
          });
          return;
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        if (attempts >= options.maxAttempts) {
          clearInterval(interval);
          resolve({
            status: 'error',
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    }, options.intervalMs);
  });
};

/**
 * Format payment timeline events for display
 */
export const formatPaymentTimeline = (booking: any): PaymentTimeline[] => {
  const timeline: PaymentTimeline[] = [];

  // Deposit paid
  if (booking.depositPaid) {
    timeline.push({
      type: 'deposit_paid',
      date: booking.depositPaidAt,
      amount: booking.depositAmount,
      status: 'completed',
    });
  }

  // Final payment paid
  if (booking.finalPaymentPaid) {
    timeline.push({
      type: 'final_payment_paid',
      date: booking.finalPaymentPaidAt,
      amount: booking.finalPaymentAmount,
      status: 'completed',
    });
  }

  // Transfer to owner (if applicable)
  if (booking.transferredToOwner) {
    timeline.push({
      type: 'transferred_to_owner',
      date: booking.transferredAt,
      amount: booking.totalPrice,
      status: 'completed',
    });
  }

  return timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export interface PaymentTimeline {
  type: 'deposit_paid' | 'final_payment_paid' | 'transferred_to_owner' | 'refunded';
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
}
```

### 5. app/services/kycService.ts (Client-side)

```typescript
/**
 * Client-side KYC service
 * Handles KYC flow logic
 */

import type { KycStatusData } from '~/server/businessLogic/kycBusinessLogic';

/**
 * Determine if KYC is required based on booking amount or role
 */
export const isKycRequired = (role: string, bookingTotal: number, kycThreshold = 5000): boolean => {
  if (role !== 'owner') return false;
  return bookingTotal >= kycThreshold;
};

/**
 * Format KYC status for UI display
 */
export const formatKycStatus = (kycStatus: KycStatusData | null, language = 'es'): string => {
  if (!kycStatus) {
    return language === 'en' ? 'Not started' : 'No iniciado';
  }

  if (kycStatus.isComplete) {
    return language === 'en' ? 'Verified' : 'Verificado';
  }

  if (kycStatus.percentageComplete === 0) {
    return language === 'en' ? 'Not started' : 'No iniciado';
  }

  return language === 'en' 
    ? `${kycStatus.percentageComplete}% Complete`
    : `${kycStatus.percentageComplete}% Completado`;
};

/**
 * Get KYC requirements message
 */
export const getKycRequirementsMessage = (requirements: string[] | undefined, language = 'es'): string => {
  if (!requirements || requirements.length === 0) {
    return language === 'en' ? 'No requirements pending' : 'Sin requerimientos pendientes';
  }

  const items = requirements.map(req => {
    // Map backend requirement codes to user-friendly messages
    const requirementMap: Record<string, Record<string, string>> = {
      'personal_id': {
        'en': 'Personal ID',
        'es': 'Identificación Personal'
      },
      'business_info': {
        'en': 'Business Information',
        'es': 'Información del Negocio'
      },
      'bank_account': {
        'en': 'Bank Account',
        'es': 'Cuenta Bancaria'
      },
    };

    return requirementMap[req]?.[language] || req;
  });

  return items.join(', ');
};
```

---

## REDUX STATE SHAPE

### Current + New Slices

```typescript
// app/store/index.ts

import bookingsReducer from '~/store/slices/bookingsSlice';
import paymentsReducer from '~/store/slices/paymentsSlice';
import kycReducer from '~/store/slices/kycSlice';
import cancellationPoliciesReducer from '~/store/slices/cancellationPoliciesSlice';
// ... existing slices

export const store = configureStore({
  reducer: {
    bookings: bookingsReducer,
    payments: paymentsReducer,
    kyc: kycReducer,
    cancellationPolicies: cancellationPoliciesReducer,
    // ... existing slices
  },
  middleware: [...defaultMiddleware],
  persist: { version: 1 },
});
```

### 1. bookingsSlice.ts (MODIFICADO)

```typescript
export interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
}

const initialState: BookingState = {
  bookings: [],
  selectedBooking: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    fetchBookingsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBookingsSuccess(state, action: PayloadAction<{ bookings: Booking[]; total: number }>) {
      state.bookings = action.payload.bookings;
      state.totalCount = action.payload.total;
      state.loading = false;
    },
    fetchBookingsError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    addBooking(state, action: PayloadAction<Booking>) {
      state.bookings.unshift(action.payload);
      state.totalCount += 1;
    },
    updateBooking(state, action: PayloadAction<Booking>) {
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
      if (state.selectedBooking?.id === action.payload.id) {
        state.selectedBooking = action.payload;
      }
    },
    deleteBooking(state, action: PayloadAction<string>) {
      state.bookings = state.bookings.filter(b => b.id !== action.payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
    },
    setSelectedBooking(state, action: PayloadAction<Booking | null>) {
      state.selectedBooking = action.payload;
    },
    // NEW: updateMultiTourBooking with full validation
    updateMultiTourBooking(state, action: PayloadAction<{
      bookingId: string;
      tours: BookingTour[];
      validation?: { warnings: string[] };
    }>) {
      const booking = state.bookings.find(b => b.id === action.payload.bookingId);
      if (booking) {
        booking.tours = action.payload.tours;
        if (booking.tours.length > 0) {
          booking.totalPrice = booking.tours.reduce((sum, t) => sum + (t.price ?? 0), 0);
        }
      }
    },
  },
});

export const {
  fetchBookingsStart,
  fetchBookingsSuccess,
  fetchBookingsError,
  addBooking,
  updateBooking,
  deleteBooking,
  setSelectedBooking,
  updateMultiTourBooking,
} = bookingsSlice.actions;

export default bookingsSlice.reducer;
```

### 2. paymentsSlice.ts (NEW)

```typescript
export interface PaymentState {
  payments: Record<string, Payment>;
  pollingBookingIds: Set<string>;
  loading: boolean;
  error: string | null;
  lastPolledAt: Record<string, number>; // bookingId -> timestamp
}

const initialState: PaymentState = {
  payments: {},
  pollingBookingIds: new Set(),
  loading: false,
  error: null,
  lastPolledAt: {},
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    startPolling(state, action: PayloadAction<string>) {
      state.pollingBookingIds.add(action.payload);
    },
    stopPolling(state, action: PayloadAction<string>) {
      state.pollingBookingIds.delete(action.payload);
    },
    updatePaymentStatus(state, action: PayloadAction<{
      bookingId: string;
      payment: Payment;
    }>) {
      state.payments[action.payload.bookingId] = action.payload.payment;
      state.lastPolledAt[action.payload.bookingId] = Date.now();
    },
    paymentError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const {
  startPolling,
  stopPolling,
  updatePaymentStatus,
  paymentError,
} = paymentsSlice.actions;

export default paymentsSlice.reducer;
```

### 3. kycSlice.ts (NEW)

```typescript
import type { KycStatusData } from '~/server/businessLogic/kycBusinessLogic';

export interface KycState {
  status: KycStatusData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: KycState = {
  status: null,
  loading: false,
  error: null,
  lastFetched: null,
};

const kycSlice = createSlice({
  name: 'kyc',
  initialState,
  reducers: {
    fetchKycStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchKycSuccess(state, action: PayloadAction<KycStatusData>) {
      state.status = action.payload;
      state.loading = false;
      state.lastFetched = Date.now();
    },
    fetchKycError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    updateKycStatus(state, action: PayloadAction<KycStatusData>) {
      state.status = action.payload;
    },
  },
});

export const {
  fetchKycStart,
  fetchKycSuccess,
  fetchKycError,
  updateKycStatus,
} = kycSlice.actions;

export default kycSlice.reducer;
```

### 4. cancellationPoliciesSlice.ts (NEW)

```typescript
import type { CancellationPolicy } from '~/types/cancellationPolicy';

export interface CancellationPoliciesState {
  policies: CancellationPolicy[];
  loading: boolean;
  error: string | null;
}

const initialState: CancellationPoliciesState = {
  policies: [],
  loading: false,
  error: null,
};

const cancellationPoliciesSlice = createSlice({
  name: 'cancellationPolicies',
  initialState,
  reducers: {
    fetchPoliciesStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPoliciesSuccess(state, action: PayloadAction<CancellationPolicy[]>) {
      state.policies = action.payload;
      state.loading = false;
    },
    fetchPoliciesError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  fetchPoliciesStart,
  fetchPoliciesSuccess,
  fetchPoliciesError,
} = cancellationPoliciesSlice.actions;

export default cancellationPoliciesSlice.reducer;
```

---

## TIPOS TYPESCRIPT

### app/types/booking.ts (EXTENDIDO)

```typescript
export interface BookingTour {
  id: string;
  name_es: string;
  name_en: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM (backend provides timezone-adjusted)
  endTime: string;   // HH:MM
  price: number;
  currency: string;
  capacity: number;
  bookedSlots: number;
  description_es?: string;
  description_en?: string;
}

export interface Client {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  identificationType: string; // "passport" | "cedula" | "license"
  identificationNumber: string;
  nationality: string;
  dateOfBirth?: string;
}

export interface Booking {
  id: string;
  userId: string;
  tours: BookingTour[]; // MULTI-TOUR support
  clients: Client[];
  status: {
    code: string; // "pending_payment" | "confirmed" | "paid" | "partially_paid" | "cancelled"
    name_es: string;
    name_en: string;
    description_es?: string;
    description_en?: string;
  };
  confirmationCode: string;
  createdAt: string;
  startDate: string;  // First tour's date
  endDate: string;    // Last tour's date
  totalPrice: number;
  currency: string;
  specialRequests?: string;
  countryCode?: string;
  
  // Payment fields
  depositAmount?: number;
  depositPaid?: boolean;
  depositPaidAt?: string;
  finalPaymentAmount?: number;
  finalPaymentPaid?: boolean;
  finalPaymentPaidAt?: string;
  paymentIntentId?: string;
  
  // Cancellation
  cancellationRequestedAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'completed' | 'failed';
  cancellationPolicyId?: string;
}

export interface PayloadTourDataProps {
  countryCode: string;
  currency: string;
  city_id?: string;
  paymentMethods?: string[];
  minimumPayment?: number;
  source?: 'admin' | 'frontend';
}

// ... existing types remain
```

### app/types/payment.ts (NEW)

```typescript
export interface Payment {
  id: string;
  bookingId: string;
  type: 'deposit' | 'final' | 'full';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface PaymentCheckoutSession {
  url: string;
  sessionId: string;
  expiresAt: string;
}
```

### app/types/kyc.ts (NEW)

```typescript
export interface KycStatus {
  isRequired: boolean;
  isComplete: boolean;
  percentageComplete: number;
  stripeAccountId?: string;
  contactEmail?: string;
  requirementsNeeded?: string[];
  lastUpdated?: string;
}
```

### app/types/cancellationPolicy.ts (NEW)

```typescript
export interface CancellationPolicy {
  id: string;
  name_es: string;
  name_en: string;
  description_es?: string;
  description_en?: string;
  hoursBeforeTour: number; // e.g., 48 hours
  refundPercentage: number; // e.g., 0.80 for 80%
  isDefault: boolean;
}

export interface CancellationRefundCalculation {
  policyId: string;
  hoursTillTour: number;
  totalPrice: number;
  refundPercentage: number;
  refundAmount: number;
  isEligibleForRefund: boolean;
  reason?: string; // e.g., "Less than 48 hours before tour"
}
```

---

## COMPONENTES DETALLADOS

### 1. CreateBookingModal.tsx (REFACTORIZADO)

**Key Changes**:
- Add multi-tour support (array of tours instead of single tourId)
- Use MultiTourSelector sub-component for adding/removing/reordering tours
- Call validateMultiTourBooking instead of single tour validation
- Show inline warnings for same-day margin (not blocking)

**Props**:
```typescript
interface CreateBookingModalProps {
  isOpen: boolean;
  onSuccess?: (booking: Booking) => void;
  onClose?: () => void;
}
```

**State**:
```typescript
const [selectedTours, setSelectedTours] = useState<BookingTour[]>([]);
const [formError, setFormError] = useState<string>('');
const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
const [isValidating, setIsValidating] = useState(false);
```

**Flow**:
1. User adds first tour via TourSelector
2. Component calls getTourAvailability(tourId, startDate)
3. Display TourAvailabilityDisplay component
4. User adds more tours if needed via Add Another Tour button
5. MultiTourSelector shows all tours with drag-drop reordering
6. On drag-drop: call useMultiTourValidation hook to re-validate
7. Show inline warning if same-day margin < 1h
8. On submit: call createBookingBusiness with multi-tour payload

### 2. MultiTourSelector.tsx (NEW)

```typescript
interface MultiTourSelectorProps {
  tours: BookingTour[];
  onAddTour: () => void;
  onRemoveTour: (tourId: string) => void;
  onReorderTours: (reorderedTours: BookingTour[]) => void;
  onValidationChange: (result: MultiTourValidationResult) => void;
  warnings: string[];
  errors: Record<string, string>;
}

export function MultiTourSelector({
  tours,
  onAddTour,
  onRemoveTour,
  onReorderTours,
  onValidationChange,
  warnings,
  errors,
}: MultiTourSelectorProps): JSX.Element {
  const { language } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = tours.findIndex(t => t.id === active.id.toString());
    const newIndex = tours.findIndex(t => t.id === over.id.toString());

    const reorderedTours = arrayMove(tours, oldIndex, newIndex);
    onReorderTours(reorderedTours);

    // Re-validate after reordering
    await validateMultiTourBooking(reorderedTours, getTourAvailability)
      .then(onValidationChange);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tours.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tours.map((tour, index) => (
          <TourItem
            key={tour.id}
            tour={tour}
            index={index}
            isError={!!errors[tour.id]}
            errorMessage={errors[tour.id]}
            onRemove={() => onRemoveTour(tour.id)}
          />
        ))}
      </SortableContext>
      <DragOverlay>
        {activeId ? <TourItemOverlay /> : null}
      </DragOverlay>

      {warnings.length > 0 && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px' }}>
          {warnings.map((warning, idx) => (
            <div key={idx} style={{ fontSize: '12px', color: '#92400e' }}>
              ⚠ {warning}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddTour}
        style={{
          marginTop: '12px',
          padding: '10px 16px',
          backgroundColor: 'var(--color-primary-500)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {language === 'en' ? '+ Add Another Tour' : '+ Agregar Otro Tour'}
      </button>
    </DndContext>
  );
}
```

### 3. BookingStatusModal.tsx (EXTENDIDO)

**New Additions**:
- Timeline includes payment events (Deposit Paid, Final Payment Paid, Transferred)
- Show payment amounts for each event
- Display refund info if cancelled
- Polling logic for payment status updates

**New Timeline Events**:
```typescript
type TimelineEventType = 
  | 'booking_created' 
  | 'deposit_charged'
  | 'final_payment_charged' 
  | 'transferred_to_owner'
  | 'refund_initiated'
  | 'status_changed'
  | 'booking_cancelled';
```

### 4. ProfileComponent.tsx (NEW)

```typescript
interface ProfileComponentProps {}

export function ProfileComponent(): JSX.Element {
  const { language } = useTranslation();
  const kycStatus = useAppSelector(state => state.kyc.status);
  const role = useAppSelector(selectAuth).user?.role;

  if (role !== 'owner') {
    return <div>{language === 'en' ? 'Not available' : 'No disponible'}</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1>{language === 'en' ? 'Owner Profile' : 'Perfil del Propietario'}</h1>
      
      <KycSection kycStatus={kycStatus} />
    </div>
  );
}
```

### 5. KycSection.tsx (NEW)

```typescript
interface KycSectionProps {
  kycStatus: KycStatusData | null;
}

export function KycSection({ kycStatus }: KycSectionProps): JSX.Element {
  const { language } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const kycT = language === 'en' ? kycEn : kycEs;

  const handleInitKyc = async () => {
    dispatch(fetchKycStart());
    try {
      const result = await initKycBusiness(token, language);
      if (result.success && result.dashboardUrl) {
        window.open(result.dashboardUrl, '_blank');
      } else {
        dispatch(fetchKycError(result.error ?? 'Error'));
      }
    } catch (error) {
      dispatch(fetchKycError(error instanceof Error ? error.message : 'Error'));
    }
  };

  if (!kycStatus) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
        <p>{kycT.kycNotInitiated}</p>
        <button onClick={handleInitKyc}>
          {kycT.startKyc}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
      <div>{formatKycStatus(kycStatus, language)}</div>
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '12px' }}>{kycT.requirements}: {getKycRequirementsMessage(kycStatus.requirementsNeeded, language)}</div>
      </div>
      <button onClick={handleInitKyc} style={{ marginTop: '12px' }}>
        {kycT.updateKyc}
      </button>
    </div>
  );
}
```

---

## FLUJOS COMPLETOS

### Flujo 1: Crear Multi-Tour Booking

```
1. User clicks "New Booking" button
2. CreateBookingModal opens
3. User selects Tour 1, Date, Client(s)
4. Component calls GET /api/tours/tour-1/availability
5. TourAvailabilityDisplay shows availability
6. User clicks "Add Another Tour"
7. MultiTourSelector appears with Tour 1 listed
8. User selects Tour 2, different time same day
9. Component validates: 1h margin between end(Tour1) and start(Tour2)
10. If <1h margin: Show inline warning tooltip (not blocking)
11. User can drag-drop reorder tours
12. On reorder: Re-validate multi-tour margin
13. User fills special requests, reviews total price
14. User clicks "Create Booking"
15. Component validates via validateMultiTourBooking()
16. POST /api/bookings/multi-tour with full payload:
    {
      tours: [
        { id, startDate, startTime, endTime, price },
        { id, startDate, startTime, endTime, price }
      ],
      clients: [...],
      countryCode: "MX",
      currency: "USD"
    }
17. Backend creates booking with status "pending_payment"
18. Backend returns booking with depositAmount calculated
19. Redux: dispatch(addBooking(booking))
20. Component shows "Booking Created" toast
21. Redirect to BookingStatusModal for payment
```

### Flujo 2: Payment Flow (Deposit + Final)

```
1. Booking created with status "pending_payment"
2. BookingStatusModal opens (in booking details page)
3. Component dispatches: dispatch(startPolling(bookingId))
4. Polling starts: GET /api/bookings/{id}/payments every 5s (configurable via .env)
5. Payment status fetched; dispatch(updatePaymentStatus({ bookingId, payment }))
6. Timeline shows "Deposit Payment" event pending
7. User clicks "Pay Now" button
8. Frontend calls GET /api/bookings/{id}/checkout?type=deposit
9. Backend returns Stripe Checkout URL
10. redirect to Checkout URL (Stripe handles payment)
11. After payment: Stripe webhook → Backend updates payment status to "completed"
12. Polling detects status change
13. Redux: dispatch(updateBookingSuccess({ ...booking, status: "confirmed" }))
14. BookingStatusModal timeline updates automatically
15. Show "Deposit Paid" event in timeline with amount
16. Display remaining amount due and due date
17. When final payment time arrives:
    - Show "Final Payment Due" event
    - User clicks "Pay Final Amount"
    - Same flow as deposit (GET checkout URL, Stripe, webhook, polling)
18. After final payment: status → "paid"
19. Show "Transfer to Owner" event
20. If cancellation requested after <48h: Show calculated refund amount
```

### Flujo 3: Multi-Tour Cancellation with Refund Policy

```
1. Booking with multiple tours in progress/confirmed
2. User requests cancellation via EditBookingModal
3. Component calculates hours until FIRST tour starts
4. Component gets cancellation policy: 48h refund period at 80% refund
5. Calculation:
   - If hours > 48: refund = 100% (but policy shows 80%?)
   - If hours ≤ 48: Show toast warning "Cannot edit booking within 48 hours"
   - EditBookingModal is disabled
6. User goes to BookingStatusModal to request cancellation
7. Component shows "Request Cancellation" button (not in edit mode)
8. User enters cancellation reason
9. POST /api/bookings/{id}/cancel with reason
10. Backend calculates refund:
    - hoursTillFirstTour = calculateHours(now, firstTour.startTime)
    - if (hoursTillFirstTour >= policy.hoursBeforeTour):
        refundAmount = totalPrice * policy.refundPercentage
    - else: refundAmount = 0
11. Backend updates booking status to "cancelled"
12. Backend initiates refund via Stripe
13. Webhook: charge.refunded → Backend updates booking
14. Redux: dispatch(updateBookingSuccess({ bookingId, status: 'cancelled' }))
15. Timeline shows:
    - "Cancellation Requested" event with reason
    - "Refund Initiated" event with calculated amount
    - "Refund Completed" event when webhook confirms
16. Display refund breakdown:
    - Total Price: $270
    - Refund %: 80%
    - Refund Amount: $216
```

### Flujo 4: KYC Flow for Owner

```
1. Owner role detected in session
2. root.tsx loader calls getKycStatusBusiness(token)
3. Redux: dispatch(fetchKycSuccess(kycStatus))
4. If isComplete: Show "KYC Verified" badge, no action needed
5. If !isComplete:
   - Show KYC notification in dashboard
   - Show KYC section in profile page
6. User clicks "Complete KYC" or "Update KYC"
7. ProfileComponent calls initKycBusiness(token)
8. Backend generates Stripe Express dashboard URL
9. Frontend: window.open(dashboardUrl, '_blank')
10. Stripe Express handles KYC form (bank details, business info, personal ID)
11. User completes verification in Stripe
12. Webhook: account.updated → Backend updates kyc_status
13. User returns to frontend
14. User clicks "Refresh KYC Status" or auto-refresh on route
15. Frontend calls getKycStatusBusiness()
16. If isComplete: Show "KYC Verified ✓"
17. Show percentage complete + requirements fulfilled
```

---

## i18n STRINGS

### app/lib/i18n/bookings/{en|es}.ts (EXTENDIDO)

```typescript
// app/lib/i18n/bookings/es.ts
export const bookingEs = {
  // Existing strings...
  
  // Multi-tour new strings
  addAnotherTourButton: 'Agregar Otro Tour',
  removeFromBundleButton: 'Remover de Paquete',
  reorderToursMessage: 'Arrastra para reordenar tours en el mismo día',
  sameDayWarning: 'Horarios muy ajustados entre tours: {minutes} minutos de margen',
  sameDayMarginCritical: '⚠️ Menos de 1 hora entre tours - revisa bien los horarios',
  
  // Validation messages
  tourNotAvailable: 'Tour no disponible en esta fecha',
  multiTourValidationError: 'Error validando tours',
  
  // Timeline
  depositPaidEvent: 'Depósito Pagado',
  finalPaymentPaidEvent: 'Pago Final',
  transferredToOwnerEvent: 'Transferido al Propietario',
  refundInitiatedEvent: 'Reembolso Iniciado',
  refundCompletedEvent: 'Reembolso Completado',
};

// app/lib/i18n/bookings/en.ts
export const bookingEn = {
  // Existing strings...
  
  addAnotherTourButton: 'Add Another Tour',
  removeFromBundleButton: 'Remove from Bundle',
  reorderToursMessage: 'Drag to reorder tours on the same day',
  sameDayWarning: 'Very tight schedule between tours: {minutes} minutes margin',
  sameDayMarginCritical: '⚠️ Less than 1 hour between tours - check schedules carefully',
  
  tourNotAvailable: 'Tour not available on this date',
  multiTourValidationError: 'Error validating tours',
  
  depositPaidEvent: 'Deposit Paid',
  finalPaymentPaidEvent: 'Final Payment',
  transferredToOwnerEvent: 'Transferred to Owner',
  refundInitiatedEvent: 'Refund Initiated',
  refundCompletedEvent: 'Refund Completed',
};
```

### app/lib/i18n/payments/{en|es}.ts (NEW)

```typescript
// app/lib/i18n/payments/es.ts
export const paymentsEs = {
  paymentTitle: 'Pago de Reserva',
  depositAmount: 'Monto Depósito',
  finalPaymentAmount: 'Pago Final',
  totalAmount: 'Monto Total',
  payNowButton: 'Pagar Ahora',
  paymentPending: 'Pago Pendiente',
  paymentProcessing: 'Procesando Pago...',
  paymentCompleted: 'Pago Completado',
  paymentFailed: 'Error en Pago',
  paymentTimeline: 'Timeline de Pagos',
  depositDueDate: 'Vencimiento Depósito',
  finalPaymentDueDate: 'Vencimiento Pago Final',
  amountDue: 'Monto Adeudado',
  amountPaid: 'Monto Pagado',
  refundAmount: 'Monto Reembolso',
  refundStatus: 'Estado Reembolso',
  refundPending: 'Reembolso Pendiente',
  refundCompleted: 'Reembolso Completado',
};

// app/lib/i18n/payments/en.ts
export const paymentsEn = {
  paymentTitle: 'Booking Payment',
  depositAmount: 'Deposit Amount',
  finalPaymentAmount: 'Final Payment',
  totalAmount: 'Total Amount',
  payNowButton: 'Pay Now',
  paymentPending: 'Pending Payment',
  paymentProcessing: 'Processing Payment...',
  paymentCompleted: 'Payment Completed',
  paymentFailed: 'Payment Failed',
  paymentTimeline: 'Payment Timeline',
  depositDueDate: 'Deposit Due',
  finalPaymentDueDate: 'Final Payment Due',
  amountDue: 'Amount Due',
  amountPaid: 'Amount Paid',
  refundAmount: 'Refund Amount',
  refundStatus: 'Refund Status',
  refundPending: 'Refund Pending',
  refundCompleted: 'Refund Completed',
};
```

### app/lib/i18n/kyc/{en|es}.ts (NEW)

```typescript
// app/lib/i18n/kyc/es.ts
export const kycEs = {
  kycTitle: 'Verificación de Identidad',
  kycDescription: 'Completa tu información para recibir pagos',
  kycNotInitiated: 'Verificación no iniciada',
  kycInProgress: 'En progreso',
  kycVerified: 'Verificado ✓',
  startKyc: 'Iniciar Verificación',
  updateKyc: 'Actualizar KYC',
  refreshStatus: 'Actualizar Estado',
  requirements: 'Requerimientos',
  personalId: 'Identificación Personal',
  businessInfo: 'Información del Negocio',
  bankAccount: 'Cuenta Bancaria',
  percentageComplete: '{percentage}% Completado',
  kycRequired: 'Se requiere verificación de identidad para esta opción',
  kycRequired2: 'Se requiere KYC para reservas > ${amount}',
  verificationOpensNewTab: 'Se abrirá una nueva pestaña con el formulario de verificación',
};

// app/lib/i18n/kyc/en.ts
export const kycEn = {
  kycTitle: 'Identity Verification',
  kycDescription: 'Complete your information to receive payments',
  kycNotInitiated: 'Verification not started',
  kycInProgress: 'In progress',
  kycVerified: 'Verified ✓',
  startKyc: 'Start Verification',
  updateKyc: 'Update KYC',
  refreshStatus: 'Refresh Status',
  requirements: 'Requirements',
  personalId: 'Personal ID',
  businessInfo: 'Business Information',
  bankAccount: 'Bank Account',
  percentageComplete: '{percentage}% Complete',
  kycRequired: 'Identity verification required for this option',
  kycRequired2: 'KYC required for bookings > ${amount}',
  verificationOpensNewTab: 'Verification form will open in a new tab',
};
```

### app/lib/i18n/errors/{en|es}.ts (NEW)

```typescript
// app/lib/i18n/errors/es.ts
export const errorsEs = {
  fetchError: 'Error al obtener datos',
  createError: 'Error al crear',
  updateError: 'Error al actualizar',
  deleteError: 'Error al eliminar',
  networkError: 'Error de conexión',
  serverError: 'Error del servidor',
  validationError: 'Error de validación',
  notFound: 'No encontrado',
  unauthorized: 'No autorizado',
  forbidden: 'Acceso denegado',
  conflictError: 'Conflicto en los datos',
  retryButton: 'Reintentar',
  backButton: 'Volver',
  closeButton: 'Cerrar',
  fieldRequired: '{field} es requerido',
  invalidFormat: '{field} tiene formato inválido',
  minLength: '{field} debe tener al menos {min} caracteres',
  maxLength: '{field} no puede superar {max} caracteres',
};

// app/lib/i18n/errors/en.ts
export const errorsEn = {
  fetchError: 'Error fetching data',
  createError: 'Error creating',
  updateError: 'Error updating',
  deleteError: 'Error deleting',
  networkError: 'Network error',
  serverError: 'Server error',
  validationError: 'Validation error',
  notFound: 'Not found',
  unauthorized: 'Unauthorized',
  forbidden: 'Access denied',
  conflictError: 'Data conflict',
  retryButton: 'Retry',
  backButton: 'Back',
  closeButton: 'Close',
  fieldRequired: '{field} is required',
  invalidFormat: '{field} has invalid format',
  minLength: '{field} must have at least {min} characters',
  maxLength: '{field} cannot exceed {max} characters',
};
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (2h)
- [ ] Create new type files: payment.ts, kyc.ts, cancellationPolicy.ts
- [ ] Extend booking.ts with multi-tour fields
- [ ] Create app/server/kyc.tsx (HTTP layer, 50 lines)
- [ ] Create app/server/businessLogic/kycBusinessLogic.tsx (100 lines)
- [ ] Create Redux slices: paymentsSlice, kycSlice, cancellationPoliciesSlice
- [ ] Export all slices from store/index.ts

### Phase 2: Services & Utilities (3h)
- [ ] Create app/services/bookingService.ts (validation logic)
- [ ] Create app/services/paymentService.ts (payment polling logic)
- [ ] Create app/services/kycService.ts (KYC helpers)
- [ ] Create app/utilities/validationHelpers.ts (multi-tour validation)
- [ ] Create app/hooks/useErrorHandler.ts (centralized error handling)
- [ ] Create app/hooks/useMultiTourValidation.ts (validation + warnings)
- [ ] Refactor useDropdownCache to useAppCache.ts (if needed)

### Phase 3: i18n Modules (2h)
- [ ] Create app/lib/i18n/payments/{en,es}.ts
- [ ] Create app/lib/i18n/kyc/{en,es}.ts
- [ ] Create app/lib/i18n/errors/{en,es}.ts
- [ ] Update app/lib/i18n/bookings/{en,es}.ts with multi-tour strings
- [ ] Export all modules from app/lib/i18n/index.ts

### Phase 4: Components - Multi-Tour (6h)
- [ ] Refactor CreateBookingModal.tsx:
  - [ ] Add multi-tour state management
  - [ ] Add MultiTourSelector sub-component logic
  - [ ] Add validation flow
  - [ ] Add inline warnings for same-day margin
  - [ ] Update payload for multi-tour POST
- [ ] Create app/components/bookings/MultiTourSelector.tsx:
  - [ ] Implement @dnd-kit drag-drop (copy ActivitiesByDay pattern)
  - [ ] Add drag-drop revalidation
  - [ ] Show errors and warnings inline
- [ ] Create app/components/bookings/TourWarningInline.tsx:
  - [ ] Display inline warning tooltip
  - [ ] Style with red/amber colors

### Phase 5: Components - Status & Profile (5h)
- [ ] Extend BookingStatusModal.tsx:
  - [ ] Add payment timeline events
  - [ ] Implement polling logic (use .env VITE_PAYMENT_POLLING_INTERVAL)
  - [ ] Redux: startPolling/stopPolling dispatch
  - [ ] Show deposit + final payment events
  - [ ] Display refund info if cancelled
- [ ] Create app/routes/profile._index.tsx:
  - [ ] Route: `/profile`
  - [ ] Render ProfileComponent as Outlet
  - [ ] Loader: check role === 'owner', fetch KYC status
- [ ] Create app/components/profile/ProfileComponent.tsx:
  - [ ] Show owner profile info
  - [ ] Render KycSection
- [ ] Create app/components/profile/KycSection.tsx:
  - [ ] Show KYC status (0-100%)
  - [ ] "Start KYC" / "Update KYC" buttons
  - [ ] Call initKycBusiness, open Stripe Express in new tab
  - [ ] Display requirements list

### Phase 6: Modify Existing Components (3h)
- [ ] Update EditBookingModal.tsx:
  - [ ] Check policy 48h constraint
  - [ ] Show disabled state + toast warning if < 48h
  - [ ] Support multi-tour editing (same validation flow)
- [ ] Update root.tsx:
  - [ ] Add kycStatus to loader data (if role === 'owner')
  - [ ] Add cancellationPolicies to loader data
  - [ ] Optionally wrap with ErrorBoundary (Opción A)
- [ ] Update _index.tsx (dashboard):
  - [ ] Add link to profile page: `/profile`
  - [ ] Show KYC notification if pending

### Phase 7: Testing & Polish (4h)
- [ ] Test multi-tour creation flow end-to-end
- [ ] Test same-day validation + warnings
- [ ] Test drag-drop reordering
- [ ] Test payment polling (5s interval via .env)
- [ ] Test KYC flow (role check + new tab opening)
- [ ] Test cancellation with refund calculation
- [ ] Verify all i18n strings display correctly (ES/EN)
- [ ] Error handling: missing backend endpoint fallback
- [ ] Performance: benchmark Redux selectors

**Total Estimated Time**: 25 hours (experienced dev)

---

## INSTRUCCIONES PARA IMPLEMENTACIÓN

### Pre-requisitos
- [ ] Node 18+ installed
- [ ] pnpm >= 8.0.0
- [ ] Backend API running and tested
- [ ] Stripe Connect account configured
- [ ] @dnd-kit/core, @dnd-kit/sortable packages installed

### Installation
```bash
pnpm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Environment Variables
```env
# .env.local
VITE_BACKEND_URL=http://localhost:3000
VITE_PAYMENT_POLLING_INTERVAL=5000
```

### Code Organization
1. **Create files in this order**:
   - Types first (types/*.ts)
   - Redux slices (store/slices/*.ts)
   - Services (services/*.ts, server/*.tsx, server/businessLogic/*.tsx)
   - Hooks (hooks/*.ts)
   - i18n modules (lib/i18n/*/*.ts)
   - Components (components/**/*.tsx)
   - Routes (routes/*.tsx)

2. **Testing strategy**:
   - Unit test: validateMultiTourBooking() function
   - Integration: CreateBookingModal → serverAction → Redux
   - E2E: Full multi-tour flow in browser

3. **Deployment**:
   - No breaking changes to existing single-tour flow
   - New features are opt-in (multi-tour selector)
   - Backward compatible with current database

### Debugging Tips
- Check browser console for Redux actions log
- Check network tab for all API calls (especially polling in BookingStatusModal)
- Check localStorage for Redux persist state
- Use Redux DevTools to inspect state shape
- Verify .env variables loaded: `console.log(import.meta.env)`

### Rollback Plan
- If issues arise: revert last commit or branch to `main`
- Database changes: none (backward compatible)
- API changes: backward compatible with updated types

---

## PREGUNTAS CLAVE CONFIRMADAS ✅

Las siguientes decisiones han sido validadas y están listas para implementación:

| #  | Aspecto | Decisión | Confirmada |
|----|---------|----------|-----------|
| F1 | Services | app/server/kyc + businessLogic pattern | ✅ |
| F2 | Timestamps | String "HH:MM", timezone del país | ✅ |
| F3 | Drag-Drop | @dnd-kit/core como ActivitiesByDay | ✅ |
| F4 | Validation | Frontend GET /api/tours/{id}/availability | ✅ |
| F5 | Polling | .env configurable (default 5s) | ✅ |
| F6 | KYC Access | role === 'owner' only (private) | ✅ |
| F7 | Pagination | Full tour objects (booking.tours[]) | ✅ |

**Estado Final**: 100% CLARIDAD - Listo para implementación inmediata en Claude Opus 4.6

