/* eslint-disable no-unused-vars */
import { useParams, useOutletContext } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer, Download, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const Invoice = () => {
  const { id } = useParams();
  const { sales = [], shopProfile = {} } = useOutletContext();
  const sale = sales.find((s) => String(s._id) === String(id));

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold bg-[#09090b]">
        Invoice Not Found
      </div>
    );
  }

  const shopName = shopProfile.shopName || shopProfile.name || "StockBridge";
  const shopPhone = shopProfile.phone || "+91 00000 00000";
  const shopEmail = shopProfile.email || "support@retailflow.com";
  const shopAddress = shopProfile.address || "Business Address Not Configured";

  // Priority: logo 
  const shopLogo = shopProfile.logo || shopProfile.avatar || null;

  // Signature from settings
  const shopSignature = shopProfile.signature || null;
  const signatoryName =
    shopProfile.signatoryName ||
    shopProfile.ownerName ||
    "Authorized Signatory";
  const designation = shopProfile.designation || "Store Owner";
  const upiId = shopProfile.upiId || "";

  const upiAmount = Number(sale.paymentSplit?.upi || 0);
  const upiLink =
    upiAmount > 0 && upiId
      ? `upi://pay?pa=${upiId}&pn=${shopName}&am=${upiAmount}&cu=INR`
      : null;
  const invoiceNum = `SB-${String(sale._id).slice(-6).toUpperCase()}`;

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("TAX INVOICE", 140, 25);
      doc.setFontSize(14);
      doc.text(shopName, 14, 20);
      doc.setFontSize(9);
      doc.text(shopAddress, 14, 28, { maxWidth: 100 });
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.text(`Invoice No: ${invoiceNum}`, 140, 50);
      doc.text(
        `Date: ${new Date(sale.createdAt).toLocaleDateString("en-IN")}`,
        140,
        56,
      );
      autoTable(doc, {
        startY: 70,
        head: [["#", "ITEM DESCRIPTION", "PRICE", "QTY", "TOTAL"]],
        body: sale.items.map((item, i) => [
          i + 1,
          item.name,
          `Rs. ${item.sellingPrice}`,
          item.quantity,
          `Rs. ${item.sellingPrice * item.quantity}`,
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
      doc.text(`Grand Total: Rs. ${sale.totalAmount}`, 140, finalY + 20);
      doc.save(`${invoiceNum}.pdf`);
      toast.success("Invoice saved!");
    } catch (_error) {
      toast.error("PDF Generation Failed");
    }
  };

  return (
    <div className="bg-[#09090b] min-h-screen p-4 md:p-10 flex justify-center pb-32">
      <div className="bg-white text-slate-900 w-full max-w-200 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col min-h-275 rounded-sm overflow-hidden border-t-12 border-indigo-600">
        {/* INVOICE HEADER */}
        <div className="p-10 flex flex-col md:flex-row justify-between gap-8 border-b border-slate-100">
          <div className="space-y-4">
            {/* Shop Logo / Avatar */}
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
                  <p className="text-indigo-600">GSTIN: {shopProfile.gstin}</p>
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
                BILL
              </h1>
              <div className="mt-4">
                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  Invoice Number
                </p>
                <p className="text-lg font-bold text-indigo-600">
                  {invoiceNum}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase">
                Date of Issue
              </p>
              <p className="text-sm font-bold text-slate-700">
                {new Date(sale.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="px-10 py-10 flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 font-black text-xs uppercase tracking-tighter">
                <th className="pb-4 w-12">#</th>
                <th className="pb-4">Description</th>
                <th className="pb-4 text-center">Qty</th>
                <th className="pb-4 text-right">Unit Price</th>
                <th className="pb-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, i) => (
                <tr key={i} className="group">
                  <td className="py-5 text-slate-400 font-bold">{i + 1}</td>
                  <td className="py-5">
                    <p className="font-black text-slate-800">
                      {item.name || "Product Item"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Retail Goods
                    </p>
                  </td>
                  <td className="py-5 text-center font-bold text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="py-5 text-right font-semibold text-slate-600">
                    ₹{item.sellingPrice}
                  </td>
                  <td className="py-5 text-right font-black text-slate-900">
                    ₹{item.sellingPrice * item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY & PAYMENTS */}
        <div className="p-10 bg-slate-50/50 border-t border-slate-100 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            {/* UPI QR Code */}
            <div className="w-full md:w-auto">
              {upiLink && (
                <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="p-1 bg-white">
                    <QRCodeSVG value={upiLink} size={70} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                      Scan to Pay
                    </p>
                    <p className="text-xs font-bold text-slate-500 max-w-30">
                      UPI Amount: ₹{upiAmount}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Totals + Signature */}
            <div className="w-full md:w-72 space-y-4">
              <div className="flex justify-between items-center text-slate-500 font-bold text-sm">
                <span>Total Items</span>
                <span>{sale.items.length}</span>
              </div>
              {sale.paymentSplit?.cash > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-semibold text-sm">
                  <span>Cash</span>
                  <span>₹{sale.paymentSplit.cash}</span>
                </div>
              )}
              {sale.paymentSplit?.upi > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-semibold text-sm">
                  <span>UPI</span>
                  <span>₹{sale.paymentSplit.upi}</span>
                </div>
              )}
              {(sale.paymentSplit?.credit ?? sale.paymentSplit?.ucredit ?? 0) >
                0 && (
                <div className="flex justify-between items-center text-rose-500 font-semibold text-sm">
                  <span>Credit (Due)</span>
                  <span>
                    ₹{sale.paymentSplit?.credit ?? sale.paymentSplit?.ucredit}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-4 border-y border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Grand Total
                </span>
                <span className="text-3xl font-black text-slate-900">
                  ₹{sale.totalAmount}
                </span>
              </div>

              {/* Signature section */}
              <div className="pt-4 text-right">
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

          <div className="mt-12 text-center border-t border-slate-100 pt-6">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Generated via StockBridge • Thank you for your business
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
          <Printer size={20} /> Print Invoice
        </button>
        <button
          onClick={downloadPDF}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95"
        >
          <Download size={20} /> Save as PDF
        </button>
      </div>
    </div>
  );
};

export default Invoice;
