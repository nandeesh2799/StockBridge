import { useNavigate } from "react-router-dom";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import Footer from "../components/layout/Footer";
import { CheckCircle2, ArrowRight, Star, Quote } from "lucide-react";

//Stats Section


//How It Works
const HowItWorks = () => (
  <section className="py-24 bg-[#09090b]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">
          How it works
        </p>
        <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Up and running in minutes.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative">
        <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-linear-to-r from-indigo-500/30 via-indigo-500/60 to-indigo-500/30" />

        {[
          {
            step: "01",
            title: "Create your account",
            desc: "Sign up with your shop name and email. Takes under 2 minutes. No paperwork.",
          },
          {
            step: "02",
            title: "Add your inventory",
            desc: "Add items with prices and stock levels. Import in bulk if you have a list ready.",
          },
          {
            step: "03",
            title: "Start billing",
            desc: "Open POS, scan or search items, and generate bills with UPI QR codes instantly.",
          },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            className="relative bg-[#111113] border border-slate-800 rounded-2xl p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5">
              <span className="text-lg font-black text-indigo-400">{step}</span>
            </div>
            <h3 className="text-lg font-black text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Main Landing Page ─────────────────────────────────────────────────────────
function LandingPage() {
  return (
    <div className="bg-[#09090b] min-h-screen overflow-x-hidden">
      <Hero />
      <Features />
      <HowItWorks />
    
      <Footer />
    </div>
  );
}

export default LandingPage;
