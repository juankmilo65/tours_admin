# Terms and Conditions Implementation

## Overview
Complete implementation of terms and conditions flow for the registration page following existing project standards.

## Files Created/Modified

### 1. Created: `app/server/termsConditions.tsx`
- Service to fetch terms and conditions from backend API
- Follows the same pattern as other services (categories, cities, countries, etc.)
- Uses the `createServiceREST` wrapper for consistent error handling
- Endpoint: `/api/terms-conditions/type/{type}`
- Accepts `X-Language` header for localization

### 2. Modified: `app/lib/i18n/es.ts`
Added new translation keys:
- `auth.acceptTerms`: "Acepto los términos y condiciones"
- `auth.viewTerms`: "Ver términos y condiciones"
- `auth.termsTitle`: "Términos y Condiciones"
- `auth.acceptTermsButton`: "Aceptar"
- `auth.termsRequired`: "Debes aceptar los términos y condiciones"
- `auth.termsLoadingError`: "Error al cargar los términos y condiciones"

### 3. Modified: `app/lib/i18n/en.ts`
Added corresponding English translations for all keys.

### 4. Modified: `app/routes/register.tsx`

#### New State Variables
- `termsAccepted`: Boolean for checkbox state
- `showTermsModal`: Boolean to control modal visibility
- `termsData`: String to store terms content
- `termsTitle`: String to store terms title

#### New Effects
- Fetches terms and conditions on component mount using `getTermsConditions('registration', currentLang)`
- Refetches when language changes

#### New Functions
- `handleOpenTermsModal()`: Opens the terms modal
- `handleAcceptTermsFromModal()`: Accepts terms from modal, closes modal, checks checkbox

#### UI Changes
1. **Terms Checkbox** - Added below confirm password field:
   - Checkbox with label: "Acepto los términos y condiciones"
   - Link button: "Ver términos y condiciones" (opens modal)
   - Required field for form validation

2. **Terms Modal** - Custom modal implementation:
   - Full-screen overlay with semi-transparent background
   - Scrollable content area (max-height: 85vh)
   - Header with title
   - Content area with HTML rendering of terms
   - Footer with "Accept" button only (no close button)
   - Clicking "Accept" automatically checks the checkbox and closes modal
   - Hover effects on button

#### Form Validation
- Updated `isFormValid` to include `termsAccepted`
- Submit button disabled until all fields are valid AND terms are accepted

## Features

### ✅ Automatic Terms Fetching
- Terms are fetched on component mount
- Language-aware (refetches when language changes)
- Error handling with user-friendly message

### ✅ Checkbox with Link
- Checkbox to accept terms
- Link to view full terms in modal
- Both are part of the validation flow

### ✅ Modal Display
- Scrollable content for long terms
- No close button (must accept to proceed)
- "Accept" button that automatically checks the checkbox
- Clean, modern design matching existing UI

### ✅ Validation
- Form cannot be submitted without accepting terms
- Submit button disabled until all conditions met
- Clear visual feedback

## API Contract

### Request
```bash
GET http://localhost:3000/api/terms-conditions/type/registration
Headers:
  X-Language: es (or en)
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "string",
    "type": "registration",
    "title": "Términos y Condiciones",
    "content": "<p>HTML content of terms...</p>",
    "version": "1.0",
    "effectiveDate": "2024-01-01",
    "language": "es"
  }
}
```

## User Flow

1. User navigates to registration page
2. Terms are automatically fetched in background
3. User fills in registration form (name, email, passwords)
4. User sees checkbox: "Acepto los términos y condiciones"
5. User clicks "Ver términos y condiciones" link
6. Modal opens with full terms (scrollable if needed)
7. User reads terms
8. User clicks "Aceptar" button
   - Modal closes
   - Checkbox automatically gets checked
9. Submit button becomes enabled
10. User can complete registration

## Styling

The modal uses inline styles for simplicity and to match the existing CSS variable system:
- `var(--color-primary-500)`: Primary color
- `var(--color-primary-600)`: Primary hover color
- `var(--color-neutral-200)`: Border color
- `var(--color-neutral-500)`: Error text color
- `var(--color-neutral-700)`: Body text color
- `var(--color-neutral-900)`: Heading color

## Testing Checklist

- [ ] Terms load correctly on page mount
- [ ] Terms update when language changes
- [ ] Checkbox can be toggled manually
- [ ] "Ver términos" link opens modal
- [ ] Modal content is scrollable if needed
- [ ] Modal has no close button (X or ESC)
- [ ] "Aceptar" button closes modal and checks checkbox
- [ ] Form submission disabled without terms acceptance
- [ ] Form submission enabled when terms accepted
- [ ] Error handling when terms fail to load
- [ ] Responsive design on mobile devices

## Notes

- The modal implementation is inline (no separate component) to keep it simple and self-contained
- Uses `dangerouslySetInnerHTML` for terms content (assuming backend provides safe HTML)
- Modal z-index: 10000 to ensure it appears above everything else
- Modal is dismissible only by clicking "Accept" (per requirements)
- Terms are fetched using the same pattern as other API services in the project
