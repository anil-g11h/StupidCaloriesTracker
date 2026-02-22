import { db } from './db';
import { syncManager } from './sync';
import { supabase } from './supabaseClient';

export type GlobalAdminAction =
  | 'cleanup_duplicate_public_workout_exercises'
  | 'cleanup_orphan_food_ingredients';

export interface GlobalAdminResult {
  ok: boolean;
  action: GlobalAdminAction;
  summary?: Record<string, unknown>;
  message?: string;
}

export async function getLocalSyncQueueSummary() {
  return syncManager.getQueueSummary();
}

export async function clearFailedSyncQueueLocal(minAttempts = 3) {
  return syncManager.clearFailedQueueItems(minAttempts);
}

export async function clearAllSyncQueueLocal() {
  return syncManager.clearAllQueuedChanges();
}

export async function resetLocalSyncCursor() {
  return syncManager.resetSyncCursorForCurrentUser();
}

export async function clearLocalDataAndReload() {
  localStorage.clear();
  sessionStorage.clear();
  await db.delete();
  window.location.reload();
}

export async function runGlobalAdminAction(action: GlobalAdminAction, adminToken?: string): Promise<GlobalAdminResult> {
  const { data, error } = await supabase.functions.invoke('admin-maintenance', {
    body: { action },
    headers: adminToken ? { 'x-admin-maintenance-token': adminToken } : undefined
  });

  if (error) {
    throw error;
  }

  return data as GlobalAdminResult;
}
