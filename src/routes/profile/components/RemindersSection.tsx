import React from 'react';
import { OptionCard } from './ProfileSectionPrimitives';

type ReminderKey = 'food' | 'water' | 'workout' | 'walk' | 'weight' | 'medicine';

interface ReminderSetting {
  enabled: boolean;
  time: string;
}

export function RemindersSection({
  isOpen,
  onToggle,
  reminderKeys,
  reminders,
  updateReminder
}: {
  isOpen: boolean;
  onToggle: () => void;
  reminderKeys: ReminderKey[];
  reminders: Record<ReminderKey, ReminderSetting>;
  updateReminder: (key: ReminderKey, patch: Partial<ReminderSetting>) => void;
}) {
  return (
    <OptionCard
      title="Reminders"
      subtitle="Enable and schedule reminder times"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {reminderKeys.map((key) => (
          <div key={key} className="bg-surface border border-border-subtle rounded-xl px-3 py-2.5 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={reminders[key].enabled}
                onChange={(e) => updateReminder(key, { enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border-subtle bg-card"
              />
              <span className="text-sm font-medium text-text-main capitalize">{key}</span>
            </label>
            <input
              type="time"
              value={reminders[key].time}
              onChange={(e) => updateReminder(key, { time: e.target.value })}
              disabled={!reminders[key].enabled}
              className="p-2 rounded-lg border border-border-subtle bg-card text-text-main text-sm disabled:opacity-50"
            />
          </div>
        ))}
      </div>
    </OptionCard>
  );
}
