import API from "./axiosInstance";

export const registerShop = async (data) => {
  const response = await API.post("/auth/register", data);
  return response.data;
};

export const sendLoginOtp = async (data) => {
  const response = await API.post("/auth/send-otp", data);
  return response.data;
};

export const verifyLoginOtp = async (data) => {
  const response = await API.post("/auth/verify-otp", data);
  return response.data;
};

export const loginWithPassword = async (data) => {
  const response = await API.post("/auth/login-password", data);
  return response.data;
};

export const staffLogin = async (data) => {
  const response = await API.post("/auth/staff-login", data);
  return response.data;
};

export const forgotPassword = async (data) => {
  const response = await API.post("/auth/forgot-password", data);
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await API.post("/auth/reset-password", data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await API.put("/auth/change-password", data);
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await API.put("/auth/profile", data);
  return response.data;
};

// Expenses
export const getExpenses = async (params) => {
  const response = await API.get("/expenses", { params });
  return response.data;
};

export const addExpense = async (data) => {
  const response = await API.post("/expenses", data);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await API.delete(`/expenses/${id}`);
  return response.data;
};

// Suppliers
export const getSuppliers = async () => {
  const response = await API.get("/suppliers");
  return response.data;
};

export const addSupplier = async (data) => {
  const response = await API.post("/suppliers", data);
  return response.data;
};

export const recordPurchase = async (supplierId, data) => {
  const response = await API.post(`/suppliers/${supplierId}/purchase`, data);
  return response.data;
};

// Staff
export const getStaff = async () => {
  const response = await API.get("/staff");
  return response.data;
};

export const addStaff = async (data) => {
  const response = await API.post("/staff", data);
  return response.data;
};

export const updateStaff = async (id, data) => {
  const response = await API.put(`/staff/${id}`, data);
  return response.data;
};

export const removeStaff = async (id) => {
  const response = await API.delete(`/staff/${id}`);
  return response.data;
};
