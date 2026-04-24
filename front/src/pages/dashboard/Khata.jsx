import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
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
      return toast.error("Enter a valid payment amount.");
    if (amount > selectedCustomer.totalCredit)
      return toast.error("Payment exceeds outstanding balance.");
    setIsSubmitting(true);
    try {
      const res = await API.put(`/customers/${selectedCustomer._id}`, {
        paymentAmount: amount,
        paymentNote: paymentNote || "Manual payment received",
      });
      const updated = res.data.data;
      setCustomers((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c)),
      );
      setSelectedCustomer(updated);
      setPaymentAmount("");
      setPaymentNote("");
      toast.success(`₹${amount} received from ${updated.name}! 💰`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment recording failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleReminder = async () => {
    try {
      await API.post(`/customers/${selectedCustomer._id}/schedule-reminder`, {
        scheduledDate: reminderDate || null,
      });
      toast.success("Reminder scheduled!");
      setReminderDate("");
    } catch {
      toast.error("Failed to schedule reminder.");
    }
  };

  const handleWhatsApp = (customer) => {
    const phone = customer.phone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) {
      toast.error("Customer phone number is invalid for WhatsApp.");
      return;
    }
    const upiId = shopProfile?.upiId || "";
    const shopName = shopProfile?.shopName || "StockBridge";
    const upiLink = upiId
      ? `upi://pay?pa=${upiId}&pn=${shopName}&am=${customer.totalCredit}&cu=INR`
      : "";
    const message = `Hello ${customer.name},

Your outstanding balance with ${shopName} is ₹${customer.totalCredit}.

${upiLink ? `You can pay using this UPI link:\n${upiLink}\n` : ""}
Please clear your dues at your convenience.

Thank you,
${shopName}`;
    window.open(
      `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handlePDFStatement = () => {
    const doc = new jsPDF();
    const shopName = shopProfile?.shopName || "StockBridge";
    const customer = selectedCustomer;
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(shopName, 20, 20);
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(`Khata Statement — ${customer.name}`, 20, 35);
    doc.text(`Phone: ${customer.phone}`, 20, 45);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 20, 55);
    doc.setFontSize(11);
    let y = 75;
    doc.setFont(undefined, "bold");
    doc.text("Date", 20, y);
    doc.text("Type", 80, y);
    doc.text("Amount", 150, y);
    y += 8;
    doc.setFont(undefined, "normal");
    doc.line(20, y, 190, y);
    y += 8;
    customer.khataHistory?.forEach((entry) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(new Date(entry.date).toLocaleDateString("en-IN"), 20, y);
      doc.text(
        entry.transactionType === "CREDIT_GIVEN" ||
        entry.transactionType === "CREDIT_GIVEN" ||
        entry.transactionType === "GIVEN_UDHAAR"
          ? "Credit Given"
          : "Payment Received",
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
    doc.text(`Outstanding Balance: ₹${customer.totalCredit.toFixed(2)}`, 20, y);
    doc.save(`Khata_${customer.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="text-white min-h-screen pb-24 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Khata Book</h1>
        <p className="text-sm text-slate-400 mt-0.5">Track Credit</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-sm font-bold">
          Total Outstanding: ₹
          {new Intl.NumberFormat("en-IN").format(totalOutstanding)}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <input
            type="text"
            placeholder="Search Customer"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 panel-tech rounded-xl text-white outline-none focus:border-indigo-500"
          />

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No Outstanding Credit</p>
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
                        Limit: ₹
                        {new Intl.NumberFormat("en-IN").format(
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
                      {new Intl.NumberFormat("en-IN").format(
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
                Outstanding
              </p>
              <p className="text-3xl font-black text-rose-400">
                ₹
                {new Intl.NumberFormat("en-IN").format(
                  selectedCustomer.totalCredit,
                )}
              </p>
              {selectedCustomer.creditLimit > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Credit Limit: ₹
                  {new Intl.NumberFormat("en-IN").format(
                    selectedCustomer.creditLimit,
                  )}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Receive Payment
              </h4>
              <input
                type="number"
                placeholder="Amount Received"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 bg-[#09090b] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Note (Optional)"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full px-4 py-3 bg-[#09090b] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleReceivePayment}
                disabled={isSubmitting || !paymentAmount}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-40 transition-all"
              >
                {isSubmitting ? "Processing..." : "Record Payment"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleWhatsApp(selectedCustomer)}
                className="flex items-center gap-2 justify-center py-3 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-600/30"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button
                onClick={handlePDFStatement}
                className="flex items-center gap-2 justify-center py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-500/20"
              >
                PDF Statement
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <Clock size={12} /> Schedule Reminder
              </h4>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#09090b] border border-slate-700 rounded-xl text-white text-sm outline-none"
              />
              <button
                onClick={handleScheduleReminder}
                className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-700"
              >
                Set Reminder
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3">
                <ShoppingBag size={12} /> Purchase History
              </h4>
              {loadingHistory ? (
                <p className="text-xs text-slate-500">Loading...</p>
              ) : purchaseHistory?.topItems?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    {purchaseHistory.totalVisits} Visits · ₹
                    {new Intl.NumberFormat("en-IN").format(
                      purchaseHistory.totalSpent,
                    )}{" "}
                    Total Spent
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    Most Bought Items
                  </p>
                  {purchaseHistory.topItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs bg-slate-800/50 px-3 py-2 rounded-lg"
                    >
                      <span className="text-white font-bold">{item.name}</span>
                      <span className="text-indigo-400">
                        {item.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No Purchase History</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                Transaction History
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedCustomer.khataHistory?.length === 0 ? (
                  <p className="text-xs text-slate-500">No Transactions Yet</p>
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
                              ? "Payment Received"
                              : "Credit Given"}
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
                            {new Date(entry.date).toLocaleDateString("en-IN")}
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
