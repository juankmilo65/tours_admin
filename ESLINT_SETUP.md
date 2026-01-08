# ESLint Configuration Guide

## Overview

This project uses strict ESLint rules with automatic pre-commit validation to ensure code quality and consistency.

## Configuration Files

### 1. ESLint Configuration (`eslint.config.js`)

- Migrated to ESLint v9 flat config format
- Includes TypeScript, React, React Hooks, and Prettier plugins
- Enforces strict type safety and best practices

### 2. Lint-Staged Configuration (`.lintstagedrc.json`)

- Runs ESLint only on files in the `app/` directory
- Applies auto-fixes before validation
- Fails the commit if ESLint finds any errors or warnings
- Runs Prettier on all relevant file types

### 3. Pre-commit Hook (`.husky/pre-commit`)

- Automatically runs lint-staged before each commit
- Prevents commits with ESLint errors

## Strict Rules Applied

### TypeScript Rules (All set to 'error')

- `@typescript-eslint/no-explicit-any` - Disallows `any` type
- `@typescript-eslint/no-unsafe-assignment` - Disallows unsafe assignments
- `@typescript-eslint/no-unsafe-member-access` - Disallows unsafe member access
- `@typescript-eslint/no-unsafe-call` - Disallows unsafe function calls
- `@typescript-eslint/no-unsafe-return` - Disallows unsafe return values
- `@typescript-eslint/no-unsafe-argument` - Disallows unsafe arguments
- `@typescript-eslint/no-floating-promises` - Requires handling promises
- `@typescript-eslint/no-misused-promises` - Prevents promise misuse
- `@typescript-eslint/await-thenable` - Requires await on thenables
- `@typescript-eslint/no-unnecessary-type-assertion` - Disallows unnecessary type assertions
- `@typescript-eslint/prefer-nullish-coalescing` - Prefers `??` over `||`
- `@typescript-eslint/prefer-optional-chain` - Prefers optional chaining
- `@typescript-eslint/strict-boolean-expressions` - Requires explicit boolean expressions
- `@typescript-eslint/explicit-module-boundary-types` - Requires return types
- `@typescript-eslint/no-non-null-assertion` - Disallows non-null assertions
- `@typescript-eslint/no-throw-literal` - Disallows throwing non-Error objects
- `@typescript-eslint/consistent-type-assertions` - Enforces consistent type assertions
- `@typescript-eslint/consistent-type-imports` - Enforces type imports
- `@typescript-eslint/no-inferrable-types` - Disallows inferrable types

### React Hooks Rules

- `react-hooks/rules-of-hooks`: error
- `react-hooks/exhaustive-deps`: warn

### JavaScript/ESLint Rules

- `no-unused-vars`: error
- `no-debugger`: error
- `prefer-const`: error
- `no-var`: error
- `eqeqeq`: ['error', 'always']
- `no-empty`: error
- `no-eval`: error
- `no-implied-eval`: error
- `no-multi-spaces`: error
- `no-trailing-spaces`: error
- `no-unused-expressions`: error
- `no-sequences`: error
- `no-return-await`: error
- `require-await`: error

### Prettier

- `prettier/prettier`: error

## Test Files Override

Test files (`**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`) have more lenient rules:

- Most TypeScript errors are downgraded to warnings
- Still enforces React Hooks rules

## Available Commands

```bash
# Run ESLint on all files
pnpm lint

# Auto-fix ESLint errors
pnpm lint:fix

# Format with Prettier
pnpm format

# Check formatting without fixing
pnpm format:check

# Type check
pnpm typecheck
```

## Pre-commit Workflow

1. Stage files: `git add <files>`
2. Attempt commit: `git commit -m "message"`
3. Pre-commit hook automatically:
   - Runs `eslint --fix` on staged files
   - Runs `eslint --max-warnings 0` to validate
   - Runs `prettier --write` on all files
4. If ESLint finds errors or warnings:
   - Commit is blocked
   - Files are reverted to original state
   - You must fix errors before committing
5. If validation passes:
   - Commit succeeds
   - Auto-fixed changes are included

## Common Issues and Solutions

### 1. Missing Return Type Error

**Error**: `Missing return type on function`

**Solution**:

```typescript
// Before
function getData() {
  return { id: 1 };
}

// After
function getData(): { id: number } {
  return { id: 1 };
}
```

### 2. Explicit Any Error

**Error**: `Unexpected any. Specify a different type`

**Solution**:

```typescript
// Before
const data: any = fetchData();

// After - Define proper type
interface Data {
  id: number;
  name: string;
}
const data: Data = fetchData();
```

### 3. Unsafe Assignment Error

**Error**: `Unsafe assignment of an any value`

**Solution**:

```typescript
// Before
const result = (data as any).value;

// After - Type guard or proper typing
if (typeof data === 'object' && data !== null && 'value' in data) {
  const result = data.value;
}
```

### 4. Prefer Nullish Coalescing

**Error**: `Prefer using nullish coalescing operator (??)`

**Solution**:

```typescript
// Before
const value = input || 'default';

// After
const value = input ?? 'default';
```

### 5. Strict Boolean Expressions

**Error**: `Unexpected nullable string value in conditional`

**Solution**:

```typescript
// Before
if (input) {
  // do something
}

// After
if (input !== null && input !== undefined && input !== '') {
  // do something
}
```

## Best Practices

1. **Always specify return types** for functions
2. **Avoid `any` type** - use proper TypeScript types
3. **Handle promises explicitly** with async/await
4. **Use nullish coalescing (`??`)** instead of logical OR (`||`)
5. **Prefer optional chaining (`?.`)** for safe property access
6. **Define interfaces/types** for data structures
7. **Run `pnpm lint:fix`** before committing to auto-fix issues
8. **Review errors carefully** - don't just suppress them

## Project Status

Current ESLint errors in the project: **1,223** (as of latest pre-commit test)

These errors need to be fixed to pass pre-commit validation. Run:

```bash
pnpm lint:fix
pnpm format
```

Some errors may require manual fixes, especially:

- Type definitions for API responses
- Explicit return types
- Removal of `any` types
- Boolean expression improvements
