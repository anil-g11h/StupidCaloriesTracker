import { liveQuery } from 'dexie';
import { readable, type Readable } from 'svelte/store';

/**
 * A Svelte store wrapper for Dexie's liveQuery.
 * 
 * @param querier A function that returns a result or a Promise of a result.
 * @param initialValue Optional initial value for the store.
 * @returns A Svelte readable store that updates when the database changes.
 */
export function liveQueryStore<T>(
	querier: () => T | Promise<T>,
	initialValue?: T
): Readable<T | undefined> {
	return readable<T | undefined>(initialValue, (set) => {
		const subscription = liveQuery(querier).subscribe(
			(value) => {
				set(value);
			},
			(err) => {
				console.error('liveQueryStore error:', err);
			}
		);

		return () => subscription.unsubscribe();
	});
}
