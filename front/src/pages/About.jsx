import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Rocket, Users, Heart, Globe } from "lucide-react";

const About = () => {
  return (
    <div className="bg-[#09090b] min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
            Our Mission is to <br />
            <span className="text-indigo-500 text-shadow-glow">
              Empower Retailers.
            </span>
          </h1>
          <p className="text-slate-400 text-xl max-w-3xl mx-auto font-medium leading-relaxed">
            StockBridge was born out of a simple idea: bringing enterprise-level
            technology to every small and medium business owner in India.
          </p>
        </div>

        {/* Stats/Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          <AboutCard
            icon={<Rocket className="text-indigo-400" />}
            title="Fast Innovation"
            desc="Building tools that make daily operations 10x faster."
          />
          <AboutCard
            icon={<Users className="text-emerald-400" />}
            title="User Centric"
            desc="Designed specifically for the needs of Indian shopkeepers."
          />
          <AboutCard
            icon={<Heart className="text-rose-400" />}
            title="Trusted Data"
            desc="Your business data is secure, private, and always yours."
          />
          <AboutCard
            icon={<Globe className="text-amber-400" />}
            title="Made in India"
            desc="Proudly built to support the Digital India initiative."
          />
        </div>

        {/* Story Section */}
        <div className="bg-[#111113] border border-slate-800 rounded-[40px] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-2xl">
          <div className="flex-1">
            <h2 className="text-3xl font-black text-white mb-6">
              The StockBridge Story
            </h2>
            <div className="space-y-4 text-slate-400 font-medium leading-relaxed">
              <p>
                In 2026, we noticed that while technology was advancing rapidly,
                thousands of local retailers were still stuck with manual
                notebooks and complicated calculations.
              </p>
              <p>
                StockBridge was created as a solution—a smart, offline-ready, and
                easy-to-use platform that handles everything from stock tracking
                to automated WhatsApp billing. We are more than just a POS; we
                are a business partner.
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/3 aspect-square bg-indigo-600/20 rounded-3xl border border-indigo-500/30 flex items-center justify-center">
            <span className="text-7xl font-black text-indigo-500">SB</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const AboutCard = ({ icon, title, desc }) => (
  <div className="bg-[#111113] border border-slate-800 p-8 rounded-3xl hover:border-indigo-500/50 transition-all group">
    <div className="mb-4 bg-slate-800/50 w-12 h-12 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-sm font-medium">{desc}</p>
  </div>
);

export default About;
