// Categories, synced online.
//
// Source of truth: Supabase table `user_categories`. localStorage
// ('categories') stays as a fast offline cache. First load on a device
// MERGES the cloud list with the device's own list (by name + type), so a
// category created on the phone is never lost when another device syncs
// first — the merged list is written back to the cloud.
//
// Offline-safe: if Supabase is unreachable (or the table does not exist
// yet), loading falls back to the local cache / defaults, and saving still
// updates the cache — the cloud sync is retried on the next load.
import { supabase } from '@/integrations/supabase/client';
import type { Category } from '@/types/finance';
import { DEFAULT_CATEGORIES, migrateCategories } from '@/lib/categoryDefaults';

const STORE_KEY = 'categories';

type DbCategoryRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  type: string;
  color: string;
  icon: string | null;
};

const keyOf = (c: Pick<Category, 'name' | 'type'>) =>
  `${c.type}:${c.name.toLowerCase()}`;

function readCache(): Category[] | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Category[]) : null;
  } catch {
    return null;
  }
}

function writeCache(list: Category[], silent = false) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  if (!silent) window.dispatchEvent(new Event('categoriesChanged'));
}

function toCategory(row: DbCategoryRow): Category {
  return {
    id: row.client_id ?? row.id,
    name: row.name,
    type: row.type === 'income' ? 'income' : 'expense',
    color: row.color,
    icon: row.icon ?? undefined,
  };
}

/** Union of cloud + local by (name, type); cloud wins on conflicts. */
function mergeLists(cloud: Category[], local: Category[]): Category[] {
  const seen = new Set(cloud.map(keyOf));
  const merged = [...cloud];
  for (const c of local) {
    if (!seen.has(keyOf(c))) {
      merged.push(c);
      seen.add(keyOf(c));
    }
  }
  return merged;
}

function sameList(a: Category[], b: Category[]): boolean {
  const sig = (list: Category[]) =>
    list
      .map((c) => `${keyOf(c)}|${c.color}|${c.icon ?? ''}`)
      .sort()
      .join(';');
  return sig(a) === sig(b);
}

async function pushCategories(list: Category[], userId: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from('user_categories')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (list.length === 0) return;
  const { error } = await supabase.from('user_categories').insert(
    list.map((c) => ({
      user_id: userId,
      client_id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon ?? null,
    })),
  );
  if (error) throw error;
}

/** Load categories: cloud first (merged with this device's own list). */
export async function loadCategories(): Promise<Category[]> {
  const { list: local } = migrateCategories(
    readCache() ?? [...DEFAULT_CATEGORIES],
  );
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return local;

    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id);
    if (error) throw error;

    const cloud = (data ?? []).map((row) =>
      toCategory(row as unknown as DbCategoryRow),
    );
    const { list: cloudMigrated } = migrateCategories(cloud);
    const merged = mergeLists(cloudMigrated, local);
    if (!sameList(merged, cloud)) {
      // Device has categories the cloud lacks (or required ones are
      // missing) — write the merged list back so every device gets it.
      await pushCategories(merged, user.id);
    }
    writeCache(merged, true);
    return merged;
  } catch {
    // Offline, logged out, or table not created yet — keep working
    // from the local cache.
    return local;
  }
}

/**
 * Save categories: updates the local cache immediately (and notifies
 * listeners), then pushes the list to the cloud. A failed push (offline)
 * is retried implicitly on the next load via the merge.
 */
export async function saveCategories(list: Category[]): Promise<void> {
  const { list: migrated } = migrateCategories(list);
  writeCache(migrated);
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await pushCategories(migrated, user.id);
  } catch {
    // Offline: the cache is already updated; the cloud sync is
    // retried on the next load.
  }
}
