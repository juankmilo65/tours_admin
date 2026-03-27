# CSS Architecture & Design Tokens

This document explains how to use the centralized CSS variables and utilities in the Tours Admin Dashboard.

## Philosophy

**NO CSS IN COMPONENTS**: All styling should use CSS variables from `tokens.css` or utility classes from `global.css`. Avoid hardcoding CSS values in JSX `style` props.

## Design Tokens (tokens.css)

All design tokens are defined as CSS custom properties (variables) in `app/styles/tokens.css`.

### Colors

```tsx
// ❌ BAD
<div style={{ color: '#10b981' }}>Active</div>

// ✅ GOOD
<div style={{ color: 'var(--color-success-500)' }}>Active</div>
```

### Spacing

```tsx
// ❌ BAD
<div style={{ padding: '16px', gap: '8px' }}>...</div>

// ✅ GOOD
<div style={{ padding: 'var(--space-4)', gap: 'var(--space-2)' }}>...</div>
```

### Typography

```tsx
// ❌ BAD
<span style={{ fontSize: '13px', fontWeight: 500 }}>Text</span>

// ✅ GOOD
<span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>Text</span>
```

### Border Radius

```tsx
// ❌ BAD
<div style={{ borderRadius: '8px' }}>...</div>

// ✅ GOOD
<div style={{ borderRadius: 'var(--radius-lg)' }}>...</div>
```

## Layout Utilities

### Flexbox

```tsx
// ❌ BAD
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
  ...
</div>

// ✅ GOOD
<div style={{ 
  display: 'var(--display-flex)', 
  flexDirection: 'var(--flex-direction-col)', 
  alignItems: 'var(--align-items-center)', 
  gap: 'var(--gap-4)' 
}}>
  ...
</div>
```

### Grid

```tsx
// ❌ BAD
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
  ...
</div>

// ✅ GOOD
<div style={{ 
  display: 'var(--display-grid)', 
  gridTemplateColumns: 'var(--grid-template-columns-auto)' 
}}>
  ...
</div>
```

## Component-Specific Tokens

### Search Input

```tsx
<div style={{ position: 'var(--position-relative)' }}>
  <div style={{ 
    position: 'var(--position-absolute)', 
    top: 0, 
    bottom: 0, 
    left: 0, 
    paddingLeft: 'var(--search-input-icon-padding)',
    display: 'var(--display-flex)',
    alignItems: 'var(--align-items-center)',
    pointerEvents: 'var(--pointer-events-none)'
  }}>
    <svg style={{ 
      height: 'var(--search-input-icon-size)', 
      width: 'var(--search-input-icon-size)' 
    }} />
  </div>
  <input 
    type="search" 
    style={{ paddingLeft: 'var(--search-input-text-padding)' }} 
  />
</div>
```

### Filter Container

```tsx
<div style={{ width: 'var(--filter-min-width)' }}>
  <Select />
</div>
```

### Empty State

```tsx
<div style={{ 
  display: 'var(--display-flex)', 
  flexDirection: 'var(--flex-direction-col)', 
  alignItems: 'var(--align-items-center)', 
  justifyContent: 'var(--justify-content-center)',
  padding: 'var(--empty-state-padding)',
  color: 'var(--color-neutral-500)'
}}>
  <svg style={{ width: 'var(--empty-state-icon-size)', height: 'var(--empty-state-icon-size)' }} />
  <p>...</p>
</div>
```

### Pagination

```tsx
<button style={{ 
  padding: 'var(--pagination-padding)', 
  borderRadius: 'var(--pagination-radius)', 
  fontSize: 'var(--pagination-font-size)' 
}}>
  1
</button>
```

### Image Thumbnail

```tsx
<img 
  style={{ 
    width: 'var(--thumb-size-md)', 
    height: 'var(--thumb-size-md)', 
    borderRadius: 'var(--thumb-radius)', 
    boxShadow: 'var(--thumb-shadow)',
    background: 'var(--thumb-bg)'
  }} 
/>
```

### File Upload Zone

```tsx
<div style={{ 
  border: 'var(--upload-zone-border-width) var(--upload-zone-border-style)', 
  borderColor: 'var(--color-neutral-300)',
  borderRadius: 'var(--upload-zone-radius)', 
  padding: 'var(--upload-zone-padding)', 
  textAlign: 'var(--text-align-center)', 
  cursor: 'var(--cursor-pointer)', 
  transition: 'all var(--upload-zone-transition)' 
}}>
  ...
</div>
```

### Modal Content

```tsx
<div style={{ padding: 'var(--modal-padding)' }}>
  <p style={{ 
    margin: 0, 
    fontWeight: 'var(--font-weight-medium)', 
    color: 'var(--color-neutral-900)', 
    marginBottom: 'var(--modal-title-margin-bottom)' 
  }}>
    Title
  </p>
</div>
```

### Checkbox

```tsx
<input 
  type="checkbox" 
  style={{ 
    width: 'var(--checkbox-size)', 
    height: 'var(--checkbox-size)', 
    cursor: 'var(--checkbox-cursor)', 
    accentColor: 'var(--checkbox-accent)' 
  }} 
/>
```

### Label

```tsx
<label style={{ 
  cursor: 'var(--label-cursor)', 
  fontSize: 'var(--label-font-size)', 
  fontWeight: 'var(--label-font-weight)', 
  color: 'var(--label-color)' 
}}>
  Label Text
</label>
```

### Grid Span

```tsx
<div style={{ gridColumn: 'var(--grid-span-full)' }}>
  ...
</div>
```

## Transitions

```tsx
// ❌ BAD
<div style={{ transition: 'all 0.2s ease-in-out' }}>...</div>

// ✅ GOOD
<div style={{ transition: 'all var(--transition-base)' }}>...</div>
```

## Common Patterns

### Center Content

```tsx
<div style={{ 
  display: 'var(--display-flex)', 
  alignItems: 'var(--align-items-center)', 
  justifyContent: 'var(--justify-content-center)' 
}}>
  ...
</div>
```

### Responsive Gap

```tsx
<div style={{ gap: 'var(--gap-4)' }}>
  ...
</div>
```

### Container with Full Width

```tsx
<div style={{ width: 'var(--w-full)' }}>
  ...
</div>
```

### Max Width Container

```tsx
<div style={{ maxWidth: 'var(--max-w-7xl)' }}>
  ...
</div>
```

## Best Practices

1. **Always use CSS variables** for colors, spacing, typography, etc.
2. **Never hardcode values** like `16px`, `#10b981`, etc.
3. **Use component-specific tokens** when available (e.g., `--search-input-height`)
4. **Keep style objects organized** by grouping related properties
5. **Use meaningful variable names** that describe the purpose, not just the value
6. **Refer to this file** when adding new styles to avoid duplication

## Migration Checklist

When migrating inline styles to CSS variables:

- [ ] Replace colors with `--color-*` variables
- [ ] Replace spacing with `--space-*` variables
- [ ] Replace font sizes with `--text-*` variables
- [ ] Replace font weights with `--font-weight-*` variables
- [ ] Replace border radius with `--radius-*` variables
- [ ] Replace display with `--display-*` variables
- [ ] Replace flex properties with `--flex-*` and `--align-*` variables
- [ ] Replace grid properties with `--grid-*` variables
- [ ] Replace positioning with `--position-*` variables
- [ ] Replace other common values with their corresponding variables

## Examples

See `app/routes/categories.tsx` for a complete example of a component that uses all these tokens correctly.