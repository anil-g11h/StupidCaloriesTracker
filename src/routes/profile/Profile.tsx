import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Auth from '../../lib/components/Auth';
import { NutritionSection } from './components/NutritionSection';
import { DietarySection } from './components/DietarySection';
import { MealsSection } from './components/MealsSection';
import { RemindersSection } from './components/RemindersSection';
import { AdminSection } from './components/AdminSection';
import { REMINDER_KEYS, useProfileSettings } from './useProfileSettings';
import {
  clearAllSyncQueueLocal,
  clearFailedSyncQueueLocal,
  clearLocalDataAndReload,
  getLocalSyncQueueSummary,
  resetLocalSyncCursor,
  runGlobalAdminAction,
  type GlobalAdminAction
} from '../../lib/adminMaintenance';
import { syncManager } from '../../lib/sync';

export default function ProfileSettings() {
  const {
    session,
    loading,
    saving,
    openSection,
    setOpenSection,
    mealInputMode,
    setMealInputMode,
    macroTrackRef,
    draggingMacroHandle,
    setDraggingMacroHandle,
    form,
    dietaryForm,
    setDietaryForm,
    customAllergyInput,
    setCustomAllergyInput,
    macroFirstCut,
    macroSecondCut,
    proteinGramsDisplay,
    carbGramsDisplay,
    fatGramsDisplay,
    totalMealPercent,
    totalMealCalories,
    canSaveSettings,
    fastingWindowHint,
    mealTimingAdvice,
    sortedMeals,
    updateNutrition,
    addMeal,
    onMealPatternSelected,
    updateMeal,
    removeMeal,
    updateReminder,
    toggleDietTag,
    toggleAllergy,
    toggleMedicalConstraint,
    addCustomAllergy,
    removeCustomAllergy,
    adaptiveMealPlan,
    adaptiveMealPlanError,
    isGeneratingAdaptiveMealPlan,
    isApplyingAdaptiveMealPlan,
    generateAdaptiveMealPlanForToday,
    applyAdaptiveMealPlanToToday,
    saveAllSettings
  } = useProfileSettings();

  const [queueSummary, setQueueSummary] = useState({ total: 0, pending: 0, failed: 0 });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [adminStatus, setAdminStatus] = useState<string | null>(null);

  const refreshQueueSummary = async () => {
    const summary = await getLocalSyncQueueSummary();
    setQueueSummary({
      total: summary.total,
      pending: summary.pending,
      failed: summary.failed
    });
  };

  useEffect(() => {
    void refreshQueueSummary();
  }, []);

  const runAdminAction = async (actionName: string, action: () => Promise<void>) => {
    try {
      setBusyAction(actionName);
      setAdminStatus(null);
      await action();
      await refreshQueueSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
      setAdminStatus(`Failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunGlobalAction = async (action: GlobalAdminAction) => {
    await runAdminAction(`global:${action}`, async () => {
      const result = await runGlobalAdminAction(action, adminToken || undefined);
      const details = result.summary ? ` ${JSON.stringify(result.summary)}` : '';
      setAdminStatus(result.message ?? `Completed ${action}.${details}`);
      await syncManager.sync();
    });
  };

  if (loading) {
    return <div className="p-10 text-center text-text-muted">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <header className="bg-card shadow-sm sticky top-0 z-10 border-b border-border-subtle">
          <div className="max-w-md mx-auto px-4 py-3">
            <h1 className="text-xl font-bold text-text-main">Profile</h1>
          </div>
        </header>
        <div className="px-4 max-w-md mx-auto mt-8">
          <div className="bg-card p-5 rounded-2xl border border-border-subtle">
            <h2 className="text-base font-bold text-text-main mb-3">Sign in</h2>
            <Auth />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <header className="bg-card shadow-sm sticky top-0 z-10 border-b border-border-subtle">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-main">Profile Settings</h1>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface text-text-muted hover:text-text-main border border-border-subtle transition-colors"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">
        <form onSubmit={saveAllSettings} className="space-y-5">
          <NutritionSection
            isOpen={openSection === 'nutrition'}
            onToggle={() => setOpenSection((prev) => (prev === 'nutrition' ? null : 'nutrition'))}
            nutrition={form.nutrition}
            updateNutrition={updateNutrition}
            macroTrackRef={macroTrackRef}
            draggingMacroHandle={draggingMacroHandle}
            macroFirstCut={macroFirstCut}
            macroSecondCut={macroSecondCut}
            setDraggingMacroHandle={setDraggingMacroHandle}
            proteinGramsDisplay={proteinGramsDisplay}
            carbGramsDisplay={carbGramsDisplay}
            fatGramsDisplay={fatGramsDisplay}
          />

          <DietarySection
            isOpen={openSection === 'dietary'}
            onToggle={() => setOpenSection((prev) => (prev === 'dietary' ? null : 'dietary'))}
            dietaryForm={dietaryForm}
            setDietaryForm={setDietaryForm}
            customAllergyInput={customAllergyInput}
            setCustomAllergyInput={setCustomAllergyInput}
            toggleDietTag={toggleDietTag}
            toggleAllergy={toggleAllergy}
            toggleMedicalConstraint={toggleMedicalConstraint}
            addCustomAllergy={addCustomAllergy}
            removeCustomAllergy={removeCustomAllergy}
          />

          <MealsSection
            isOpen={openSection === 'meals'}
            onToggle={() => setOpenSection((prev) => (prev === 'meals' ? null : 'meals'))}
            dietaryForm={dietaryForm}
            setDietaryForm={setDietaryForm}
            onMealPatternSelected={onMealPatternSelected}
            fastingWindowHint={fastingWindowHint}
            mealTimingAdvice={mealTimingAdvice}
            addMeal={addMeal}
            meals={form.meals}
            sortedMeals={sortedMeals}
            mealInputMode={mealInputMode}
            setMealInputMode={setMealInputMode}
            dailyCalorieBudget={form.nutrition.calorieBudget}
            totalMealPercent={totalMealPercent}
            totalMealCalories={totalMealCalories}
            canSaveSettings={canSaveSettings}
            adaptiveMealPlan={adaptiveMealPlan}
            adaptiveMealPlanError={adaptiveMealPlanError}
            isGeneratingAdaptiveMealPlan={isGeneratingAdaptiveMealPlan}
            isApplyingAdaptiveMealPlan={isApplyingAdaptiveMealPlan}
            generateAdaptiveMealPlanForToday={generateAdaptiveMealPlanForToday}
            applyAdaptiveMealPlanToToday={applyAdaptiveMealPlanToToday}
            onRemoveMeal={removeMeal}
            onUpdateMeal={updateMeal}
          />

          <RemindersSection
            isOpen={openSection === 'reminders'}
            onToggle={() => setOpenSection((prev) => (prev === 'reminders' ? null : 'reminders'))}
            reminderKeys={REMINDER_KEYS}
            reminders={form.reminders}
            updateReminder={updateReminder}
          />

          <AdminSection
            isOpen={openSection === 'admin'}
            onToggle={() => setOpenSection((prev) => (prev === 'admin' ? null : 'admin'))}
            queueSummary={queueSummary}
            busyAction={busyAction}
            adminToken={adminToken}
            setAdminToken={setAdminToken}
            onRefreshSummary={() => {
              void runAdminAction('refresh-summary', async () => {
                await refreshQueueSummary();
                setAdminStatus('Queue summary refreshed.');
              });
            }}
            onClearFailedQueue={() => {
              void runAdminAction('clear-failed-queue', async () => {
                const removed = await clearFailedSyncQueueLocal(3);
                setAdminStatus(`Cleared ${removed} failed queue item(s) locally.`);
              });
            }}
            onClearAllQueue={() => {
              void runAdminAction('clear-all-queue', async () => {
                const removed = await clearAllSyncQueueLocal();
                setAdminStatus(`Cleared ${removed} queued item(s) locally.`);
              });
            }}
            onForceFullSyncAndReconcile={() => {
              void runAdminAction('force-full-sync-reconcile', async () => {
                await resetLocalSyncCursor();
                await syncManager.sync();
                setAdminStatus('Forced full sync and delete reconciliation for this device.');
              });
            }}
            onResetLocalDb={() => {
              if (!confirm('This will clear local IndexedDB + storage on this device and reload. Continue?')) return;
              void runAdminAction('reset-local-db', async () => {
                setAdminStatus('Resetting local data and reloading...');
                await clearLocalDataAndReload();
              });
            }}
            onRunGlobalAction={(action) => {
              void handleRunGlobalAction(action);
            }}
            statusMessage={adminStatus}
          />

          {canSaveSettings ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-brand text-brand-fg font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          ) : null}
        </form>

      </main>
    </div>
  );
}