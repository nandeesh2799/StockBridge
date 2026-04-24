const StateCard = ({ title, value, icon: Icon }) => {
  return (
    <div className="relative bg-[#111113] border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 shadow-sm">
      {Icon && (
        <div className="absolute top-5 right-5 text-indigo-400 bg-indigo-500/10 p-2 rounded-xl">
          <Icon size={20} />
        </div>
      )}

      {/* Title */}
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
        {title}
      </p>

      {/* Value */}
      <h2 className="text-3xl font-black text-white tracking-tight mt-3">
        {value}
      </h2>
    </div>
  );
};

export default StateCard;
