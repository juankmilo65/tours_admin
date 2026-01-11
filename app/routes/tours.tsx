/**
 * Tours Layout
 * Parent layout for all tours routes
 */

import type { JSX } from 'react';
import { Outlet } from '@remix-run/react';

export default function ToursLayout(): JSX.Element {
  // This is a layout component that wraps all /tours/* routes
  // The actual tour list is in tours._index.tsx
  // The edit form is in tours.$id.edit.tsx
  return <Outlet />;
}
