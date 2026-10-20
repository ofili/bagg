import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Globe, MessageSquare } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-neutral-900">bagg<span className="text-emerald-500">.</span></span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#pricing" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition"
            >
              Open Workspace
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 px-4 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" /> Built for African Freelancers & Creators
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-neutral-900 mb-6 leading-tight">
            Invoice like a pro.<br />
            <span className="text-emerald-600">Get paid without chasing.</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            Build professional invoices in under two minutes. Share via WhatsApp, link or PDF. Give clients exact payment details in NGN, USD, GBP, KES, and let automated polite nudges do the chasing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-sm"
            >
              Create Free Invoice <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/i/token_demo_sample_ngn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition"
            >
              View Client Experience
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 bg-white border-y">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-neutral-50 border">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2">Multi-Currency Profiles</h3>
              <p className="text-sm text-neutral-600">
                Save bank and mobile money accounts per currency (NGN, USD, GBP, EUR, GHS, KES, ZAR). Invoices auto-attach the right details.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2">WhatsApp & Link Delivery</h3>
              <p className="text-sm text-neutral-600">
                Send private shareable invoice links directly into WhatsApp chats. Clients view on mobile without needing an account.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2">Automated Polite Chasing</h3>
              <p className="text-sm text-neutral-600">
                Scheduled friendly reminders go out before, on, and after the due date, plus 1-tap WhatsApp nudges with pre-filled text.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4">Transparent Local Pricing</h2>
          <p className="text-neutral-600 mb-12">Pay as you grow, with local checkout and no card required to start.</p>
          <div className="grid sm:grid-cols-2 gap-8 text-left">
            <div className="p-8 rounded-2xl border bg-white shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Free Starter</div>
              <div className="text-3xl font-black mb-4">₦0 <span className="text-sm font-normal text-neutral-500">forever</span></div>
              <ul className="space-y-3 text-sm text-neutral-600 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited drafts & clients</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> WhatsApp & Web share links</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> "I've paid" verification loop</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3 free PDF/email sends per month</li>
              </ul>
              <Link href="/dashboard" className="block text-center w-full py-2.5 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition">
                Start Free
              </Link>
            </div>

            <div className="p-8 rounded-2xl border-2 border-emerald-500 bg-white shadow-sm relative">
              <div className="absolute top-3 right-4 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase">Popular</div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Creator Pro</div>
              <div className="text-3xl font-black mb-4">₦14,000 <span className="text-sm font-normal text-neutral-500">/ year</span></div>
              <ul className="space-y-3 text-sm text-neutral-600 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Everything in Free</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No Bagg footer branding</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited PDF & Email delivery</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Integrated Paystack / Card links</li>
              </ul>
              <Link href="/dashboard" className="block text-center w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-white text-center text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>© 2026 Bagg Inc. Built for African creators and freelancers.</div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-neutral-900">App</Link>
            <Link href="/i/token_demo_sample_ngn" className="hover:text-neutral-900">Demo Invoice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
