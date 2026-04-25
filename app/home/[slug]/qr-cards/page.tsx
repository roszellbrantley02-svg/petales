import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import QRCode from 'qrcode';
import QRCardsClient from './QRCardsClient';
import type { Archive } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'QR cards · Petales' };

export default async function QRCardsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const admin = supabaseAdmin();
  const { data: archive } = await admin
    .from('archives')
    .select('*')
    .eq('share_slug', slug)
    .single();
  if (!archive) notFound();
  if (archive.home_id !== authed.home.id) notFound();

  // Generate QR code server-side as data URL (high error correction so a small
  // poster-print or smudged card still scans)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petales-gold.vercel.app';
  const familyUrl = `${appUrl}/p/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(familyUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 600,
    color: { dark: '#2a2623', light: '#ffffff' },
  });

  return (
    <QRCardsClient
      archive={archive as Archive}
      qrDataUrl={qrDataUrl}
      familyUrl={familyUrl}
    />
  );
}
