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
  draggingMacroHandle,
  macroFirstCut,
  macroSecondCut,
  setDraggingMacroHandle,
  proteinGramsDisplay,
  carbGramsDisplay,
  fatGramsDisplay
}: {
  isOpen: boolean;
  onToggle: () => void;
  nutrition: NutritionValues;
  updateNutrition: (patch: Partial<NutritionValues>) => void;
  macroTrackRef: React.RefObject<HTMLDivElement | null>;
  draggingMacroHandle: 'first' | 'second' | null;
  macroFirstCut: number;
  macroSecondCut: number;
  setDraggingMacroHandle: (value: 'first' | 'second') => void;
  proteinGramsDisplay: number;
  carbGramsDisplay: number;
  fatGramsDisplay: number;
}) {
  const pickNearestHandle = (clientX: number) => {
    if (!macroTrackRef.current) return;
    const rect = macroTrackRef.current.getBoundingClientRect();
    const clickPercent = ((clientX - rect.left) / rect.width) * 100;
    const distToFirst = Math.abs(clickPercent - macroFirstCut);
    const distToSecond = Math.abs(clickPercent - macroSecondCut);
    setDraggingMacroHandle(distToFirst <= distToSecond ? 'first' : 'second');
  };

  const isFirstActive = draggingMacroHandle === 'first';
  const isSecondActive = draggingMacroHandle === 'second';

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

          <div className="text-[11px] text-text-muted text-center font-medium">Drag the handles to adjust macro split</div>

          <div
            ref={macroTrackRef}
            className="relative h-10 select-none touch-none"
            onMouseDown={(e) => {
              pickNearestHandle(e.clientX);
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (!touch) return;
              pickNearestHandle(touch.clientX);
            }}
            onPointerDown={(e) => {
              pickNearestHandle(e.clientX);
            }}
          >
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 rounded-full overflow-hidden border border-border-subtle flex">
              <div className="h-full bg-brand flex items-center justify-center transition-[width] duration-200 ease-out" style={{ width: `${macroFirstCut}%` }}>
                <span className="text-[10px] font-bold text-brand-fg whitespace-nowrap transition-all duration-200">{nutrition.proteinPercent}%</span>
              </div>
              <div className="h-full bg-surface flex items-center justify-center transition-[width] duration-200 ease-out" style={{ width: `${macroSecondCut - macroFirstCut}%` }}>
                <span className="text-[10px] font-bold text-text-main whitespace-nowrap transition-all duration-200">{nutrition.carbPercent}%</span>
              </div>
              <div className="h-full bg-macro-fat flex items-center justify-center transition-[width] duration-200 ease-out" style={{ width: `${100 - macroSecondCut}%` }}>
                <span className="text-[10px] font-bold text-white whitespace-nowrap transition-all duration-200">{nutrition.fatPercent}%</span>
              </div>
            </div>

            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('first');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('first');
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('first');
              }}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border bg-card shadow-sm touch-none cursor-ew-resize transition-all duration-150 ${
                isFirstActive ? 'border-brand scale-110 ring-2 ring-brand/25' : 'border-border-subtle'
              }`}
              style={{ left: `${macroFirstCut}%` }}
              aria-label="Adjust protein/carbs split"
            >
              <span aria-hidden="true" className="mx-auto block h-3 w-[2px] rounded-full bg-text-muted" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('second');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('second');
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggingMacroHandle('second');
              }}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border bg-card shadow-sm touch-none cursor-ew-resize transition-all duration-150 ${
                isSecondActive ? 'border-brand scale-110 ring-2 ring-brand/25' : 'border-border-subtle'
              }`}
              style={{ left: `${macroSecondCut}%` }}
              aria-label="Adjust carbs/fat split"
            >
              <span aria-hidden="true" className="mx-auto block h-3 w-[2px] rounded-full bg-text-muted" />
            </button>
          </div>
        </div>
      </div>
    </OptionCard>
  );
}
