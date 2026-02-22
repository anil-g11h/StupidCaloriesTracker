import React from 'react';
import { OptionCard } from './ProfileSectionPrimitives';
import type { GlobalAdminAction } from '../../../lib/adminMaintenance';

interface QueueSummary {
  total: number;
  pending: number;
  failed: number;
}

interface AdminSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  queueSummary: QueueSummary;
  busyAction: string | null;
  adminToken: string;
  setAdminToken: (value: string) => void;
  onRefreshSummary: () => void;
  onClearFailedQueue: () => void;
  onClearAllQueue: () => void;
  onForceFullSyncAndReconcile: () => void;
  onResetLocalDb: () => void;
  onRunGlobalAction: (action: GlobalAdminAction) => void;
  statusMessage: string | null;
}

export function AdminSection({
  isOpen,
  onToggle,
  queueSummary,
  busyAction,
  adminToken,
  setAdminToken,
  onRefreshSummary,
  onClearFailedQueue,
  onClearAllQueue,
  onForceFullSyncAndReconcile,
  onResetLocalDb,
  onRunGlobalAction,
  statusMessage
}: AdminSectionProps) {
  const isBusy = Boolean(busyAction);

  return (
    <OptionCard
      title="Admin Actions"
      subtitle="Sync queue cleanup (local) + protected global maintenance"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border-subtle bg-surface p-3 text-xs text-text-muted">
          <div>Queue total: <span className="font-bold text-text-main">{queueSummary.total}</span></div>
          <div>Pending: <span className="font-bold text-text-main">{queueSummary.pending}</span></div>
          <div>Failed (3+ attempts): <span className="font-bold text-text-main">{queueSummary.failed}</span></div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={onRefreshSummary}
            disabled={isBusy}
            className="w-full py-2 rounded-lg border border-border-subtle bg-card text-text-main text-sm font-semibold disabled:opacity-60"
          >
            Refresh Queue Summary
          </button>
          <button
            type="button"
            onClick={onClearFailedQueue}
            disabled={isBusy}
            className="w-full py-2 rounded-lg border border-border-subtle bg-card text-text-main text-sm font-semibold disabled:opacity-60"
          >
            Clear Failed Queue (local)
          </button>
          <button
            type="button"
            onClick={onClearAllQueue}
            disabled={isBusy}
            className="w-full py-2 rounded-lg border border-border-subtle bg-card text-text-main text-sm font-semibold disabled:opacity-60"
          >
            Clear All Queue Items (local)
          </button>
          <button
            type="button"
            onClick={onForceFullSyncAndReconcile}
            disabled={isBusy}
            className="w-full py-2 rounded-lg border border-border-subtle bg-card text-text-main text-sm font-semibold disabled:opacity-60"
          >
            Force Full Sync + Delete Reconcile Now (local)
          </button>
          <button
            type="button"
            onClick={onResetLocalDb}
            disabled={isBusy}
            className="w-full py-2 rounded-lg border border-border-subtle bg-card text-text-main text-sm font-semibold disabled:opacity-60"
          >
            Reset Local DB + Storage (local)
          </button>
        </div>

        <div className="pt-2 border-t border-border-subtle space-y-2">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wide">Admin token (for global actions)</label>
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="Optional token"
            className="w-full border border-border-subtle rounded-lg px-3 py-2 bg-card text-text-main"
          />

          <button
            type="button"
            onClick={() => onRunGlobalAction('cleanup_duplicate_public_workout_exercises')}
            disabled={isBusy}
            className="w-full py-2 rounded-lg bg-brand text-brand-fg text-sm font-bold disabled:opacity-60"
          >
            Global: Dedupe Public Workout Exercises
          </button>
          <button
            type="button"
            onClick={() => onRunGlobalAction('cleanup_orphan_food_ingredients')}
            disabled={isBusy}
            className="w-full py-2 rounded-lg bg-brand text-brand-fg text-sm font-bold disabled:opacity-60"
          >
            Global: Remove Orphan Food Ingredients
          </button>
          <p className="text-[11px] text-text-muted">
            Global actions run server-side for all accounts/devices and require admin authorization in the edge function.
          </p>
        </div>

        {statusMessage ? <p className="text-xs text-text-muted">{statusMessage}</p> : null}
      </div>
    </OptionCard>
  );
}
