import { redirect, notFound } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { Archive } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Print materials · Petales' };

export default async function PrintHubPage({
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

  const a = archive as Archive;

  const items: { href: string; title: string; sub: string }[] = [
    {
      href: `/home/${slug}/program`,
      title: 'Memorial Program',
      sub: 'Bifold pamphlet handed out at the service. Cover, order of service, eulogy, back.',
    },
    {
      href: `/home/${slug}/poster`,
      title: 'Memorial Poster',
      sub: 'Large single-page poster for the entrance easel.',
    },
    {
      href: `/home/${slug}/prayer-card`,
      title: 'Prayer Cards',
      sub: 'Small folded cards with a prayer + photo + name. 4 per letter sheet.',
    },
    {
      href: `/home/${slug}/qr-cards`,
      title: 'QR Code Cards',
      sub: 'Small cards with a QR code linking to the family’s archive. For attendees to take home.',
    },
    {
      href: `/home/${slug}/photo-album`,
      title: 'Photo Album',
      sub: 'Every contributed photo, laid out one per page with captions.',
    },
    {
      href: `/home/${slug}/thank-you-cards`,
      title: 'Thank-You Cards',
      sub: 'Personalized thank-you for each contributor, ready to print + mail.',
    },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{a.subject_name}</span>
        </div>
        <a href={`/home/${slug}`} className="text-muted text-sm hover:text-ink">
          ← Back to archive
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="serif text-3xl font-medium tracking-tight mb-2">Print materials</h1>
        <p className="text-muted text-sm mb-8">
          Finished, print-ready artifacts for the service and the family. Each pulls from the AI-generated content + the family contributions.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block bg-white border border-line rounded-2xl p-5 hover:border-accent hover:bg-warm/30 transition-colors"
            >
              <div className="serif text-lg font-medium text-ink mb-1">{it.title}</div>
              <div className="text-sm text-muted leading-relaxed">{it.sub}</div>
              <div className="text-xs text-accent mt-3 uppercase tracking-wider">Open →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
