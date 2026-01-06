/**
 * Tour Edit Route
 * Route for editing a specific tour
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@remix-run/react';
import { TourEditForm } from '~/components/tours/TourEditForm';
import toursBL from '~/server/businessLogic/toursBusinessLogic';

export default function TourEditRoute() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(false);

  const handleSave = async (formData: FormData) => {
    try {
      const result = await toursBL(formData) as { success: boolean; data?: any; message?: string };
      
      if (result.success) {
        // Navigate back to tours list on success
        navigate('/tours');
      } else {
        throw new Error(result.message || 'Failed to save tour');
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/tours');
  };

  if (!id) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
          Tour Not Found
        </h2>
        <p style={{ color: 'var(--color-neutral-600)' }}>
          No tour ID provided
        </p>
      </div>
    );
  }

  return (
    <TourEditForm
      tourId={id}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
