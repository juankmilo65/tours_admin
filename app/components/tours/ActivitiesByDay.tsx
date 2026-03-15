/**
 * Activities By Day Component
 * Manages activities grouped by day with drag and drop functionality
 */

import React, { useState, useEffect } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TourDay, TourActivity } from '~/types/PayloadTourDataProps';
import Select from '~/components/ui/Select';

// Generate time options for the Select component (matching API format: "HH:MM AM/PM")
const TIME_OPTIONS = (() => {
  const options: Array<{ value: string; label: string }> = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const mm = m.toString().padStart(2, '0');
      const period = h < 12 ? 'AM' : 'PM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH.toString().padStart(2, '0')}:${mm} ${period}`;
      options.push({
        value: label,
        label,
      });
    }
  }
  return options;
})();

interface ActivitiesByDayTranslations {
  activitiesByDay: string;
  addDay: string;
  noDaysAdded: string;
  noDaysDescription: string;
  dayLabel: string;
  removeDay: string;
  addActivity: string;
  selectActivity: string;
  noActivitiesInDay: string;
  timeLabel: string;
}

interface ActivitiesByDayProps {
  days: TourDay[];
  availableActivities: TourActivity[];
  onDaysChange: (days: TourDay[]) => void;
  onActivityTimeChange: (dayIndex: number, activityId: string, time: string) => void;
  onRemoveActivity: (dayIndex: number, activityId: string) => void;
  onAddDay: () => void;
  onRemoveDay: (dayIndex: number) => void;
  translations: ActivitiesByDayTranslations;
}

// Individual Activity Item with Drag & Drop
function ActivityItem({
  activity,
  time,
  usedTimes,
  timeLabel,
  onTimeChange,
  onRemove,
}: {
  activity: TourActivity;
  time: string;
  usedTimes: string[];
  timeLabel: string;
  onTimeChange: (time: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className="activity-item"
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: 'var(--color-neutral-50)',
        border: '1px solid var(--color-neutral-200)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '8px',
        cursor: 'grab',
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab', fontSize: '18px' }}>
        ⋮⋮
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '4px' }}>
          {activity.activity}
        </div>
        <div style={{ maxWidth: '160px' }}>
          <Select
            options={TIME_OPTIONS.filter(
              (opt) => opt.value === time || !usedTimes.includes(opt.value)
            )}
            value={time}
            onChange={(val) => onTimeChange(val)}
            placeholder={timeLabel}
            id={`activity-time-${activity.id}`}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        style={{
          padding: '6px 12px',
          backgroundColor: 'var(--color-error-50)',
          color: 'var(--color-error-600)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: 'var(--text-sm)',
        }}
      >
        ✕
      </button>
    </div>
  );
}

// Day Group Component
function DayGroup({
  day,
  availableActivities,
  translations,
  onAddActivity,
  onTimeChange,
  onRemoveActivity,
  onRemoveDay,
  onDragEnd,
}: {
  day: TourDay;
  availableActivities: TourActivity[];
  translations: ActivitiesByDayTranslations;
  onAddActivity: (activity: TourActivity) => void;
  onTimeChange: (activityId: string, time: string) => void;
  onRemoveActivity: (activityId: string) => void;
  onRemoveDay: () => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  void onDragEnd;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `day-${day.day}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Track times for activities
  const [activityTimes, setActivityTimes] = useState<Record<string, string>>(() => {
    const times: Record<string, string> = {};
    day.activities.forEach((a) => {
      if (a.id) times[a.id] = a.hora ?? '09:00 AM';
    });
    return times;
  });

  // Derive effective times: ensures new activities get a unique time
  const getEffectiveTimes = (): Record<string, string> => {
    const effective: Record<string, string> = {};
    const used: string[] = [];

    // First pass: assign known times from state
    for (const a of day.activities) {
      const t = activityTimes[a.id];
      if (t !== undefined) {
        effective[a.id] = t;
        used.push(t);
      }
    }

    // Second pass: assign first available time for any activity not yet tracked
    for (const a of day.activities) {
      if (effective[a.id] === undefined) {
        const firstAvailable = TIME_OPTIONS.find((opt) => !used.includes(opt.value));
        const newTime = firstAvailable?.value ?? '12:00 AM';
        effective[a.id] = newTime;
        used.push(newTime);
      }
    }

    return effective;
  };

  const effectiveTimes = getEffectiveTimes();

  // Sync new activities into activityTimes state when they appear
  useEffect(() => {
    const newEntries: Record<string, string> = {};
    let hasNew = false;
    for (const a of day.activities) {
      if (activityTimes[a.id] === undefined) {
        newEntries[a.id] = effectiveTimes[a.id] ?? '12:00 AM';
        hasNew = true;
      }
    }
    if (hasNew) {
      setActivityTimes((prev) => ({ ...prev, ...newEntries }));
      // Propagate assigned times up
      for (const [id, time] of Object.entries(newEntries)) {
        onTimeChange(id, time);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.activities.length]);

  const handleTimeChange = (activityId: string, time: string) => {
    setActivityTimes((prev) => ({ ...prev, [activityId]: time }));
    onTimeChange(activityId, time);
  };

  // Get activities not already in this day
  const unusedActivities = availableActivities.filter(
    (a) => !day.activities.some((da) => da.id === a.id)
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: 'var(--color-white)',
        border: '2px solid var(--color-primary-200)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab', marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary-700)',
            }}
          >
            📅 {translations.dayLabel} {day.day}
          </h3>
          <button
            type="button"
            onClick={onRemoveDay}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--color-error-50)',
              color: 'var(--color-error-600)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
            }}
          >
            {translations.removeDay}
          </button>
        </div>
      </div>

      {/* Add Activity */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: '8px',
          }}
        >
          {translations.addActivity}
        </label>
        <Select
          options={[
            { value: '', label: translations.selectActivity },
            ...unusedActivities.map((activity) => ({
              value: activity.id,
              label: activity.activity,
            })),
          ]}
          value=""
          onChange={(val) => {
            if (val !== '') {
              const activity = availableActivities.find((a) => a.id === val);
              if (activity) {
                onAddActivity(activity);
              }
            }
          }}
          placeholder={translations.selectActivity}
          id={`add-activity-day-${day.day}`}
        />
      </div>

      {/* Activities List */}
      <SortableContext
        items={day.activities.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        {day.activities.map((activity) => {
          // Collect times used by OTHER activities in the same day
          const usedTimes = day.activities
            .filter((a) => a.id !== activity.id)
            .map((a) => effectiveTimes[a.id] ?? '09:00 AM');
          return (
            <ActivityItem
              key={activity.id}
              activity={activity}
              time={effectiveTimes[activity.id] ?? '09:00 AM'}
              usedTimes={usedTimes}
              timeLabel={translations.timeLabel}
              onTimeChange={(time) => handleTimeChange(activity.id, time)}
              onRemove={() => onRemoveActivity(activity.id)}
            />
          );
        })}
      </SortableContext>

      {day.activities.length === 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--color-neutral-500)',
            fontSize: 'var(--text-sm)',
            backgroundColor: 'var(--color-neutral-50)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {translations.noActivitiesInDay}
        </div>
      )}
    </div>
  );
}

// Main Component
export function ActivitiesByDay({
  days,
  availableActivities,
  onDaysChange,
  onActivityTimeChange,
  onAddDay,
  onRemoveDay,
  translations,
}: ActivitiesByDayProps): React.JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Handle dragging activities within the same day
    const activeDayIndex = days.findIndex((d) => d.activities.some((a) => a.id === activeId));
    const overDayIndex = days.findIndex((d) => d.activities.some((a) => a.id === overId));

    if (activeDayIndex === -1 || overDayIndex === -1) return;

    const activeDay = days[activeDayIndex];
    const overDay = days[overDayIndex];

    if (!activeDay || !overDay) return;

    const activeActivity = activeDay.activities.find((a) => a.id === activeId);
    if (!activeActivity) return;

    // Moving within the same day
    if (activeDayIndex === overDayIndex) {
      const oldIndex = activeDay.activities.findIndex((a) => a.id === activeId);
      const newIndex = overDay.activities.findIndex((a) => a.id === overId);

      const newDays = [...days];
      newDays[activeDayIndex] = {
        ...activeDay,
        activities: arrayMove(activeDay.activities, oldIndex, newIndex),
      };
      onDaysChange(newDays);
    }
  };

  const handleAddActivity = (dayIndex: number) => (activity: TourActivity) => {
    const newDays = [...days];
    const currentDay = newDays[dayIndex];
    if (!currentDay) return;

    newDays[dayIndex] = {
      ...currentDay,
      activities: [
        ...currentDay.activities,
        {
          ...activity,
          sortOrder: currentDay.activities.length + 1,
          day: dayIndex + 1,
        },
      ],
    };
    onDaysChange(newDays);
  };

  const handleRemoveActivity = (dayIndex: number) => (activityId: string) => {
    const newDays = [...days];
    const currentDay = newDays[dayIndex];
    if (!currentDay) return;

    newDays[dayIndex] = {
      ...currentDay,
      activities: currentDay.activities.filter((a) => a.id !== activityId),
    };
    onDaysChange(newDays);
  };

  const activeActivity =
    activeId !== null && activeId !== ''
      ? days.flatMap((d) => d.activities).find((a) => a.id === activeId)
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-50)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '0',
            }}
          >
            {translations.activitiesByDay}
          </h3>
          <button
            type="button"
            onClick={onAddDay}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary-500)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
            }}
          >
            {translations.addDay}
          </button>
        </div>

        <SortableContext
          items={days.map((d) => `day-${d.day}`)}
          strategy={verticalListSortingStrategy}
        >
          {days.map((day, index) => (
            <DayGroup
              key={day.day}
              day={day}
              availableActivities={availableActivities}
              translations={translations}
              onAddActivity={handleAddActivity(index)}
              onTimeChange={(activityId, time) => onActivityTimeChange(index, activityId, time)}
              onRemoveActivity={handleRemoveActivity(index)}
              onRemoveDay={() => onRemoveDay(index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </SortableContext>

        {days.length === 0 && (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: 'var(--color-neutral-500)',
              fontSize: 'var(--text-base)',
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--color-neutral-300)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <div style={{ marginBottom: '8px' }}>{translations.noDaysAdded}</div>
            <div style={{ fontSize: 'var(--text-sm)' }}>{translations.noDaysDescription}</div>
          </div>
        )}

        <DragOverlay>
          {activeActivity ? (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-primary-50)',
                border: '2px solid var(--color-primary-500)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {activeActivity.activity}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
