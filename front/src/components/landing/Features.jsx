import {
  PackageSearch,
  Zap,
  BookOpenCheck,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Fast Billing",
    label: "POS",
    desc: "Bill customers in seconds. Split payments across cash, UPI and credit. Generate professional invoices with QR codes.",
    accent: "#6366f1",
    bg: "from-indigo-500/10 to-transparent",
    border: "border-indigo-500/20 hover:border-indigo-500/50",
  },
  {
    icon: BookOpenCheck,
    title: "Digital Khata",
    label: "Credit",
    desc: "Track credit digitally. Send WhatsApp payment reminders with UPI links. Set credit limits per customer.",
    accent: "#f59e0b",
    bg: "from-amber-500/10 to-transparent",
    border: "border-amber-500/20 hover:border-amber-500/50",
  },
  {
    icon: PackageSearch,
    title: "Smart Inventory",
    label: "Stock",
    desc: "Know your stock at all times. Get low stock alerts before you run out. Track batches and expiry dates.",
    accent: "#10b981",
    bg: "from-emerald-500/10 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
  },
  {
    icon: BarChart3,
    title: "Profit Analytics",
    label: "Reports",
    desc: "See daily and monthly profit, revenue trends, and top-selling items in one clean dashboard.",
    accent: "#f43f5e",
    bg: "from-rose-500/10 to-transparent",
    border: "border-rose-500/20 hover:border-rose-500/50",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Encrypted",
    label: "Security",
    desc: "Your data is encrypted end-to-end and backed up automatically. Role-based access for staff.",
    accent: "#0ea5e9",
    bg: "from-sky-500/10 to-transparent",
    border: "border-sky-500/20 hover:border-sky-500/50",
  },
  {
    icon: Smartphone,
    title: "Works on Mobile",
    label: "Mobile",
    desc: "Optimized for phones and tablets. Your cashier can use it from any device at the counter.",
    accent: "#8b5cf6",
    bg: "from-violet-500/10 to-transparent",
    border: "border-violet-500/20 hover:border-violet-500/50",
  },
];

function Features() {
  return (
    <section id="features" className="py-24 bg-[#09090b] relative">
      {/* Subtle top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-slate-700 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
            Features
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Everything your shop needs,
            <br />
            <span className="text-slate-500">nothing you don't.</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium">
            StockBridge replaces your notebook, calculator, and spreadsheet —
            with a system that actually works for Indian retail.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`group relative bg-[#111113] border rounded-2xl p-7 transition-all duration-300 overflow-hidden cursor-default ${feature.border}`}
              >
                {/* Background gradient on hover */}
                <div
                  className={`absolute inset-0 bg-linear-to-br ${feature.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div className="relative">
                  {/* Label + Icon row */}
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-md"
                      style={{
                        color: feature.accent,
                        background: `${feature.accent}18`,
                      }}
                    >
                      {feature.label}
                    </span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${feature.accent}15` }}
                    >
                      <Icon size={18} style={{ color: feature.accent }} />
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
