# Prompt Backend — Estados de la reserva y finalización de pago en efectivo

## Principio
El cambio de estados de la reserva lo hace **100% el backend**. El front NUNCA calcula ni setea estados intermedios: solo dispara señales (crear reserva, marcar pago en efectivo) y el backend avanza la máquina de estados.

## Máquina de estados
```
draft → requested → pending_payment → (anticipo pagado) → reservado
      → (saldo pagado: efectivo u online) → paid → pending_confirmation → confirmed
```

## Pagos ONLINE (anticipo y saldo online) — SIN CAMBIOS, sigue como está configurado
> ⚠️ **Este documento NO pide cambiar nada del flujo de pago con TARJETA / online.** Ese proceso ya está configurado y funcionando; debe seguir **exactamente como está hoy**. Lo único nuevo y manual es la finalización en EFECTIVO (sección siguiente). Lo de abajo se describe solo para dejar el reparto explícito.

- **Anticipo:** se cobra online por Stripe (payment link). Cuando Stripe confirma el pago (webhook), el backend avanza el estado **automáticamente**. Sin acción del front.
- **Saldo online** (`POST /api/bookings/:id/complete-payment`): igual — el backend confirma el pago y avanza los estados solo. El front no interviene en las transiciones.

**Confirmación pedida al backend:** que al elegir pago por tarjeta/online, el proceso siga **tal como está configurado hoy** — esto es solo para dejarlo explícito, NO para modificarlo.

## Pago en EFECTIVO — única acción manual del front
El efectivo no pasa por Stripe, así que no hay webhook. Un **ADMIN** o el **DUEÑO** de un tour de la reserva marca el saldo como pagado con un botón ("Finalizar pago en efectivo"), disponible solo cuando la reserva está en `reservado` o `partially_paid`.

El front envía SOLO la señal:
```
PATCH /api/bookings/:id/payment-status
Authorization: Bearer <JWT>
Body: { "status": "paid" }
```

El backend, al recibirla:
1. Registra un Payment: `payment_method="cash"`, `status="paid"`, `amount = precio del tour − anticipo` (pre-IVA), **sin fee** (el efectivo no toca Stripe).
2. Escribe el historial de la reserva.
3. Avanza el estado y sigue el flujo normal de confirmación: `paid → pending_confirmation → confirmed` — igual que un pago online. **Todo automático en el backend.**

El front NO manda `feeBreakdown` en efectivo (no hay comisión). El front NO hace ninguna transición de estado por su cuenta.

## Errores que el front maneja (ya implementados)
- **403** — el usuario logueado no es dueño de ningún tour de la reserva.
- **409** — no se puede liquidar en efectivo: ya se liquidó, ya existe un pago en efectivo, o hay un pago online del saldo en curso.
- **400** — estado inválido o no se pudo calcular el monto del saldo.
- **404** — reserva no encontrada.

## Resumen del reparto de responsabilidades
| Evento | Quién dispara | Quién cambia el estado |
|---|---|---|
| Anticipo pagado (online) | Stripe webhook | Backend (automático) |
| Saldo pagado online | Stripe webhook | Backend (automático) |
| Saldo pagado en efectivo | Front (botón → `PATCH payment-status`) | Backend (automático) |
