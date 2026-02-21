import React from 'react';
import { Field, OptionCard } from './ProfileSectionPrimitives';

interface NutritionValues {
  calorieBudget: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  fiberGrams: number;
}

export function NutritionSection({
  isOpen,
  onToggle,
  nutrition,
  updateNutrition,
  macroTrackRef,
  macroFirstCut,
  macroSecondCut,
  setDraggingMacroHandle,
  proteinGramsDisplay,
  carbGramsDisplay,
  fatGramsDisplay,
  macroSum
}: {
  isOpen: boolean;
  onToggle: () => void;
  nutrition: NutritionValues;
  updateNutrition: (patch: Partial<NutritionValues>) => void;
  macroTrackRef: React.RefObject<HTMLDivElement | null>;
  macroFirstCut: number;
  macroSecondCut: number;
  setDraggingMacroHandle: (value: 'first' | 'second') => void;
  proteinGramsDisplay: number;
  carbGramsDisplay: number;
  fatGramsDisplay: number;
  macroSum: number;
}) {
  return (
    <OptionCard
      title="Nutrition Settings"
      subtitle="Daily budget, macro split, and fiber target"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorie budget (kcal)">
          <input
            type="number"
            min="0"
            value={nutrition.calorieBudget}
            onChange={(e) => updateNutrition({ calorieBudget: Number(e.target.value) })}
            className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-text-main text-sm"
          />
        </Field>

        <Field label="Fiber (g)">
          <input
            type="number"
            min="0"
            value={nutrition.fiberGrams}
            onChange={(e) => updateNutrition({ fiberGrams: Number(e.target.value) })}
            className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-text-main text-sm"
          />
        </Field>

        <div className="col-span-2 bg-surface border border-border-subtle rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-macro-protein/35 bg-macro-protein/15 py-1">
              <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Protein</div>
              <div className="text-sm font-bold text-text-main">{proteinGramsDisplay}g</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Carbs</div>
              <div className="text-sm font-bold text-text-main">{carbGramsDisplay}g</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Fat</div>
              <div className="text-sm font-bold text-text-main">{fatGramsDisplay}g</div>
            </div>
          </div>

          <div
            ref={macroTrackRef}
            className="relative h-10 select-none"
            onMouseDown={(e) => {
              if (!macroTrackRef.current) return;
              const rect = macroTrackRef.current.getBoundingClientRect();
              const clickPercent = ((e.clientX - rect.left) / rect.width) * 100;
              const distToFirst = Math.abs(clickPercent - macroFirstCut);
              const distToSecond = Math.abs(clickPercent - macroSecondCut);
              setDraggingMacroHandle(distToFirst <= distToSecond ? 'first' : 'second');
            }}
          >
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 rounded-full overflow-hidden border border-border-subtle flex">
              <div className="h-full bg-brand flex items-center justify-center" style={{ width: `${macroFirstCut}%` }}>
                <span className="text-[10px] font-bold text-brand-fg whitespace-nowrap">{nutrition.proteinPercent}%</span>
              </div>
              <div className="h-full bg-surface flex items-center justify-center" style={{ width: `${macroSecondCut - macroFirstCut}%` }}>
                <span className="text-[10px] font-bold text-text-main whitespace-nowrap">{nutrition.carbPercent}%</span>
              </div>
              <div className="h-full bg-macro-fat flex items-center justify-center" style={{ width: `${100 - macroSecondCut}%` }}>
                <span className="text-[10px] font-bold text-white whitespace-nowrap">{nutrition.fatPercent}%</span>
              </div>
            </div>

            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('first');
              }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border-subtle bg-card shadow-sm"
              style={{ left: `${macroFirstCut}%` }}
              aria-label="Adjust protein/carbs split"
            />

            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('second');
              }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border-subtle bg-card shadow-sm"
              style={{ left: `${macroSecondCut}%` }}
              aria-label="Adjust carbs/fat split"
            />
          </div>
        </div>

        <div className="col-span-2 text-xs text-text-muted">
          Macro total: <span className={macroSum === 100 ? 'text-text-main font-bold' : 'text-text-main'}>{macroSum}%</span>
        </div>
      </div>
    </OptionCard>
  );
}
