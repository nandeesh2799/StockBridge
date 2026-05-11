# StockBridge 🚀

StockBridge is a modern, full-stack POS (Point of Sale) and Inventory Management System designed for retail businesses. It features a robust Node.js backend, a responsive React frontend, and integrated AI analytics to help shop owners manage their business efficiently.

## 🌟 Key Features

### 🛒 Point of Sale (POS)
- **Fast Billing:** Quick item search and barcode scanning.
- **Smart Cart:** Manage items, quantities, and discounts easily.
- **Multi-Payment Split:** Support for Cash, UPI, and Credit (Khata).
- **QR Code Payments:** Dynamic UPI QR generation for instant payments.
- **WhatsApp Invoices:** Send digital receipts directly to customers.

### 📦 Inventory Management
- **Multilingual Support:** Item names and categories in **English, Hindi, and Kannada**.
- **Advanced Barcode Scanning:** Integrated camera and image-based scanning.
- **Online Barcode Lookup:** Automatically fetch product details from global databases.
- **Batch Tracking:** Manage stock quantities, purchase prices, and selling prices.
- **Low Stock Alerts:** Automated warnings for items running low.

### 🤖 AI Business Assistant
- **Real-time Insights:** Get summaries of revenue, profit, and sales performance.
- **Predictive Analytics:** AI-driven suggestions for inventory reordering and top-performing products.
- **Multilingual AI:** Chat with the assistant in your preferred language (English, Hindi, or Kannada).

### 📔 Khata Book (Ledger)
- **Credit Tracking:** Manage customer credit history and outstanding balances.
- **Payment Reminders:** Automated WhatsApp reminders for pending dues.
- **Statement Downloads:** Generate and download PDF statements for customers.

### 📊 Business Intelligence
- **Sales Reports:** Detailed analytics of revenue vs. profit over time.
- **Expense Tracking:** Monitor all business costs for accurate net profit calculation.
- **Staff Management:** Role-based access (Owner, Manager, Cashier) with PIN authentication.

## 🛠️ Tech Stack

- **Frontend:** React, Tailwind CSS, Vite, Lucide React, i18next.
- **Backend:** Node.js, Express, MongoDB, Mongoose.
- **AI Engine:** Groq (Llama 3.1) for high-speed business analytics.
- **Integrations:** ImageKit for logos/signatures, WhatsApp API for notifications.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Groq API Key (for AI features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nandeesh2799/StockBridge.git
   cd StockBridge
   ```

2. **Setup Backend:**
   ```bash
   cd back
   npm install
   # Create a .env file with your credentials (see .env.example)
   npm start
   ```

3. **Setup Frontend:**
   ```bash
   cd ../front
   npm install
   # Create a .env file with VITE_API_URL
   npm run dev
   ```

## 📝 License
This project is licensed under the MIT License.

---
Built with ❤️ by [Nandeesh](https://github.com/nandeesh2799)
