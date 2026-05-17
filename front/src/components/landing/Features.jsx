import {
  PackageSearch,
  Zap,
  BookOpenCheck,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Zap,
      title: t("landing.features.billing.title"),
      label: "POS",
      desc: t("landing.features.billing.desc"),
      accent: "#6366f1",
      bg: "from-indigo-500/10 to-transparent",
      border: "border-indigo-500/20 hover:border-indigo-500/50",
    },
    {
      icon: BookOpenCheck,
      title: t("landing.features.khata.title"),
      label: "Credit",
      desc: t("landing.features.khata.desc"),
      accent: "#f59e0b",
      bg: "from-amber-500/10 to-transparent",
      border: "border-amber-500/20 hover:border-amber-500/50",
    },
    {
      icon: PackageSearch,
      title: t("landing.features.inventory.title"),
      label: "Stock",
      desc: t("landing.features.inventory.desc"),
      accent: "#10b981",
      bg: "from-emerald-500/10 to-transparent",
      border: "border-emerald-500/20 hover:border-emerald-500/50",
    },
    {
      icon: BarChart3,
      title: t("landing.features.analytics.title"),
      label: "Reports",
      desc: t("landing.features.analytics.desc"),
      accent: "#f43f5e",
      bg: "from-rose-500/10 to-transparent",
      border: "border-rose-500/20 hover:border-rose-500/50",
    },
    {
      icon: ShieldCheck,
      title: t("landing.features.secure.title"),
      label: "Security",
      desc: t("landing.features.secure.desc"),
      accent: "#0ea5e9",
      bg: "from-sky-500/10 to-transparent",
      border: "border-sky-500/20 hover:border-sky-500/50",
    },
    {
      icon: Smartphone,
      title: t("landing.features.mobile.title"),
      label: "Mobile",
      desc: t("landing.features.mobile.desc"),
      accent: "#8b5cf6",
      bg: "from-violet-500/10 to-transparent",
      border: "border-violet-500/20 hover:border-violet-500/50",
    },
  ];

  return (
    <section id="features" className="py-24 bg-[#09090b] relative">
      {/* Subtle top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-slate-700 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
            {t("landing.features.title")}
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            {t("landing.features.headline")}
            <br />
            <span className="text-slate-500">{t("landing.features.headlineAccent")}</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium">
            {t("landing.features.subheadline")}
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
