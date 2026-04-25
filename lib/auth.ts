// ——————————————————————————————————————————————————
// Auth helpers — get the current user + the staff record
// (which links them to a funeral home).
//
// Use from any server component, server action, or API route.
// ——————————————————————————————————————————————————

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase-server';
import { supabaseAdmin } from './supabase';
import type { Staff, FuneralHome, Archive } from './types';

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

// ——————————————————————————————————————————————————
// Tenant isolation helpers — every staff-only route that touches
// an archive (or a child of an archive) MUST go through one of these
// to prevent cross-home access.
// ——————————————————————————————————————————————————

export type OwnedArchiveResult =
  | { archive: Archive; authed: AuthedStaff; response?: undefined }
  | { response: NextResponse; archive?: undefined; authed?: undefined };

export type OwnedChildResult =
  | { archiveId: string; authed: AuthedStaff; response?: undefined }
  | { response: NextResponse; archiveId?: undefined; authed?: undefined };

/**
 * Look up an archive by share_slug AND verify it belongs to the signed-in
 * staff's funeral home. Use this in any staff-only API route or page that
 * accepts a slug.
 */
export async function requireOwnedArchiveBySlug(
  slug: string
): Promise<OwnedArchiveResult> {
  const authed = await getAuthedStaff();
  if (!authed) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const admin = supabaseAdmin();
  const { data: archive } = await admin
    .from('archives')
    .select('*')
    .eq('share_slug', slug)
    .single();

  if (!archive) {
    return { response: NextResponse.json({ error: 'Archive not found' }, { status: 404 }) };
  }
  if (archive.home_id !== authed.home.id) {
    // Return 404 (not 403) so we don't leak that the archive exists at another home.
    return { response: NextResponse.json({ error: 'Archive not found' }, { status: 404 }) };
  }

  return { archive: archive as Archive, authed };
}

/**
 * For routes that delete/patch a child resource by its own id (e.g. a memory id,
 * vendor id, wall_note id): look up the parent archive, then verify ownership.
 */
export async function requireOwnedChildById(
  childTable: 'memories' | 'vendors' | 'wall_notes' | 'announcements',
  childId: string
): Promise<OwnedChildResult> {
  const authed = await getAuthedStaff();
  if (!authed) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const admin = supabaseAdmin();
  const { data: child } = await admin
    .from(childTable)
    .select('archive_id')
    .eq('id', childId)
    .single();

  if (!child) {
    return { response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const { data: archive } = await admin
    .from('archives')
    .select('home_id')
    .eq('id', child.archive_id)
    .single();

  if (!archive || archive.home_id !== authed.home.id) {
    return { response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  return { archiveId: child.archive_id, authed };
}
