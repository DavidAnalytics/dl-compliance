import { supabase } from '@/lib/supabase';
import type { Worker } from '@/types/database';

// The worker record linked to the signed-in user, for the employee portal.
export async function fetchMyWorker(userId: string): Promise<Worker | null> {
  const { data } = await supabase.from('workers').select('*').eq('app_user_id', userId).maybeSingle();
  return (data as Worker) ?? null;
}
