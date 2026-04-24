# 🧾 StockBridge – Smart POS & Inventory Management System

StockBridge is a modern Point of Sale (POS) and inventory management system designed for small retail shops. It helps shop owners manage billing, inventory, expenses, and customer credit efficiently with a clean and fast interface.

---

## 🚀 Features

### 🛒 POS & Billing
- Fast and responsive billing system
- Multiple payment modes (Cash, UPI, Credit)
- Split payment support
- Automatic invoice generation

### 📦 Inventory Management
- Add and manage products with batches
- Track stock levels in real time
- Low stock alerts
- Barcode scanner support

### 💰 Expense Tracking
- Automatic expense entry for inventory purchases
- Categorized expense management
- Financial tracking for better insights

### 👥 Customer Management
- Save customer details
- Track credit (udhaar) history
- Automatic customer creation during billing

### 📊 Dashboard & Reports
- Sales overview
- Inventory statistics
- Business insights

### 📱 WhatsApp Integration
- Send bill summary directly to customer via WhatsApp
- Includes items, total, and payment link

### 💳 UPI Payment Support
- Generate QR code for payments
- Direct UPI payment link integration

---

## 🛠️ Tech Stack

**Frontend**
- React.js (Vite)
- Tailwind CSS
- Axios

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB Atlas

**Other Tools**
- ImageKit (for uploads)
- QRCode Generator
- Sonner (toast notifications)

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/nandeesh2799/StockBridge.git
cd StockBridge
cd back
npm install

##Create a .env file in /back:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

IMAGEKIT_PUBLIC_KEY=your_key
IMAGEKIT_PRIVATE_KEY=your_key
IMAGEKIT_URL_ENDPOINT=your_url

##Start backend:

npm run dev
