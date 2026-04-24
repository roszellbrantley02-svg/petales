// Landing page — public welcome

export default function LandingPage() {
  return (
    <div>
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-8 py-6 flex justify-between items-center">
        <div className="serif text-2xl font-medium tracking-tight">Petales</div>
        <div className="hidden sm:flex gap-6 text-sm text-muted">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#who" className="hover:text-ink">Who it&apos;s for</a>
          <a href="/home" className="hover:text-ink">For funeral homes</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="serif italic text-muted text-lg mb-5">
          A place for the ones who remember them
        </div>
        <h1 className="serif font-medium text-5xl md:text-6xl leading-tight tracking-tight mb-7">
          Every memory,<br />in one place.
        </h1>
        <p className="text-lg text-muted leading-relaxed max-w-xl mx-auto mb-10">
          In the days after someone you love is gone, memories come from everywhere. A story from a cousin,
          a photo from an old friend, a voice note from the brother who couldn&apos;t fly in. Petales gives the family
          one quiet place to gather what matters — and the funeral home the material to honor them well.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/home"
            className="inline-flex items-center px-6 py-3.5 rounded-lg bg-ink text-white font-medium hover:bg-accent-dark transition-colors"
          >
            See how it works
          </a>
          <a
            href="#who"
            className="inline-flex items-center px-6 py-3.5 rounded-lg border border-line text-ink font-medium hover:border-accent hover:text-accent transition-colors"
          >
            Who it&apos;s for
          </a>
        </div>
      </section>

      {/* Emotional case */}
      <section className="max-w-2xl mx-auto px-8 py-16">
        <p className="serif italic text-2xl leading-relaxed text-ink mb-8">
          When someone you love dies, you&apos;re given 72 hours to remember a whole life.
        </p>
        <p className="text-muted leading-relaxed mb-5 text-lg">
          The obituary is due to the paper. The program has to be printed. The slideshow needs photos by Saturday.
          And in the middle of grief, you&apos;re asked to sit across from a funeral director and summon stories
          you haven&apos;t thought about in years — while your cousin is texting old photos, your aunt is calling
          with stories you&apos;ve never heard, and your father&apos;s best friend is sending a voicemail from California.
        </p>
        <p className="text-muted leading-relaxed mb-5 text-lg">
          It&apos;s too much. The best memories scatter in the noise. The obituary gets written from what was
          easiest to say out loud, not from what was most true.
        </p>
        <p className="text-muted leading-relaxed text-lg">
          Petales changes the shape of those first days. One private page, shared with the family. Every story,
          every photo, every voice note lands there. The archive assembles itself as memories arrive. When it&apos;s
          time to write the obituary or build the slideshow or deliver the eulogy, everything you need is
          already gathered — in the family&apos;s own words.
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">How it works</div>
        <h2 className="serif font-medium text-4xl mb-10 tracking-tight">
          Three small steps, when it matters most.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              t: 'Open a page for them',
              d: 'Your funeral home creates a private page in their name — a photo, the dates, a quiet landing place for what comes next. Takes a minute.',
            },
            {
              n: '02',
              t: 'Share it with everyone',
              d: 'Text the link to anyone who holds memories. No login, no accounts. Family and friends add stories, photos, voice notes, and videos as they remember.',
            },
            {
              n: '03',
              t: 'Build the service from what&apos;s there',
              d: 'The funeral home uses the archive to assemble the obituary, program, slideshow, and eulogy — from the family&apos;s own words. After the service, the page stays. Forever.',
            },
          ].map(step => (
            <div key={step.n} className="bg-white border border-line rounded-2xl p-8">
              <div className="serif text-4xl font-medium text-accent mb-4 leading-none">{step.n}</div>
              <h3 className="serif text-xl font-medium mb-3">{step.t}</h3>
              <p className="text-muted text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: step.d }} />
            </div>
          ))}
        </div>
      </section>

      {/* Promise */}
      <section className="bg-warm py-20 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="serif font-medium text-3xl md:text-4xl leading-tight mb-5">
            Raw material stays human.<br />
            The archive stays yours.
          </h2>
          <p className="text-muted text-lg leading-relaxed mb-4 max-w-lg mx-auto">
            Every memory added to Petales is written by a real person, in their own words. Nothing is
            AI-generated on the family side. The archive belongs to the family forever — exportable at
            any time, in open formats, by design.
          </p>
          <p className="text-muted text-lg leading-relaxed max-w-lg mx-auto">
            We&apos;re building this for the grandchild, not the grandchild&apos;s algorithm.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-20 px-8 max-w-xl mx-auto">
        <h2 className="serif font-medium text-4xl mb-6 tracking-tight leading-tight">
          See how it works.
        </h2>
        <p className="text-muted mb-8">
          Open the funeral home console, create a family archive, and invite the family.
        </p>
        <a
          href="/home"
          className="inline-flex items-center px-6 py-3.5 rounded-lg bg-ink text-white font-medium hover:bg-accent-dark transition-colors"
        >
          Go to console
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-10 px-8 text-center text-xs text-subtle">
        <p className="serif italic text-base text-muted mb-2">A quiet place to gather what matters.</p>
        <p>Kept for generations.</p>
      </footer>
    </div>
  );
}
