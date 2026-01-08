# Redux Store Architecture

## Overview

Centralized state management using Redux Toolkit for the Tours Admin application.

## Structure

```
store/
├── index.ts          # Store configuration and types
├── hooks.ts          # Typed Redux hooks
└── slices/
    ├── citiesSlice.ts
    ├── toursSlice.ts
    ├── authSlice.ts
    └── ...
```

## Key Features

### 1. **Redux Toolkit**

- Modern Redux with simplified setup
- Built-in Immer for immutable state updates
- Automatic action type generation

### 2. **Persistence**

- Redux-persist for automatic state persistence
- SSR-safe storage that works on both client and server
- Configurable whitelist/blacklist for what to persist

### 3. **TypeScript Support**

- Fully typed store, actions, and selectors
- Type-safe hooks: `useAppDispatch` and `useAppSelector`

## Usage

### Store Setup

The store is configured in `entry.client.tsx` with:

- Redux Provider wrapper
- PersistGate for hydration
- SSR-safe configuration

### Creating Slices

```typescript
// slices/exampleSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  data: string[];
  loading: boolean;
}

const exampleSlice = createSlice({
  name: 'example',
  initialState: { data: [], loading: false } as ExampleState,
  reducers: {
    setData: (state, action: PayloadAction<string[]>) => {
      state.data = action.payload;
    },
  },
});

export const { setData } = exampleSlice.actions;
export default exampleSlice.reducer;

// Persistence config (optional)
export const persistExample = {
  key: 'example',
  storage,
  whitelist: ['data'],
};
```

### Using in Components

```typescript
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectCities, fetchCitiesSuccess } from '~/store/slices/citiesSlice';

function MyComponent() {
  const cities = useAppSelector(selectCities);
  const dispatch = useAppDispatch();

  // Use state and dispatch actions
  return <div>...</div>;
}
```

### Store Configuration

```typescript
// store/index.ts
const rootReducer = combineReducers({
  city: citiesReducer,
  // other reducers...
});

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Required for redux-persist
        immutableCheck: false,
      }),
  });
```

## Best Practices

1. **Slice Organization**: Keep related state in single slices
2. **Selector Usage**: Use typed selectors instead of inline selectors
3. **Action Naming**: Use descriptive action names (e.g., `fetchCitiesSuccess`)
4. **Persistence**: Only persist necessary state to avoid bloat

## Current Slices

- **citiesSlice**: Manages cities data
- **toursSlice**: (Coming soon)
- **authSlice**: (Coming soon)
- **usersSlice**: (Coming soon)
