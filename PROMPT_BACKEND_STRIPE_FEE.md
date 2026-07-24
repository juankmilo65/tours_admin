# Prompt Backend — Comisión de Stripe (gross-up), IVA y precios

## Contexto
Plataforma de reservas de tours. Cada reserva se paga en dos partes:

- **Anticipo:** SIEMPRE online por Stripe (tarjeta / OXXO / SPEI). Es la ganancia de la plataforma.
- **Excedente / saldo:** va al dueño del tour. Se puede pagar en **efectivo** (en mano, en el punto de encuentro) o **online**.

El fee de procesamiento de Stripe en pagos **online** lo cubre el **cliente**. El backend debe cobrar de modo que, después de que Stripe descuenta su comisión, el neto que corresponde (el anticipo, o el saldo si se paga online) llegue **completo**. En efectivo NO hay fee (esa plata nunca pasa por Stripe).

## Fórmula (gross-up)
Para que llegue un neto `N` con tasa `r` y cargo fijo `f`:

```
bruto    = (N + f) / (1 − r)
comisión = bruto − N
```

⚠️ NO usar `N*(1+r) + f`: eso subcobra, porque Stripe aplica `r` sobre el **bruto** cobrado, no sobre `N`. Sobre $1,000 la diferencia es ~$1.40, sistemática en cada pago.

## Tasas (cuenta Stripe registrada en México, MXN)
| Método | Tasa `r` | Fijo `f` | Notas |
|---|---|---|---|
| Tarjeta local (mexicana) | 3.6% | $3 | |
| Tarjeta extranjera | 4.1% | $3 | 3.6% + 0.5% |
| Tarjeta extranjera + conversión de moneda | 6.1% | $3 | +2% cuando Stripe convierte divisa |
| OXXO | 4.0% | $3 | Solo MXN. Confirmación NO instantánea (voucher). Sin reembolsos parciales automáticos. |
| SPEI (transferencia) | **PENDIENTE** | — | Definir tarifa |

Ejemplos para netear **$1,000 MXN**: tarjeta local → bruto ≈ **$1,040.46** (comisión $40.46); OXXO → bruto ≈ **$1,044.79** (comisión $44.79).

## Contrato de payload: IVA y fee desglosados
El front, al crear, ELIGE el método y —para tarjeta— el tipo (nacional/extranjera) vía **radio button**, así calcula los valores REALES y manda el desglose. El front NO es la autoridad fiscal de la tasa/exención (eso lo valida y posee el backend), pero SÍ manda el desglose para que el backend concilie.

El front manda, para el monto que se cobra online:
```json
{
  "netAmount":   1000.00,   // neto, sin IVA ni fee
  "taxAmount":    160.00,   // IVA
  "taxRate":         0.16,
  "feeAmount":     46.43,   // fee ESTIMADO (gross-up — ver abajo)
  "totalAmount": 1206.43    // lo que se cobra al cliente = net + IVA + fee
}
```

El **backend**:
1. **Valida** `netAmount + taxAmount + feeAmount == totalAmount` (tolerancia de centavos) → el backend es la fuente de verdad y caza divergencias del front (ej. el Bug 3: mostraba total sin IVA, mandaba con IVA).
2. **Cobra** `totalAmount` a Stripe — un solo número, con IVA y fee adentro.
3. **Guarda** el desglose en el Payment: neto → `subtotal`, IVA → `taxAmount` / `taxRate`, fee aparte. (El modelo Payment ya tiene esas columnas.)
4. Manda el desglose a Stripe como **metadata** para control de impuestos.
5. **Post-pago**, sobrescribe el `feeAmount` estimado con el fee REAL de la `balance_transaction`, para que el registro cuadre al centavo.

⚠️ `feeAmount` debe ser el **gross-up** `(net+IVA+f)/(1−r) − (net+IVA)`, NO la suma naive `(net+IVA)*r + f`. Sobre net+IVA=1160: gross-up total = 1206.43, fee = 46.43 (no 48). El exacto lo confirma la `balance_transaction`; el front manda el estimado.

⚠️ El IVA (tasa y **exenciones** — consultar contador; algunos servicios turísticos tienen tratamiento especial) es de autoridad del backend. Para cobrarlo vía Stripe: **Stripe Tax** (requiere config + registro) o `tax_rates` / `tax_amount` explícitos. Un PaymentIntent pelado no desglosa impuestos solo — definir el mecanismo.

## Qué debe hacer el backend (links)
1. **Link del anticipo** (hoy nace en `POST /api/bookings/multi-tour`, se reenvía en `POST /api/bookings/:id/resend-payment-link`): cobrar el `totalAmount` grossed-up.
2. **Saldo online** (si se habilita el pago del excedente por Stripe): mismo contrato de payload y gross-up.
3. El **método real** y la conversión sólo se confirman al pagar → conciliar el fee con la `balance_transaction`.

## Efectivo (ya implementado en el front)
- `PATCH /api/bookings/:id/payment-status` body `{ "status": "paid" }` marca el saldo como pagado en efectivo.
- Backend: registra Payment con `payment_method="cash"`, `status="paid"`, `amount = precio del tour − anticipo` (pre-IVA); escribe el historial; avanza `paid → pending_confirmation → confirmed`. **Sin fee.**
- Errores que el front ya maneja: **403** (no dueño), **409** (ya liquidado / ya hay pago en efectivo / pago online del saldo en curso), **400** (estado inválido / no se pudo calcular saldo), **404** (no encontrada).

## Reporte
- `GET /reports/stripe-payments-breakdown` debe incluir en `summary` el campo **`cashCollected`** (efectivo cobrado de los tours propios del dueño), **separado** de `totalReceived` / `totalTransferredToOwners` / `platformEarnings`. El front ya lo consume y lo muestra como cifra aparte.

## Descuento de menores / edades (feature nueva)
El descuento por edad debe ser **real y parametrizable** (hoy el front lo muestra en single-tour pero NO lo envía, y no usa la edad):
- Cada cliente lleva su **edad**.
- Reglas de precio **parametrizables** (por tour, con default global): p. ej. menor de `X` = gratis (no cuenta como cliente que paga); menor de `Y` = `Z%` de descuento.
- El `qty` que multiplica el precio = clientes que **PAGAN** (excluyendo infantes gratis). El infante va en el booking pero no suma al contador.
- Reglas en el **backend** (parametrizables); el front las aplica/muestra.

## Preguntas abiertas
- Tarifa de **SPEI**.
- Confirmar: cargo online = **anticipo** (con su IVA de plataforma); excedente + su IVA = del dueño (aparte).
- Estrategia de gross-up cuando el método/conversión no se conocen hasta el pago (front lo fija con el radio nacional/extranjera; backend concilia con `balance_transaction`).
- **Mecanismo de IVA**: Stripe Tax vs `tax_amount` explícito. ¿Servicios exentos?
- **Reglas de descuento por edad**: umbrales y porcentajes, ¿por tour o globales?
