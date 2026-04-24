import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-24 h-24 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={48} />
      </div>
      <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
        404
      </h1>
      <p className="text-lg text-slate-400 mb-8 max-w-md font-medium">
        Oops! The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
      >
        <ArrowLeft size={18} /> Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
