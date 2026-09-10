import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "MizanKhata — shop khata, cash book, stock & daily routine",
  description:
    "A digital udhaar ledger, cash book, stock book and printable bills for Pakistani shopkeepers — plus prayer and routine reminders and a work timer. English, Urdu and Roman Urdu.",
};

export const dynamic = "force-dynamic";

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const I = {
  ledger: "M4 5h11a2 2 0 0 1 2 2v12M4 5v14h13M4 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2M8 9h6M8 13h6",
  cash: "M3 7h18v10H3zM3 7l4-3h10l4 3M12 12h.01M7 12h.01M17 12h.01",
  stock: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
  bill: "M6 2h9l3 3v17l-2-1-2 1-2-1-2 1-2-1-2 1V5a3 3 0 0 1 2-3zM9 8h6M9 12h6M9 16h4",
  report: "M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-6",
  bell: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0",
  timer: "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 2h6",
  shops: "M4 9h16v11H4zM4 9l2-5h12l2 5M8 20v-6h4v6",
  lang: "M4 5h9M9 3v2c0 6-3 9-6 10M6 10c0 3 3 5 7 6M14 20l4-9 4 9M15.5 17h5",
};

const FEATURES = [
  {
    d: I.ledger,
    t: "Udhaar ledger",
    b: "Customers and suppliers, you-gave / you-got, running balance, and a WhatsApp reminder in one tap.",
  },
  {
    d: I.cash,
    t: "Cash book",
    b: "Cash and bank, money in and out with categories, and your daily balance at a glance.",
  },
  {
    d: I.stock,
    t: "Stock book",
    b: "Stock in and out, purchase and sale price, low-stock alerts and full per-item history.",
  },
  {
    d: I.bill,
    t: "Bills & POS",
    b: "Bill in seconds. Print, PDF, WhatsApp or SMS — with your own logo and colours on Premium.",
  },
  {
    d: I.report,
    t: "Reports & filters",
    b: "This month, last month or any dates. Net position, receivables and payables by party.",
  },
  {
    d: I.bell,
    t: "Prayer & routine reminders",
    b: "Fajr to Isha plus your own tasks. Keeps nudging until you respond — even with the app closed.",
  },
  {
    d: I.timer,
    t: "Work timer",
    b: "Start and stop, with daily and weekly totals so you know where your hours went.",
  },
  {
    d: I.shops,
    t: "More than one shop",
    b: "Run separate businesses from a single account, each with its own ledger and stock.",
  },
  {
    d: I.lang,
    t: "Urdu & Roman Urdu",
    b: "The whole app in English, اردو or Roman Urdu. Switch any time from settings.",
  },
];

const FREE = [
  "Udhaar ledger, cash book, stock book",
  "Bills, POS and reports",
  "Prayer & routine reminders, work timer",
  "One business",
  "Bills carry the MizanKhata logo",
];

const PREMIUM = [
  "Everything in Free",
  "Your logo and brand colours on every bill",
  "Priority for new features",
  "Coming: offline sync, multi-device, cloud backup",
];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const signedIn = !!session;

  const appHref = signedIn ? "/work" : "/login";
  const ctaLabel = signedIn ? "Open MizanKhata" : "Get started — free";

  return (
    <div className="min-h-[100dvh] bg-bg text-ink">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            <span className="numeric text-lg font-semibold text-forest">
              MizanKhata
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <a
              href="#features"
              className="hidden px-3 py-2 font-medium text-muted hover:text-ink sm:block"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="hidden px-3 py-2 font-medium text-muted hover:text-ink sm:block"
            >
              Pricing
            </a>
            {signedIn ? null : (
              <Link
                href="/login"
                className="px-3 py-2 font-medium text-forest"
              >
                Sign in
              </Link>
            )}
            <Link
              href={appHref}
              className="rounded-lg bg-forest px-3.5 py-2 font-semibold text-paper"
            >
              {signedIn ? "Open app" : "Get started"}
            </Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="bg-forest text-paper">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold">
              For Pakistani shopkeepers
            </p>
            <h1 className="numeric mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              Your shop&apos;s khata, your day, one app.
            </h1>
            <p className="mt-4 max-w-md text-paper/80">
              Digital udhaar ledger, cash book, stock and printable bills — plus
              prayer and routine reminders that actually reach you. In English,
              Urdu and Roman Urdu.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={appHref}
                className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-forest-deep active:scale-[0.99]"
              >
                {ctaLabel}
              </Link>
              <a
                href="#features"
                className="rounded-xl border border-paper/30 px-5 py-3 text-sm font-semibold text-paper"
              >
                See what&apos;s inside
              </a>
            </div>
            <p className="mt-4 text-xs text-paper/60">
              Free to start · Works like an app on your phone · Your data stays
              yours
            </p>
          </div>

          {/* phone mock */}
          <div className="mx-auto w-full max-w-[260px]">
            <div className="rounded-[2rem] border-4 border-forest-deep/60 bg-paper p-2 shadow-2xl">
              <div className="rounded-[1.6rem] bg-bg p-3 text-ink">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                  <span>Ledger</span>
                  <span>⚙</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  {[
                    ["You'll get", "20,29,848", "text-ok"],
                    ["You'll give", "26,15,200", "text-danger"],
                    ["Net", "−6,40,087", "text-danger"],
                  ].map(([k, v, c]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-line bg-card p-2"
                    >
                      <p className="text-[8px] uppercase text-muted">{k}</p>
                      <p className={`numeric text-[11px] font-semibold ${c}`}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-1.5">
                  {[
                    ["Bhai", "Supplier", "17,86,927", "text-danger"],
                    ["Subhan H/W", "Customer", "8,08,145", "text-ok"],
                    ["Azeem H/w Guj", "Customer", "22,674", "text-ok"],
                  ].map(([n, k, v, c]) => (
                    <div
                      key={n}
                      className="flex items-center justify-between rounded-lg border border-line bg-card px-2.5 py-1.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-semibold">
                          {n}
                        </span>
                        <span className="text-[8px] uppercase text-muted">
                          {k}
                        </span>
                      </span>
                      <span className={`numeric text-[10px] font-semibold ${c}`}>
                        Rs {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* the "personal + shop" angle */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h3 className="numeric text-xl font-semibold text-forest">
              For your shop
            </h3>
            <p className="mt-2 text-sm text-muted">
              Ledger, cash book, stock, bills and reports — the full khata,
              digitised. No more diary, no more &quot;kitna baqi tha?&quot;.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-6">
            <h3 className="numeric text-xl font-semibold text-forest">
              For your day
            </h3>
            <p className="mt-2 text-sm text-muted">
              Prayer reminders that don&apos;t give up, a routine you can build
              yourself, and a timer for your working hours. Nothing else does
              both.
            </p>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="bg-paper">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="numeric text-center text-3xl font-semibold text-forest">
            Everything in one place
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-line bg-card p-5"
              >
                <span className="inline-flex rounded-xl bg-forest/10 p-2 text-forest">
                  <Icon path={f.d} />
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">{f.t}</h3>
                <p className="mt-1 text-sm text-muted">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="numeric text-center text-3xl font-semibold text-forest">
          Simple pricing
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          Start free. Upgrade when you want your own branding on bills.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h3 className="text-lg font-semibold text-ink">Free</h3>
            <p className="numeric mt-1 text-3xl font-semibold text-forest">
              Rs 0
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {FREE.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-ok">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <Link
              href={appHref}
              className="mt-6 block rounded-xl border border-forest px-4 py-2.5 text-center text-sm font-semibold text-forest"
            >
              {ctaLabel}
            </Link>
          </div>

          <div className="relative rounded-2xl border-2 border-forest bg-card p-6">
            <span className="absolute -top-3 right-5 rounded-full bg-gold px-3 py-1 text-[11px] font-semibold text-forest-deep">
              Best value
            </span>
            <h3 className="text-lg font-semibold text-ink">Premium</h3>
            <p className="numeric mt-1 text-3xl font-semibold text-forest">
              Rs 5,500{" "}
              <span className="text-sm font-normal text-muted">/ year</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">
              or Rs 1,850 / quarter · Rs 790 / month
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {PREMIUM.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-ok">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <Link
              href={appHref}
              className="mt-6 block rounded-xl bg-forest px-4 py-2.5 text-center text-sm font-semibold text-paper"
            >
              Get started
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Every bill carries a small &quot;Made with MizanKhata&quot; line.
        </p>
      </section>

      {/* faq */}
      <section className="bg-paper">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="numeric text-center text-3xl font-semibold text-forest">
            Questions
          </h2>
          <div className="mt-8 space-y-4">
            {[
              [
                "Is my data safe?",
                "Every account only sees its own records. Nothing is shared between shops, and you can export or delete your data any time.",
              ],
              [
                "Do I need to be online?",
                "You install it once like an app. It needs internet to sync, but it opens instantly and remembers your last screen. Full offline is on the roadmap for Premium.",
              ],
              [
                "Can I use it just for prayers and routine?",
                "Yes. Choose “Personal only” at sign-up and the ledger and shop are hidden. Switch to a shop account whenever you like.",
              ],
              [
                "I already use another khata app. Can I bring my data?",
                "A one-time import from Digikhata statements is being built — parties, balances and history.",
              ],
            ].map(([q, a]) => (
              <div
                key={q}
                className="rounded-2xl border border-line bg-card p-5"
              >
                <p className="font-semibold text-ink">{q}</p>
                <p className="mt-1 text-sm text-muted">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="numeric text-3xl font-semibold">
            Put the diary away.
          </h2>
          <p className="mt-3 text-paper/80">
            Set up your shop in a few minutes. It&apos;s free to start.
          </p>
          <Link
            href={appHref}
            className="mt-7 inline-block rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-forest-deep"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-forest-deep text-paper/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-6 w-6" />
            <span className="numeric font-semibold text-paper">MizanKhata</span>
            <span className="text-paper/40">· {APP_URL}</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-paper">
              Sign in
            </Link>
            <a href="#features" className="hover:text-paper">
              Features
            </a>
            <a href="#pricing" className="hover:text-paper">
              Pricing
            </a>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-paper/40">
          Made in Pakistan · English · اردو · Roman Urdu
        </p>
      </footer>
    </div>
  );
}
