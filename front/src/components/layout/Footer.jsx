import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="py-16 bg-[#09090b] border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4 text-center md:text-left">
          <div className="space-y-4 md:col-span-2">
            <Link
              to="/"
              className="text-white text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2 hover:text-indigo-400 transition-colors"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-[9px] flex items-center justify-center text-white text-[11px] font-black shadow-md shadow-indigo-600/30">
                SB
              </div>
              StockBridge
            </Link>
            <p className="text-slate-400 text-sm max-w-xs mx-auto md:mx-0 font-medium leading-relaxed">
              Smart retail & inventory management system designed to empower the
              modern Indian business owner.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold tracking-wide uppercase text-xs">
              Product
            </h4>
            <ul className="space-y-3 text-slate-400 text-sm font-medium">
              <li>
                <a
                  href="/#features"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Features
                </a>
              </li>
              
            
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold tracking-wide uppercase text-xs">
              Company
            </h4>
            <ul className="space-y-3 text-slate-400 text-sm font-medium">
              <li>
                <Link
                  to="/about"
                  className="hover:text-indigo-400 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-indigo-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm font-medium">
          © {new Date().getFullYear()} StockBridge Solutions. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
