import { db, type SyncQueue } from '$lib/db';
import { supabase } from '$lib/supabaseClient';
import Dexie from 'dexie';

const SYNC_INTERVAL_MS = 30000; // 30 seconds
const LAST_SYNCED_KEY = 'stupid_calorie_tracker_last_synced';

export class SyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  constructor() {
      if (typeof window !== 'undefined') {
          // Expose for debugging
          // @ts-ignore
          window.syncManager = this;
      }
  }

  start() {
    if (typeof window === 'undefined') return;

    // Listen for online/offline events
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => this.stop());

    // Initial sync check
    if (navigator.onLine) {
      this.sync();
    }

    // Setup periodic sync
    this.syncInterval = setInterval(() => {
      // console.log('[SyncManager] Interval check - Online:', navigator.onLine, 'Syncing:', this.isSyncing);
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, SYNC_INTERVAL_MS);
  }

  async requeueUnsynced() {
     console.log('[SyncManager] Re-queueing unsynced items...');
     
     // Need type assertion or check if table exists in db
     const tables = [
         'profiles', 'foods', 'food_ingredients', 'logs', 'goals', 'metrics', 
         'activities', 'activity_logs',
         'workout_exercises_def', 'workouts', 'workout_log_entries', 'workout_sets'
     ] as const;
     
     for (const table of tables) {
         try {
             // @ts-ignore
             const unsynced = await db.table(table).where('synced').equals(0).toArray();
             
             if (unsynced.length > 0) {
                 console.log(`[SyncManager] Found ${unsynced.length} unsynced items in ${table}`);
                 
                 try {
                     // Iterate and add. Since we awaited toArray(), the read transaction is done.
                     // Unless this function was called from an outer transaction scope.
                     // Given the ignoreTransaction issues, let's try direct access.
                     // If called from outer transaction without sync_queue access, this might fail,
                     // but typically this is called from top-level context.
                     for (const item of unsynced) {
                         // Check if already in queue to avoid duplicates
                         const existing = await db.sync_queue
                            .where({ table: table, action: 'create' })
                            .filter((q: any) => q.data.id === item.id)
                            .first();
                            
                         if (!existing) {
                             await db.sync_queue.add({
                                 table,
                                 action: 'create',
                                 data: item,
                                 created_at: Date.now()
                             });
                         }
                     }
                 } catch (e) {
                     console.error(`[SyncManager] Re-queue logic failed:`, e);
                 }
             }
         } catch (e) {
             console.error(`Error scanning ${table}`, e);
         }
     }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync() {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync skipped: Already in progress');
      return;
    }
    this.isSyncing = true;

    try {
      console.log('[SyncManager] Starting sync process...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      await this.pushChanges(session);
      await this.pullChanges(session);
      
      localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString()); 
      console.log('[SyncManager] Sync complete.');
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async pushChanges(session: any) {
    // Process queue in order
    const queue = await db.sync_queue.orderBy('created_at').toArray();
    if (queue.length === 0) return;

    if (!session?.user) {
        console.log('[SyncManager] No active session. Skipping push.');
        return;
    }

    console.log(`[SyncManager] Pushing ${queue.length} changes for user ${session.user.id}...`);

    for (const item of queue) {
      try {
        await this.processQueueItem(item, session);
        if (item.id) {
          await db.sync_queue.delete(item.id);
        }
      } catch (error) {
        console.error('Failed to process queue item:', item, error);
        // Break to avoid consistency issues if operations are dependent
        break; 
      }
    }
  }

  private async processQueueItem(item: SyncQueue, session: any) {
    const { table, action, data } = item;
    
    // table mapping
    let supabaseTable = table;
    if (table === 'logs') supabaseTable = 'daily_logs'; 
    if (table === 'metrics') supabaseTable = 'body_metrics'; 
    
    // For delete, we only need the ID
    if (action === 'delete') {
         // handle both string ID or object with ID
         const id = (typeof data === 'object' && data !== null) ? data.id : data;
         
         if (!id) {
             console.warn('No ID for delete, skipping', item);
             return; 
         }
         
         const { error } = await supabase.from(supabaseTable).delete().eq('id', id);
         if (error) throw error;
         return;
    }

    // For create/update, we need to clean the data (remove local-only fields if any)
    const { synced, ...payload } = data;
    
    // override user_id with actual authenticated user id
    if (session?.user?.id) {
         if (payload.user_id === 'local-user' || payload.user_id === 'current-user' || !payload.user_id) {
             payload.user_id = session.user.id;
         }
         // Also ensure ownership for ownable items
         if (['foods', 'activities'].includes(table) && !payload.is_public && (payload.user_id === 'local-user' || payload.user_id === 'current-user' || !payload.user_id)) {
             payload.user_id = session.user.id;
         }
         // If it is public, we should probably set user_id to null if it's 'local-user' or let it be the user's ID if they are creating it
         if (['foods', 'activities'].includes(table) && payload.is_public) {
             // If user creates a public item, they own it initially? Or is it system owned?
             // Based on schema: user_id uuid references auth.users(id), -- Null means global/public food
             // If user_id is null, it's global.
             // If user creates it, normally it should be their ID unless they have admin rights to create null-owner items.
             // Let's assume for now regular users can't create public items freely or if they do, it's theirs.
             if (payload.user_id === 'local-user' || payload.user_id === 'current-user') {
                 payload.user_id = session.user.id;
             }
         }
    } else {
        // If no session, we can't sync private data. 
        // But we might be able to sync public data reading? 
        // But pushing requires auth usually.
        console.warn('[SyncManager] No session user, but sync was attempted.');
        // If we throw here, we block the queue.
        // Maybe we should just return and retry later?
        // But pushChanges already checks for session.user.
    }
    
    console.log(`[SyncManager] Processing ${action} for ${supabaseTable} with user ${payload.user_id}`, payload);

    if (action === 'create') {
        const { error } = await supabase.from(supabaseTable).insert(payload);
        if (error) { 
            console.error('[SyncManager] Insert error:', error);
            throw error; 
        }
    } else if (action === 'update') {
        if (!payload.id) throw new Error('No ID for update');
        const { error } = await supabase.from(supabaseTable).update(payload).eq('id', payload.id);
        if (error) throw error;
    }

    // Mark as synced locally
    // We need to update the local record to set synced=1
    // But wait, updating it will trigger the 'updating' hook!
    // We need to make sure we pass synced=1 so the hook ignores it.
    try {
        const id = payload.id;
        if (id) {
            await db.table(table).update(id, { synced: 1 });
        }
    } catch (e) {
        console.warn('[SyncManager] Failed to mark local item as synced', e);
    }
  }

  async pullChanges(session: any) {
    const lastSyncedAt = localStorage.getItem(LAST_SYNCED_KEY);
    let lastSyncedDate = lastSyncedAt || new Date(0).toISOString();

    // Track max timestamp globally for the sync cycle to ensure we don't miss updates
    // Initialize properly
    if (lastSyncedAt) {
       // ensure valid date
       try {
           new Date(lastSyncedAt).toISOString();
       } catch (e) {
           lastSyncedDate = new Date(0).toISOString();
       }
    }
    
    let maxTimestamp = lastSyncedDate;
    let hasChanges = false;

    // Tables to sync
    interface TableConfig {
        dexie: string;
        supabase: string;
        dateField: string;
        public?: boolean;
        select?: string; // Limit fields if needed
    }

    const tables: TableConfig[] = [
        { dexie: 'profiles', supabase: 'profiles', dateField: 'updated_at' },
        { dexie: 'foods', supabase: 'foods', dateField: 'updated_at', public: true },
        { dexie: 'food_ingredients', supabase: 'food_ingredients', dateField: 'created_at', public: true },
        { dexie: 'logs', supabase: 'daily_logs', dateField: 'created_at' },
        { dexie: 'goals', supabase: 'goals', dateField: 'created_at' },
        { dexie: 'metrics', supabase: 'body_metrics', dateField: 'created_at' },
        { dexie: 'activities', supabase: 'activities', dateField: 'updated_at', public: true },
        { dexie: 'activity_logs', supabase: 'activity_logs', dateField: 'created_at' },
        { dexie: 'workout_exercises_def', supabase: 'workout_exercises_def', dateField: 'updated_at', public: true },
        { dexie: 'workouts', supabase: 'workouts', dateField: 'updated_at' },
        { dexie: 'workout_log_entries', supabase: 'workout_log_entries', dateField: 'created_at' },
        { dexie: 'workout_sets', supabase: 'workout_sets', dateField: 'created_at' }
    ];
    
    // Batch size to prevent large payloads
    const BATCH_SIZE = 100; // conservative batch size

    for (const config of tables) {
        // Skip private tables if no session
        if (!session?.user && !config.public) {
             continue;
        }

        let page = 0;
        let fetchMore = true;
        
        while (fetchMore) {
            let retryCount = 0;
            let success = false;
            let data: any[] | null = null;
            let error: any = null;

            while (retryCount < 3 && !success) {
                try {
                    const result = await supabase
                        .from(config.supabase)
                        .select(config.select || '*')
                        .gt(config.dateField, lastSyncedDate)
                        .order(config.dateField, { ascending: true })
                        .order('id', { ascending: true }) // stable sort
                        .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);
                    
                    data = result.data;
                    error = result.error;
                    
                    if (!error) {
                        success = true;
                    } else {
                        // If error is not network related (e.g. bad request), don't retry
                        if (error.code && !['PGRST', '500', '502', '503', '504'].some(c => error.code.startsWith(c)) && !error.message?.includes('fetch')) {
                             break;
                        }
                        console.warn(`[SyncManager] Retry ${retryCount + 1}/3 for ${config.supabase} failed:`, error.message);
                        retryCount++;
                        if (retryCount < 3) await new Promise(r => setTimeout(r, 1000 * retryCount)); // Backoff
                    }
                } catch (e) {
                    error = e;
                    console.warn(`[SyncManager] Retry ${retryCount + 1}/3 for ${config.supabase} exception:`, e);
                    retryCount++;
                    if (retryCount < 3) await new Promise(r => setTimeout(r, 1000 * retryCount));
                }
            }

            if (error || !success) {
                console.error(`Failed to pull ${config.supabase} after retries:`, error);
                // If network error, stop syncing entirely
                if (error && error.message && (error.message.includes('Load failed') || error.message.includes('Network request failed') || error.message.includes('fetch'))) {
                    throw error;
                }
                fetchMore = false; // Stop fetching this table on error but maybe continue others? No, rethrow stopped it.
                continue;
            }

            if (data && data.length > 0) {
                console.log(`[SyncManager] Pulled ${data.length} records for ${config.dexie} (page ${page})`);
                
                // Update local DB
                const rows = (data as any[]).map(row => ({ ...row, synced: 1 }));
                await db.table(config.dexie).bulkPut(rows);
                hasChanges = true;

                // Track max timestamp from the data we just received
                for (const row of (data as any[])) {
                    const ts = row[config.dateField];
                    if (ts > maxTimestamp) maxTimestamp = ts;
                }
                
                // If we got less than BATCH_SIZE, we are done
                if (data.length < BATCH_SIZE) {
                    fetchMore = false;
                } else {
                    page++;
                }
            } else {
                fetchMore = false;
            }
        }
    }

    // Only update timestamp if we successfully completed sync and processed changes
    // But even if no changes, we should update to now? No, update to maxTimestamp see
    if (hasChanges && maxTimestamp > lastSyncedDate) {
        localStorage.setItem(LAST_SYNCED_KEY, maxTimestamp); 
    } else if (!hasChanges) {
        // If no changes at all, we can update to now() only if we are sure we checked everything
        // But safely, let's just keep lastSyncedDate. 
        // Or update to now() to avoid checking old range repeatedly?
        // If we queried with gt(lastSyncedDate) and got 0 results, 
        // it means state IS synced up to now().
        localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    }
  }
}

export const syncManager = new SyncManager();
