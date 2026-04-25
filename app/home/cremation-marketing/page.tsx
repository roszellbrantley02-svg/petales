import { redirect } from 'next/navigation';
import { getAuthedStaff } from '@/lib/auth';

export const metadata = {
  title: 'Cremation memorial marketing kit · Petales',
};

export default async function CremationMarketingPage() {
  const authed = await getAuthedStaff();
  if (!authed) redirect('/signin');

  const homeName = authed.home.name;

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-white border-b border-line px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="serif text-xl font-medium">Petales</span>
          <span className="text-subtle">·</span>
          <span className="text-sm font-medium text-ink">{homeName}</span>
        </div>
        <a href="/home" className="text-muted text-sm hover:text-ink">← Back to console</a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="serif text-3xl font-medium mb-2">Cremation memorial marketing kit</h1>
        <p className="text-muted text-sm mb-8">
          Copy-paste materials for selling the Petales memorial archive as a $300&ndash;$500 add-on with cremation packages.
        </p>

        {/* Why this matters */}
        <section className="bg-white border border-line rounded-2xl p-7 mb-6">
          <h2 className="serif text-xl font-medium mb-3">Why this matters</h2>
          <p className="text-sm text-muted leading-relaxed mb-3">
            Cremation rate is 60%+ today and projected to hit 82% by 2045. Cremation cases pay 30&ndash;50% of what burial cases pay. A memorial archive line item is one of the few ways to bring a direct cremation case from $1,500 to $1,800&ndash;$2,000 without selling more goods.
          </p>
          <p className="text-sm text-muted leading-relaxed">
            Families who choose cremation often still want to honor the person. The archive is what they keep when there&rsquo;s no casket, no cemetery plot, no traditional service. It&rsquo;s a real product worth pricing as one.
          </p>
        </section>

        {/* Sample pricing language */}
        <section className="bg-white border border-line rounded-2xl p-7 mb-6">
          <h2 className="serif text-xl font-medium mb-3">Sample pricing language</h2>
          <p className="text-xs text-muted mb-4 uppercase tracking-wider">For your cremation package menu</p>

          <div className="bg-cream border border-line rounded-lg p-5 serif text-sm leading-relaxed">
            <strong className="text-ink">Memorial Archive Package &mdash; $300</strong>
            <p className="mt-2">
              A private online page for your loved one&rsquo;s family. Relatives contribute memories &mdash; voice notes, stories, photos &mdash; over the days following the service, from any device, with no logins.
              An obituary, eulogy, and program are drafted from their own words.
              The archive belongs to the family forever, with the option to print as a hardcover memorial book.
            </p>
          </div>

          <p className="text-xs text-subtle italic mt-3">
            Adjust the price and copy as needed for your market. Some homes price this at $500&ndash;$800 for higher-touch service tiers.
          </p>
        </section>

        {/* Sample arrangement-conference script */}
        <section className="bg-white border border-line rounded-2xl p-7 mb-6">
          <h2 className="serif text-xl font-medium mb-3">Sample arrangement-conference script</h2>
          <p className="text-xs text-muted mb-4 uppercase tracking-wider">For when a cremation family asks &ldquo;is there anything else?&rdquo;</p>

          <div className="bg-cream border border-line rounded-lg p-5 serif text-sm leading-relaxed italic">
            &ldquo;A lot of families who choose cremation tell us afterward they wish they&rsquo;d done more to honor the person. The cremation itself is a quiet decision. The Memorial Archive Package gives your family a place to put what they remember &mdash; voice notes, stories, photos &mdash; that they&rsquo;ll still be able to visit five, ten, twenty years from now. It&rsquo;s $300, included on top of your cremation package, and we set it up tonight.&rdquo;
          </div>
        </section>

        {/* Sample family-facing one-pager */}
        <section className="bg-white border border-line rounded-2xl p-7 mb-6">
          <h2 className="serif text-xl font-medium mb-3">Sample one-pager for the family</h2>
          <p className="text-xs text-muted mb-4 uppercase tracking-wider">Print and hand to families considering the package</p>

          <div className="bg-cream border border-line rounded-lg p-5 serif text-sm leading-relaxed">
            <p className="mb-2"><strong className="text-ink">A quiet place to keep what was true about them.</strong></p>
            <p className="mb-3">
              The Memorial Archive is your loved one&rsquo;s page on Petales. Your family contributes memories &mdash; voice notes, photos, stories &mdash; from any device, with no logins. We weave them together into the obituary and program.
            </p>
            <p className="mb-3">
              The archive is yours forever. Visit it on the anniversary. Light a candle. Share the link with grandchildren who haven&rsquo;t been born yet.
            </p>
            <p className="text-xs text-muted italic">
              Included in your cremation package. {homeName} cares for the technical side. You bring the memories.
            </p>
          </div>
        </section>

        <p className="text-xs text-subtle italic text-center mt-8">
          For more positioning language, see <code className="text-muted">sales/positioning-one-liners.md</code> in the Petales repo.
        </p>
      </div>
    </div>
  );
}
