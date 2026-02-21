import React from 'react';
import {
  ACTIVITY_LEVEL_OPTIONS,
  ALLERGY_OPTIONS,
  DIET_TAG_OPTIONS,
  GOAL_FOCUS_OPTIONS,
  MEDICAL_CONSTRAINT_OPTIONS,
  type DietaryPreferences
} from '../../../lib/dietaryProfile';
import { Field, OptionCard } from './ProfileSectionPrimitives';

export function DietarySection({
  isOpen,
  onToggle,
  dietaryForm,
  setDietaryForm,
  customAllergyInput,
  setCustomAllergyInput,
  toggleDietTag,
  toggleAllergy,
  toggleMedicalConstraint,
  addCustomAllergy,
  removeCustomAllergy
}: {
  isOpen: boolean;
  onToggle: () => void;
  dietaryForm: DietaryPreferences;
  setDietaryForm: React.Dispatch<React.SetStateAction<DietaryPreferences>>;
  customAllergyInput: string;
  setCustomAllergyInput: React.Dispatch<React.SetStateAction<string>>;
  toggleDietTag: (tag: string) => void;
  toggleAllergy: (allergy: string) => void;
  toggleMedicalConstraint: (constraint: string) => void;
  addCustomAllergy: () => void;
  removeCustomAllergy: (value: string) => void;
}) {
  return (
    <OptionCard
      title="Diet & Health Preferences"
      subtitle="Diet tags, allergies, and health profile"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">Dietary Habits</p>
          <div className="flex flex-wrap gap-2">
            {DIET_TAG_OPTIONS.map((option) => {
              const active = dietaryForm.dietTags.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleDietTag(option.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-brand text-brand-fg border-brand'
                      : 'bg-surface text-text-muted hover:text-text-main border-border-subtle'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">Allergies</p>
          <div className="grid grid-cols-1 gap-2">
            {ALLERGY_OPTIONS.map((option) => (
              <label key={option.id} className="inline-flex items-center gap-2 bg-surface border border-border-subtle rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  checked={dietaryForm.allergies.includes(option.id)}
                  onChange={() => toggleAllergy(option.id)}
                  className="h-4 w-4 rounded border-border-subtle bg-card"
                />
                <span className="text-sm text-text-main">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">Custom Allergies</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customAllergyInput}
              onChange={(e) => setCustomAllergyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomAllergy();
                }
              }}
              placeholder="e.g. Mushroom"
              className="flex-1 p-2.5 rounded-xl border border-border-subtle bg-surface text-text-main text-sm"
            />
            <button
              type="button"
              onClick={addCustomAllergy}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-surface text-text-main border border-border-subtle"
            >
              Add
            </button>
          </div>
          {dietaryForm.customAllergies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {dietaryForm.customAllergies.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => removeCustomAllergy(item)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface text-text-main border border-border-subtle"
                  title="Remove"
                >
                  {item} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Field label="Goal focus">
            <select
              value={dietaryForm.goalFocus}
              onChange={(e) => setDietaryForm((prev) => ({ ...prev, goalFocus: e.target.value }))}
              className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-text-main text-sm"
            >
              <option value="">Select goal</option>
              {GOAL_FOCUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Activity level">
            <select
              value={dietaryForm.activityLevel}
              onChange={(e) => setDietaryForm((prev) => ({ ...prev, activityLevel: e.target.value }))}
              className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-text-main text-sm"
            >
              <option value="">Select activity level</option>
              {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2">Medical constraints</p>
            <div className="grid grid-cols-1 gap-2">
              {MEDICAL_CONSTRAINT_OPTIONS.map((option) => (
                <label key={option.id} className="inline-flex items-center gap-2 bg-surface border border-border-subtle rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={dietaryForm.medicalConstraints.includes(option.id)}
                    onChange={() => toggleMedicalConstraint(option.id)}
                    className="h-4 w-4 rounded border-border-subtle bg-card"
                  />
                  <span className="text-sm text-text-main">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OptionCard>
  );
}
