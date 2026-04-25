// ——————————————————————————————————————————————————
// Auth helpers — get the current user + the staff record
// (which links them to a funeral home).
//
// Use from any server component, server action, or API route.
// ——————————————————————————————————————————————————

import { createSupabaseServerClient } from './supabase-server';
import { supabaseAdmin } from './supabase';
import type { Staff, FuneralHome } from './types';

export interface AuthedStaff {
  staff: Staff;
  home: FuneralHome;
}

export async function getAuthedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getAuthedStaff(): Promise<AuthedStaff | null> {
  const user = await getAuthedUser();
  if (!user) return null;

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('staff')
    .select('*, funeral_homes(*)')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !data) return null;

  // The relationship returns funeral_homes as a nested object
  const home = data.funeral_homes as FuneralHome;
  const staff = { ...data } as unknown as Staff;
  delete (staff as { funeral_homes?: unknown }).funeral_homes;

  return { staff, home };
}

// Convenience: return just the home id, or throw
export async function requireHomeId(): Promise<string> {
  const authed = await getAuthedStaff();
  if (!authed) throw new Error('Not authenticated');
  return authed.home.id;
}
