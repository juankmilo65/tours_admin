# Análisis de Migración CSS - app/routes/bookings.tsx

## Resumen
- **Total de estilos "quemados"**: 40 bloques de `style={{...}}`
- **Patrones identificados**: 15+ patrones repetidos
- **Prioridad de migración**: Alta (componente muy utilizado)

## Patrones de Estilos Identificados

### 1. Contenedores Flexbox (12 ocurrencias)
```tsx
// ❌ ACTUAL
<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

// ✅ DEBERÍA SER
<div style={{ display: 'var(--display-flex)', flexDirection: 'var(--flex-direction-col)', gap: 'var(--gap-1)' }}>
<div style={{ display: 'var(--display-flex)', alignItems: 'var(--align-items-center)', gap: 'var(--gap-1)' }}>
```

### 2. Botones de Iconos (8 ocurrencias)
```tsx
// ❌ ACTUAL
<button style={{ width: 38, height: 38, borderRadius: 'var(--radius-lg, 10px)', ... }}>
<button style={{ width: 38, height: 38, borderRadius: 10px, ... }}>

// ✅ DEBERÍA SER
<button style={{ width: 'var(--icon-btn-size)', height: 'var(--icon-btn-size)', borderRadius: 'var(--icon-btn-radius)', ... }}>
```

### 3. Grid Layouts (4 ocurrencias)
```tsx
// ❌ ACTUAL
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>

// ✅ DEBERÍA SER
<div style={{ display: 'var(--display-grid)', gridTemplateColumns: 'var(--grid-template-columns-4)', gap: 'var(--gap-3)' }}>
```

### 4. Inputs de Fecha (3 ocurrencias)
```tsx
// ❌ ACTUAL
<input style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#111827', height: '40px' }}>

// ✅ DEBERÍA SER
<input style={{ width: 'var(--w-full)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-neutral-300)', fontSize: 'var(--text-sm)', color: 'var(--color-neutral-900)', height: '40px' }}>
```

### 5. Badges de Estado (10+ ocurrencias)
```tsx
// ❌ ACTUAL
<span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: colors.bg, color: colors.text, width: 'fit-content' }}>

// ✅ DEBERÍA SER (necesita nueva variable)
<span style={{ display: 'var(--display-inline-flex)', alignItems: 'var(--align-items-center)', gap: 'var(--gap-1)', padding: 'var(--badge-padding)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', backgroundColor: colors.bg, color: colors.text, width: 'var(--w-fit)' }}>
```

### 6. Labels (8 ocurrencias)
```tsx
// ❌ ACTUAL
<label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>

// ✅ DEBERÍA SER (ya está bien, pero puede simplificarse)
<label style={{ display: 'var(--display-block)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--label-color)', marginBottom: 'var(--space-1)' }}>
```

### 7. Texto con Tipografía (15+ ocurrencias)
```tsx
// ❌ ACTUAL
<div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', maxWidth: 200 }}>
<div style={{ fontSize: '0.8rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
<div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>

// ✅ DEBERÍA SER
<div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-neutral-900)', maxWidth: 'var(--max-w-xs)' }}>
<div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)', whiteSpace: 'var(--whitespace-nowrap)' }}>
<div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-neutral-400)', textTransform: 'var(--text-transform-uppercase)', letterSpacing: '0.04em' }}>
```

### 8. Colores "quemados" (20+ ocurrencias)
```tsx
// ❌ ACTUAL
backgroundColor: '#fef9c3'
color: '#a16207'
color: '#111827'
color: '#6b7280'
border: '1px solid #d1d5db'
backgroundColor: '#f3f4f6'

// ✅ DEBERÍA SER
backgroundColor: 'var(--color-warning-50)'
color: 'var(--color-warning-700)'
color: 'var(--color-neutral-900)'
color: 'var(--color-neutral-500)'
border: '1px solid var(--color-neutral-300)'
backgroundColor: 'var(--color-neutral-100)'
```

## Variables CSS Faltantes

Basado en el análisis, necesitamos agregar estas variables a `tokens.css`:

```css
/* Badge Styles */
--badge-padding: 3px 10px;
--badge-font-size: 0.7rem;
--badge-font-weight: 600;
--badge-display: inline-flex;
--badge-align-items: center;
--badge-border-radius: 9999px;

/* Text Transform */
--text-transform-uppercase: uppercase;
--text-transform-lowercase: lowercase;
--text-transform-capitalize: capitalize;

/* White Space */
--whitespace-nowrap: nowrap;
--whitespace-pre: pre;
--whitespace-pre-wrap: pre-wrap;

/* Inline Flex */
--display-inline-flex: inline-flex;

/* Gap Small */
--gap-tiny: 4px;
--gap-small: 5px;
```

## Plan de Migración

### Fase 1: Variables CSS Faltantes
1. Agregar variables faltantes a `tokens.css`
2. Actualizar `README.md` con nuevos ejemplos

### Fase 2: Migración por Secciones
1. **Sección de Columnas de Tabla** (líneas 350-600)
   - Migrar todos los estilos de render functions
   - Prioridad: Alta (más código duplicado)

2. **Sección de Filtros** (líneas 650-850)
   - Migrar contenedores y layouts
   - Prioridad: Alta

3. **Sección de Inputs de Fecha** (líneas 750-800)
   - Migrar inputs con estilos repetidos
   - Prioridad: Media

4. **Sección de Botones de Acción** (líneas 550-650)
   - Migrar botones de iconos
   - Prioridad: Media

### Fase 3: Validación
1. Verificar que no hay errores de TypeScript
2. Compilar el proyecto
3. Verificar visualmente que el diseño no cambió

## Estimación de Tiempo

- Fase 1: 15 minutos
- Fase 2: 45-60 minutos
- Fase 3: 15 minutos
- **Total**: 1.5 - 2 horas

## Beneficios de la Migración

1. **Mantenimiento**: Cambios de diseño en un solo lugar
2. **Consistencia**: Mismo estilo en toda la aplicación
3. **Tamaño de código**: Reducción de ~200-300 líneas de código repetido
4. **Performance**: Variables CSS son más eficientes
5. **Accesibilidad**: Mejores prácticas de CSS

## Riesgos y Mitigaciones

1. **Riesgo**: Errores de TypeScript con variables CSS
   - **Mitigación**: Usar `as const` donde sea necesario

2. **Riesgo**: Cambios visuales sutiles
   - **Mitigación**: Verificar cuidadosamente cada migración

3. **Riesgo**: Tiempo de desarrollo
   - **Mitigación**: Hacer migración incremental por secciones