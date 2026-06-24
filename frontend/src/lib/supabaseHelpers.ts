import { supabase } from './supabase';

type SbResult<T> = { data: T | null; error: { message: string } | null };

/** Lecture d'une table — ne throw jamais, toujours vérifier .error */
export async function sbSelect<T = unknown>(
  table: string,
  query?: string,
): Promise<SbResult<T[]>> {
  const res = await supabase.from(table).select(query ?? '*');
  if (res.error) console.error(`[supabase] SELECT ${table}:`, res.error.message);
  return res as SbResult<T[]>;
}

export async function sbInsert<T = unknown>(
  table: string,
  payload: Record<string, unknown>,
): Promise<SbResult<T>> {
  const res = await supabase.from(table).insert(payload).select().single();
  if (res.error) console.error(`[supabase] INSERT ${table}:`, res.error.message);
  return res as SbResult<T>;
}

export async function sbUpdate<T = unknown>(
  table: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<SbResult<T>> {
  const res = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (res.error) console.error(`[supabase] UPDATE ${table}:`, res.error.message);
  return res as SbResult<T>;
}

export async function sbDelete(table: string, id: string): Promise<SbResult<null>> {
  const res = await supabase.from(table).delete().eq('id', id);
  if (res.error) console.error(`[supabase] DELETE ${table}:`, res.error.message);
  return res as SbResult<null>;
}
