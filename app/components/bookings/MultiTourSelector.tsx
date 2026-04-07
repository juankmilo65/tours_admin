/**
 * MultiTourSelector
 * Drag-and-drop multi-tour selection component for booking creation
 * Uses @dnd-kit/core pattern from ActivitiesByDay.tsx
 */

import type { JSX } from 'react';
import { useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEn, bookingEs } from '~/lib/i18n';
import { TourWarningInline } from './TourWarningInline';
import type { BookingTour } from '~/types/booking';

interface MultiTourSelectorProps {
  tours: BookingTour[];
  onRemoveTour: (tourId: string) => void;
  onReorderTours: (reorderedTours: BookingTour[]) => void;
  warnings: string[];
  errors: Record<string, string>;
}

/* ────── Sortable Tour Item ────── */

interface TourItemProps {
  tour: BookingTour;
  index: number;
  isError: boolean;
  errorMessage?: string;
  onRemove: () => void;
  language: string;
}

function SortableTourItem({
  tour,
  index,
  isError,
  errorMessage,
  onRemove,
  language,
}: TourItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tour.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: isError ? '#fef2f2' : '#ffffff',
    border: isError ? '1px solid #fca5a5' : '1px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const bookingT = language === 'en' ? bookingEn : bookingEs;

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '4px',
          color: '#9ca3af',
          flexShrink: 0,
        }}
        title={language === 'en' ? 'Drag to reorder' : 'Arrastra para reordenar'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>

      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary-500, #3b82f6)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>
          {language === 'en' ? tour.name_en : tour.name_es}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          {tour.startDate} · {tour.startTime} – {tour.endTime}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {tour.currency} {tour.price}
        </div>
        {isError && errorMessage !== undefined && errorMessage !== '' && (
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>{errorMessage}</div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          padding: '4px 8px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          flexShrink: 0,
        }}
      >
        {bookingT.removeFromBundleButton}
      </button>
    </div>
  );
}

/* ────── Drag Overlay Preview ────── */

function TourItemOverlay(): JSX.Element {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#eff6ff',
        border: '2px solid var(--color-primary-500, #3b82f6)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '14px',
        fontWeight: 600,
        color: '#1d4ed8',
      }}
    >
      Moving tour…
    </div>
  );
}

/* ────── Main Component ────── */

export function MultiTourSelector({
  tours,
  onRemoveTour,
  onReorderTours,
  warnings,
  errors,
}: MultiTourSelectorProps): JSX.Element {
  const { language } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const bookingT = language === 'en' ? bookingEn : bookingEs;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = tours.findIndex((t) => t.id === active.id.toString());
    const newIndex = tours.findIndex((t) => t.id === over.id.toString());

    const reorderedTours = arrayMove(tours, oldIndex, newIndex);
    onReorderTours(reorderedTours);
  };

  if (tours.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '14px' }}>
        {language === 'en'
          ? 'No tours added yet. Select a tour above and click "Add to Package".'
          : 'No hay tours agregados. Selecciona un tour arriba y haz clic en "Agregar al Paquete".'}
      </div>
    );
  }

  return (
    <div>
      {tours.length > 1 && (
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
          {bookingT.reorderToursMessage}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tours.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tours.map((tour, index) => (
            <SortableTourItem
              key={tour.id}
              tour={tour}
              index={index}
              isError={errors[tour.id] !== undefined && errors[tour.id] !== ''}
              errorMessage={errors[tour.id]}
              onRemove={() => onRemoveTour(tour.id)}
              language={language}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeId !== null && activeId !== '' ? <TourItemOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <TourWarningInline warnings={warnings} />
    </div>
  );
}
