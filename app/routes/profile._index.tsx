/**
 * Profile Route - Owner Profile & KYC Verification
 */

import type { JSX } from 'react';
import { requireAuth } from '~/utilities/auth.loader';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { ProfileComponent } from '~/components/profile/ProfileComponent';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Profile(): JSX.Element {
  return <ProfileComponent />;
}
