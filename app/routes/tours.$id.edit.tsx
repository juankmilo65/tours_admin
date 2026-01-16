/**
 * Tour Edit Route
 * Route for editing a specific tour
 */

import React from 'react';
import { useNavigate, useParams, useLoaderData } from '@remix-run/react';
import { data, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { getTourById } from '~/server/tours';
import type { Tour } from '~/types/PayloadTourDataProps';
import { TourEditForm } from '~/components/tours/TourEditForm';

// Loader function - runs on server
export async function loader(args: LoaderFunctionArgs): Promise<ReturnType<typeof data>> {
  // Verificar autenticación
  await requireAuth(args);

  const { id } = args.params;
  const url = new URL(args.request.url);
  const language = url.searchParams.get('language') ?? 'es';
  const currency = url.searchParams.get('currency') ?? 'MXN';

  // Uncomment for debugging:
  // console.warn('🔍 [TOUR EDIT LOADER] Starting loader with params:', { id, language, currency, url: request.url });

  if (id === undefined) {
    console.error('❌ [TOUR EDIT LOADER] No tour ID provided');
    return data({ success: false, data: null, error: 'No tour ID provided' });
  }

  const result = await getTourById(id, language, currency);

  // Uncomment for debugging:
  // console.warn('📦 [TOUR EDIT LOADER] Result from getTourById:', JSON.stringify(result, null, 2));

  // Type guard for tour result
  const isTourResult = (
    tourResult: unknown
  ): tourResult is { success: boolean; data: Tour | null } =>
    typeof tourResult === 'object' &&
    tourResult !== null &&
    'success' in tourResult &&
    typeof (tourResult as { success?: boolean }).success === 'boolean' &&
    'data' in tourResult;

  if (isTourResult(result) && result.success === true) {
    return data(result);
  }

  console.error('❌ [TOUR EDIT LOADER] Failed to load tour. Result:', result);
  return data({ success: false, data: null });
}

export default function TourEditRoute(): React.JSX.Element {
  const rawLoaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Extracts actual Tour object from the loader response
  // The loader returns data() which wraps: { success: true, data: {...} }
  // We need to type cast to access the nested structure correctly
  const tourData: Tour | null = (() => {
    try {
      // Try different possible response structures
      const asWrapped = rawLoaderData as unknown as {
        type?: string;
        data?: { success: boolean; data: Tour | null };
      };

      const asDirect = rawLoaderData as unknown as {
        success?: boolean;
        data?: Tour | null;
      };

      // Check if it's wrapped by Remix's data() function
      if (asWrapped?.type === 'DataWithResponseInit') {
        if (asWrapped?.data?.success === true) {
          return asWrapped.data.data;
        }
      }

      // Fallback 1: try direct access with success property
      if (asDirect?.success === true && asDirect?.data !== undefined && asDirect?.data !== null) {
        return asDirect.data;
      }

      // Fallback 2: Maybe the data is directly in rawLoaderData.data
      if (
        asDirect?.data !== undefined &&
        asDirect?.data !== null &&
        typeof asDirect.data === 'object'
      ) {
        // Check if asDirect.data looks like a Tour object (has tour properties)
        const possibleTour = asDirect.data as Partial<Tour>;
        if (
          possibleTour?.id !== undefined ||
          possibleTour?.title_es !== undefined ||
          possibleTour?.title_en !== undefined
        ) {
          return possibleTour as Tour;
        }
      }

      console.error('[TOUR EDIT ROUTE] Could not extract tour data from loader');
      return null;
    } catch (error) {
      console.error('[TOUR EDIT ROUTE] Error extracting tour data:', error);
      return null;
    }
  })();

  const handleSave = (): Promise<void> => {
    // This will be called by TourEditForm AFTER successfully saving the tour
    navigate('/tours');
    return Promise.resolve();
  };

  const handleCancel = (): void => {
    navigate('/tours');
  };

  if (id === undefined) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Tour Not Found
        </h2>
        <p style={{ color: 'var(--color-neutral-600)' }}>No tour ID provided</p>
      </div>
    );
  }

  return (
    <TourEditForm
      tourId={id}
      initialTourData={tourData}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
