const PENDING_SALES_KEY = "retailflow_pending_sales";

export const getPendingSales = () => {
  const saved = localStorage.getItem(PENDING_SALES_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const savePendingSale = (sale) => {
  const pending = getPendingSales();
  const newSale = {
    ...sale,
    _id: `offline_${Date.now()}`,
    offline: true,
    createdAt: new Date().toISOString(),
    invoiceNumber: `OFF-${Date.now().toString().slice(-6)}`,
  };
  pending.push(newSale);
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
  return newSale;
};

export const removePendingSale = (offlineId) => {
  const pending = getPendingSales();
  const filtered = pending.filter((s) => s._id !== offlineId);
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(filtered));
};

export const clearPendingSales = () => {
  localStorage.removeItem(PENDING_SALES_KEY);
};
