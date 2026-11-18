import { productById } from '@/data/products';
import { supabase, useSupabase } from './supabaseClient';

/**
 * Live stock from the server (public.products). The catalog ships an opening stock so pages render instantly;
 * these calls replace it with the real number left after other people's orders.
 */
export async function refreshAllStock(): Promise<void> {
  if (!useSupabase) return;
  const { data } = await supabase().from('products').select('id,stock').returns<{ id: number; stock: number }[]>();
  for (const row of data ?? []) {
    const p = productById(row.id);
    if (p) p.stock = row.stock;
  }
}

/** Latest stock for one product (product page, checkout). Falls back to the catalog value offline. */
export async function stockOf(id: number): Promise<number> {
  const p = productById(id);
  if (!useSupabase) return p?.stock ?? 0;
  const { data } = await supabase().from('products').select('stock').eq('id', id).maybeSingle<{ stock: number }>();
  if (p && data) p.stock = data.stock;
  return data?.stock ?? p?.stock ?? 0;
}

