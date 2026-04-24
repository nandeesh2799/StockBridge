import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const Privacy = () => {
  return (
    <div className="bg-[#09090b] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-32 w-full">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-slate-500 font-medium mb-12">
          Last Updated: March 2026
        </p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">
              1. Data Sovereignty
            </h2>
            <p>
              At StockBridge, your business data belongs to you. We collect
              account info and operational data only to provide your dashboard
              analytics and invoice generation.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">
              2. Zero-Sell Policy
            </h2>
            <p className="text-white font-bold">
              We do not sell your personal data or your customers' transaction
              history to third-party advertisers.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
