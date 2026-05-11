import { useParams, useOutletContext } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer, Download, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Invoice = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { sales = [], shopProfile = {} } = useOutletContext();
  const sale = sales.find((s) => String(s._id) === String(id));
  const currentLang = i18n.language || "en";

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLang === 'en' ? 'en-IN' : currentLang, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat(currentLang === 'en' ? 'en-IN' : currentLang, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const getItemName = (item) => {
    if (typeof item.name === "string") return item.name;
    return item.name?.[currentLang] || item.name?.en || "";
  };

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold bg-[#09090b]">
        {t("common.noData")}
      </div>
    );
  }

  const shopName = shopProfile.shopName || shopProfile.name || "StockBridge";
  const shopPhone = shopProfile.phone || "+91 00000 00000";
  const shopEmail = shopProfile.email || "support@retailflow.com";
  const shopAddress = shopProfile.address || t("settings.businessSettingsDesc");

  const shopLogo = shopProfile.logo || shopProfile.avatar || null;
  const shopSignature = shopProfile.signature || null;
  const signatoryName =
    shopProfile.signatoryName ||
    shopProfile.ownerName ||
    t("invoice.authorizedSignatory");
  const designation = shopProfile.designation || t("settings.retail");
  const upiId = shopProfile.upiId || "";

  const upiAmount = Number(sale.paymentSplit?.upi || 0);
  const upiLink =
    upiAmount > 0 && upiId
      ? `upi://pay?pa=${upiId}&pn=${shopName}&am=${upiAmount}&cu=INR`
      : null;
  const invoiceNum = sale.invoiceNumber || `SB-${String(sale._id).slice(-6).toUpperCase()}`;

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text(t("invoice.title").toUpperCase(), 140, 25);
      doc.setFontSize(14);
      doc.text(shopName, 14, 20);
      doc.setFontSize(9);
      doc.text(shopAddress, 14, 28, { maxWidth: 100 });
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.text(`${t("invoice.invoiceNo")}: ${invoiceNum}`, 140, 50);
      doc.text(
        `${t("invoice.date")}: ${formatDate(sale.createdAt)}`,
        140,
        56,
      );
      autoTable(doc, {
        startY: 70,
        head: [[
          "#", 
          t("invoice.description").toUpperCase(), 
          t("invoice.price").toUpperCase(), 
          t("invoice.qty").toUpperCase(), 
          t("invoice.total").toUpperCase()
        ]],
        body: sale.items.map((item, i) => [
          i + 1,
          getItemName(item),
          `${item.sellingPrice}`,
          item.quantity,
          `${item.sellingPrice * item.quantity}`,
        ]),
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: { fontSize: 9 },
      });
      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`${t("invoice.total")}: ${sale.totalAmount}`, 140, finalY + 20);
      doc.save(`${invoiceNum}.pdf`);
      toast.success(t("toast.settingsSaved"));
    } catch (_error) {
      toast.error(t("toast.error"));
    }
  };

  return (
    <div className="invoice-print-page bg-[#09090b] min-h-screen p-4 md:p-10 flex justify-center pb-32 print:bg-white print:p-0 print:pb-0">
      <div className="invoice-print-root bg-white text-slate-900 w-full max-w-200 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col min-h-275 rounded-sm overflow-hidden border-t-12 border-indigo-600 print:shadow-none print:rounded-none print:max-w-none print:min-h-0 print:h-auto print:overflow-visible print:border-t-0">
        {/* INVOICE HEADER */}
        <div className="p-10 flex flex-col md:flex-row justify-between gap-8 border-b border-slate-100">
          <div className="space-y-4">
            {shopLogo ? (
              <img
                src={shopLogo}
                alt="Business Logo"
                className="h-16 w-auto object-contain"
                style={{ maxWidth: "200px" }}
              />
            ) : (
              <div className="w-14 h-14 bg-indigo-600 text-white flex items-center justify-center rounded-xl text-2xl font-black">
                {shopName.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {shopName}
              </h2>
              <div className="mt-2 space-y-1 text-slate-500 font-semibold text-xs">
                {shopProfile.gstEnabled && shopProfile.gstin && (
                  <p className="text-indigo-600">{t("settings.gstin")}: {shopProfile.gstin}</p>
                )}
                <p className="flex items-center gap-2">
                  <Phone size={12} /> {shopPhone}
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={12} /> {shopEmail}
                </p>
                <p className="flex items-center gap-2 max-w-62.5">
                  <MapPin size={12} /> {shopAddress}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col justify-between">
            <div>
              <h1 className="text-6xl font-black text-slate-100/80 leading-none">
                {t("billing.invoice").toUpperCase()}
              </h1>
              <div className="mt-4">
                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {t("invoice.invoiceNo")}
                </p>
                <p className="text-lg font-bold text-indigo-600">
                  {invoiceNum}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase">
                {t("invoice.date")}
              </p>
              <p className="text-sm font-bold text-slate-700">
                {formatDate(sale.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="px-10 py-10 flex-1 print:flex-none">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 font-black text-xs uppercase tracking-tighter">
                <th className="pb-4 w-12">#</th>
                <th className="pb-4">{t("invoice.description")}</th>
                <th className="pb-4 text-center">{t("invoice.qty")}</th>
                <th className="pb-4 text-right">{t("invoice.price")}</th>
                <th className="pb-4 text-right">{t("invoice.total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, i) => (
                <tr key={i} className="group print:break-inside-avoid">
                  <td className="py-5 text-slate-400 font-bold">{i + 1}</td>
                  <td className="py-5">
                    <p className="font-black text-slate-800">
                      {getItemName(item)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {t("settings.retail")}
                    </p>
                  </td>
                  <td className="py-5 text-center font-bold text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="py-5 text-right font-semibold text-slate-600">
                    {formatCurrency(item.sellingPrice)}
                  </td>
                  <td className="py-5 text-right font-black text-slate-900">
                    {formatCurrency(item.sellingPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY & PAYMENTS */}
        <div className="p-10 bg-slate-50/50 border-t border-slate-100 mt-auto print:mt-0 print:break-inside-avoid-page">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 print:break-inside-avoid-page">
            {/* UPI QR Code */}
            <div className="w-full md:w-auto">
              {upiLink && (
                <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="p-1 bg-white">
                    <QRCodeSVG value={upiLink} size={70} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                      {t("invoice.upiPayment")}
                    </p>
                    <p className="text-xs font-bold text-slate-500 max-w-30">
                      {t("billing.upi")}: {formatCurrency(upiAmount)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Totals + Signature */}
            <div className="w-full md:w-72 space-y-4 print:break-inside-avoid-page">
              <div className="flex justify-between items-center text-slate-500 font-bold text-sm">
                <span>{t("billing.item")}</span>
                <span>{sale.items.length}</span>
              </div>
              {sale.paymentSplit?.cash > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-semibold text-sm">
                  <span>{t("billing.cash")}</span>
                  <span>{formatCurrency(sale.paymentSplit.cash)}</span>
                </div>
              )}
              {sale.paymentSplit?.upi > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-semibold text-sm">
                  <span>{t("billing.upi")}</span>
                  <span>{formatCurrency(sale.paymentSplit.upi)}</span>
                </div>
              )}
              {(sale.paymentSplit?.credit ?? sale.paymentSplit?.ucredit ?? 0) >
                0 && (
                <div className="flex justify-between items-center text-rose-500 font-semibold text-sm">
                  <span>{t("billing.credit")}</span>
                  <span>
                    {formatCurrency(sale.paymentSplit?.credit ?? sale.paymentSplit?.ucredit)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-4 border-y border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  {t("invoice.total")}
                </span>
                <span className="text-3xl font-black text-slate-900">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>

              {/* Signature section */}
              <div className="pt-4 text-right print:break-inside-avoid-page">
                <div className="h-16 flex items-end justify-end mb-2">
                  {shopSignature ? (
                    <img
                      src={shopSignature}
                      className="max-h-16 max-w-full object-contain"
                      alt="Signature"
                      style={{ filter: "brightness(0)" }}
                    />
                  ) : (
                    <div className="w-40 border-b-2 border-dashed border-slate-300" />
                  )}
                </div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {signatoryName}
                </p>
                <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
                  {designation}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center border-t border-slate-100 pt-6 print:mt-8 print:break-inside-avoid-page">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Powered by StockBridge • {t("invoice.thanks")}
            </p>
          </div>
        </div>
      </div>

      {/* ACTION FABs */}
      <div className="fixed bottom-8 right-8 flex flex-col md:flex-row gap-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-[#111113] text-white px-8 py-4 rounded-2xl font-black shadow-2xl hover:bg-black transition-all flex items-center gap-3 active:scale-95"
        >
          <Printer size={20} /> {t("common.confirm")}
        </button>
        <button
          onClick={downloadPDF}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95"
        >
          <Download size={20} /> {t("common.save")}
        </button>
      </div>
    </div>
  );
};

export default Invoice;
