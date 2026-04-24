import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const Terms = () => {
  return (
    <div className="bg-[#09090b] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-32 w-full">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-slate-500 font-medium mb-12">
          Last Updated: March 2026
        </p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By using the StockBridge platform, you agree to be bound by these
              terms. We provide a professional retail ecosystem designed for
              business growth.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">
              2. Description of Service
            </h2>
            <p>
              StockBridge provides an integrated POS, inventory management, and
              digital ledger system. We reserve the right to update features to
              improve user experience.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">
              3. User Responsibilities
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Maintain the confidentiality of your StockBridge account.</li>
              <li>Ensure the accuracy of GST and billing data entered.</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
