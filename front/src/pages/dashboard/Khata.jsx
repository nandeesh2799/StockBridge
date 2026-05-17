import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Users,
  MessageCircle,
  ChevronRight,
  X,
  Clock,
  ShoppingBag,
} from "lucide-react";
import API from "../../api/axiosInstance";
import jsPDF from "jspdf";

const Khata = () => {
  const { t, i18n } = useTranslation();
  const { customers, setCustomers, shopProfile } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  const filtered = customers
    .filter((c) => c.totalCredit > 0)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm),
    )
    .sort((a, b) => b.totalCredit - a.totalCredit);

  const totalOutstanding = customers.reduce(
    (sum, c) => sum + (c.totalCredit || 0),
    0,
  );

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount("");
    setPaymentNote("");
    setPurchaseHistory(null);
    setLoadingHistory(true);
    try {
      const res = await API.get(`/customers/${customer._id}/history`);
      setPurchaseHistory(res.data.data);
    } catch (err) {
      console.error("Failed to load customer history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleReceivePayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0)
      return toast.error(t("validation.invalidAmount"));
    if (amount > selectedCustomer.totalCredit)
      return toast.error(t("validation.paymentExceedsBalance"));
    setIsSubmitting(true);
    try {
      const res = await API.put(`/customers/${selectedCustomer._id}`, {
        paymentAmount: amount,
        paymentNote: paymentNote || t("customers.manualPaymentReceived"),
      });
      const updated = res.data.data;
      setCustomers((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c)),
      );
      setSelectedCustomer(updated);
      setPaymentAmount("");
      setPaymentNote("");
      toast.success(t("toast.paymentReceived", { amount, name: updated.name }));
    } catch (err) {
      toast.error(err.response?.data?.message || t("toast.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleReminder = async () => {
    try {
      const res = await API.post(`/customers/${selectedCustomer._id}/schedule-reminder`, {
        scheduledDate: reminderDate || null,
      });
      const updated = { ...selectedCustomer, nextReminderDate: res.data.data.nextReminderDate };
      setCustomers((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c)),
      );
      setSelectedCustomer(updated);
      toast.success(t("toast.reminderSet"));
      setReminderDate("");
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleWhatsApp = (customer) => {
    const phone = customer.phone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) {
      toast.error(t("validation.invalidPhone"));
      return;
    }
    const upiId = shopProfile?.upiId || "";
    const shopName = shopProfile?.shopName || "StockBridge";
    const upiLink = upiId
      ? `upi://pay?pa=${upiId}&pn=${shopName}&am=${customer.totalCredit}&cu=INR`
      : "";
    const dateStr = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const message = 
      t("whatsapp.statementHeader", { shopName: shopName.toUpperCase() }) +
      t("whatsapp.customerDetails", { customerName: customer.name, phone: customer.phone, date: dateStr }) +
      t("whatsapp.outstandingBalance", { balance: customer.totalCredit.toFixed(2) }) +
      t("whatsapp.reminderBody", { shopName }) +
      (upiLink ? t("whatsapp.upiLink", { upiLink }) : "") +
      t("whatsapp.footer", { shopName });

    const waUrl = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handlePDFStatement = () => {
    const doc = new jsPDF();
    const shopName = shopProfile?.shopName || "StockBridge";
    const customer = selectedCustomer;
    const currentLang = i18n.language === 'en' ? 'en-IN' : i18n.language;
    
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(shopName, 20, 20);
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(t("customers.pdfTitle", { name: customer.name }), 20, 35);
    doc.text(`${t("staff.phone")}: ${customer.phone}`, 20, 45);
    doc.text(`${t("inventory.updated")}: ${new Date().toLocaleDateString(currentLang)}`, 20, 55);
    doc.setFontSize(11);
    let y = 75;
    doc.setFont(undefined, "bold");
    doc.text(t("expenses.date"), 20, y);
    doc.text(t("expenses.category"), 80, y);
    doc.text(t("expenses.amount"), 150, y);
    y += 8;
    doc.setFont(undefined, "normal");
    doc.line(20, y, 190, y);
    y += 8;
    customer.khataHistory?.forEach((entry) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(new Date(entry.date).toLocaleDateString(currentLang), 20, y);
      doc.text(
        entry.transactionType === "CREDIT_GIVEN" ||
        entry.transactionType === "GIVEN_UDHAAR"
          ? t("customers.creditGiven")
          : t("customers.paymentReceived"),
        80,
        y,
      );
      doc.text(
        `${entry.transactionType === "CREDIT_GIVEN" || entry.transactionType === "GIVEN_UDHAAR" ? "-" : "+"}₹${entry.amount}`,
        150,
        y,
      );
      y += 10;
    });
    y += 10;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`${t("customers.outstandingBalance")}: ₹${customer.totalCredit.toFixed(2)}`, 20, y);
    doc.save(`Khata_${customer.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="text-white min-h-screen pb-24 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{t("khata.title")}</h1>
        <p className="text-sm text-slate-400 mt-0.5">{t("khata.subtitle")}</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-sm font-bold">
          {t("khata.totalOutstanding")}: ₹
          {new Intl.NumberFormat(i18n.language === 'en' ? 'en-IN' : i18n.language).format(totalOutstanding)}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <input
            type="text"
            placeholder={t("common.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 panel-tech rounded-xl text-white outline-none focus:border-indigo-500"
          />

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">{t("dashboard.noOutstandingCredit")}</p>
            </div>
          ) : (
            filtered.map((customer) => (
              <div
                key={customer._id}
                onClick={() => handleSelectCustomer(customer)}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedCustomer?._id === customer._id ? "panel-tech border-indigo-500/30" : "panel-tech hover:border-slate-600"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-indigo-400">
                    {customer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.phone}</p>
                    {customer.creditLimit > 0 && (
                      <p className="text-xs text-amber-400 mt-0.5">
                        {t("dashboard.limit")}: ₹
                        {new Intl.NumberFormat(i18n.language === 'en' ? 'en-IN' : i18n.language).format(
                          customer.creditLimit,
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black text-rose-400">
                      ₹
                      {new Intl.NumberFormat(i18n.language === 'en' ? 'en-IN' : i18n.language).format(
                        customer.totalCredit,
                      )}
                    </p>
                    {customer.creditLimit > 0 && (
                      <div className="w-20 h-1 bg-slate-800 rounded-full mt-1">
                        <div
                          className="h-1 bg-rose-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (customer.totalCredit / customer.creditLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </div>
              </div>
            ))
          )}
        </div>

        {selectedCustomer && (
          <div className="lg:w-96 panel-tech rounded-2xl p-5 space-y-5 h-fit lg:sticky lg:top-20">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-white text-lg">
                  {selectedCustomer.name}
                </h3>
                <p className="text-slate-500 text-sm">
                  {selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                {t("khata.totalOutstanding")}
              </p>
              <p className="text-3xl font-black text-rose-400">
                ₹
                {new Intl.NumberFormat(i18n.language === 'en' ? 'en-IN' : i18n.language).format(
                  selectedCustomer.totalCredit,
                )}
              </p>
              {selectedCustomer.creditLimit > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {t("dashboard.limit")}: ₹
                  {new Intl.NumberFormat(i18n.language === 'en' ? 'en-IN' : i18n.language).format(
                    selectedCustomer.creditLimit,
                  )}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {t("khata.receivePayment")}
              </h4>
              <input
                type="number"
                placeholder={t("khata.amountReceived")}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 bg-[#09090b] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder={t("khata.noteOptional")}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full px-4 py-3 bg-[#09090b] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleReceivePayment}
                disabled={isSubmitting || !paymentAmount}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-40 transition-all"
              >
                {isSubmitting ? t("khata.processing") : t("khata.recordPayment")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleWhatsApp(selectedCustomer)}
                className="flex items-center gap-2 justify-center py-3 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-600/30"
              >
                <MessageCircle size={15} /> {t("khata.whatsapp")}
              </button>
              <button
                onClick={handlePDFStatement}
                className="flex items-center gap-2 justify-center py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-500/20"
              >
                {t("khata.pdfStatement")}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Clock size={12} /> {t("khata.scheduleReminder")}
                </h4>
                {selectedCustomer.nextReminderDate && (
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                    {t("khata.scheduled")}: {new Date(selectedCustomer.nextReminderDate).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language)}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#09090b] border border-slate-700 rounded-xl text-white text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleScheduleReminder}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-700"
                >
                  {t("khata.setReminder")}
                </button>
                {selectedCustomer.nextReminderDate && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await API.post(`/customers/${selectedCustomer._id}/schedule-reminder`, {
                          scheduledDate: null,
                        });
                        const updated = { ...selectedCustomer, nextReminderDate: null };
                        setCustomers((prev) =>
                          prev.map((c) => (c._id === updated._id ? updated : c)),
                        );
                        setSelectedCustomer(updated);
                        toast.success(t("khata.reminderCleared"));
                      } catch {
                        toast.error(t("khata.failedToClearReminder"));
                      }
                    }}
                    className="px-4 py-3 bg-rose-500/10 text-rose-400 font-bold rounded-xl text-sm hover:bg-rose-500/20"
                    title={t("khata.clear")}
                  >
                    {t("khata.clear")}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3">
                <ShoppingBag size={12} /> {t("customers.purchaseHistory")}
              </h4>
              {loadingHistory ? (
                <p className="text-xs text-slate-500">{t("common.loading")}</p>
              ) : purchaseHistory?.topItems?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    {purchaseHistory.totalVisits} {t("customers.visits")} · ₹
                    {new Intl.NumberFormat(i18n.language === 'en' ? 'en-IN' : i18n.language).format(
                      purchaseHistory.totalSpent,
                    )}{" "}
                    {t("customers.totalSpent")}
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    {t("customers.mostBoughtItems")}
                  </p>
                  {purchaseHistory.topItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs bg-slate-800/50 px-3 py-2 rounded-lg"
                    >
                      <span className="text-white font-bold">{item.name}</span>
                      <span className="text-indigo-400">
                        {item.quantity} {t("billing.qty")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">{t("customers.noPurchaseHistory")}</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                {t("customers.history")}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedCustomer.khataHistory?.length === 0 ? (
                  <p className="text-xs text-slate-500">{t("customers.noTransactionsYet")}</p>
                ) : (
                  [...(selectedCustomer.khataHistory || [])]
                    .reverse()
                    .map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start text-xs bg-slate-800/50 px-3 py-2 rounded-lg"
                      >
                        <div>
                          <p
                            className={`font-bold ${entry.transactionType === "PAYMENT_RECEIVED" ? "text-emerald-400" : "text-rose-400"}`}
                          >
                            {entry.transactionType === "PAYMENT_RECEIVED"
                              ? t("customers.paymentReceived")
                              : t("customers.creditGiven")}
                          </p>
                          <p className="text-slate-500">{entry.description}</p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-black ${entry.transactionType === "PAYMENT_RECEIVED" ? "text-emerald-400" : "text-rose-400"}`}
                          >
                            {entry.transactionType === "PAYMENT_RECEIVED"
                              ? "+"
                              : "-"}
                            ₹{entry.amount}
                          </p>
                          <p className="text-slate-600">
                            {new Date(entry.date).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language)}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Khata;
