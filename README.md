<div align="center">

<img src="ChatGPT Image May 5, 2026, 11_02_31 PM.png" alt="StockBridge Logo" width="120" />

# StockBridge 🚀

**A modern, full-stack POS & Inventory Management System built for Indian retail businesses.**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=nodedotjs)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%2FLocal-47A248?logo=mongodb)](https://www.mongodb.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA%203.3-F55036?logo=meta)](https://console.groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#-features) · [Tech Stack](#️-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Environment Variables](#-environment-variables) · [Screenshots](#-screenshots)

</div>

---

## 📋 Overview

StockBridge is a production-ready SaaS POS and inventory platform designed for small-to-medium retail shops in India. It supports **multilingual operation** (English, Hindi, Kannada), **offline-first billing**, **AI-powered business insights**, and a full **Khata (credit ledger)** system — all in a sleek dark-mode UI.

---

## ✨ Features

### 🛒 Point of Sale (POS)
- Lightning-fast item search and **barcode scanning** (camera + USB scanner supported)
- **Online barcode lookup** — auto-fill product details from global databases
- **Smart cart** with quantity controls and per-item discount support
- **Multi-payment split** — Cash, UPI, and Credit (Khata) in one transaction
- **Dynamic UPI QR** generation for instant in-store QR payments
- **WhatsApp invoice sharing** — send digital receipts directly to customers
- **Offline billing** — sales continue without internet and auto-sync on reconnect

### 📦 Inventory Management
- **Multilingual item names** — store names in English, Hindi, and Kannada
- **Batch tracking** — manage multiple stock batches with purchase price, selling price, quantity, and expiry date
- **Advanced barcode scanning** — camera-based and image-upload scanning via ZXing
- **Low stock alerts** — configurable threshold per item with dashboard warnings
- **Stock adjustments** — add, reduce, mark as expired or damaged with reason logs
- **Supplier linking** — associate items with suppliers for reorder tracking

### 🤖 AI Business Assistant (StockBridge AI)
- Powered by **Groq LLaMA 3.3 70B** for high-quality, fast responses
- **Multi-turn conversation** — AI remembers the full chat context
- **Real-time shop data** — AI has live access to:
  - Today's revenue, profit, and sales count
  - Last 7-day and 30-day revenue/profit trends with daily breakdowns
  - Top 8 best-performing products (by revenue)
  - Low stock and out-of-stock items
  - Expense breakdown by category
  - Customer credit outstanding
  - Payment method split (Cash / UPI / Credit)
- **Multilingual AI** — responds in English, Hindi, or Kannada based on shop language
- **Typewriter animation**, message timestamps, regenerate button, and copy support

### 📔 Khata Book (Credit Ledger)
- Track customer credit history and outstanding balances
- **Automated WhatsApp reminders** via cron scheduler for pending dues
- Add payments, record credit given, and manage Udhaar (advance credit)
- Per-customer credit limits with enforcement at POS

### 📊 Business Intelligence & Reports
- Revenue vs. profit charts powered by Recharts
- Detailed **expense tracking** by category (Rent, Salary, Electricity, etc.)
- Invoice history with PDF download and print support
- **Date-range filtering** on all reports

### 👥 Staff Management
- Role-based access: **Owner**, **Manager**, **Cashier**
- Staff **PIN authentication** for quick POS login without passwords
- Add / remove / manage staff members with permission control

### 🏪 Shop Profile & Settings
- Upload shop logo and owner signature via **ImageKit CDN**
- Configure UPI ID, shop address, GSTIN, and default language
- Theme and display preferences

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 7 | Build tool & dev server |
| Tailwind CSS v4 | Utility-first styling |
| React Router v7 | Client-side routing |
| Recharts | Sales & revenue charts |
| React Markdown | AI response rendering |
| i18next | Multilingual support (EN / HI / KN) |
| @zxing/browser | Camera-based barcode scanning |
| Lucide React | Icon system |
| Sonner | Toast notifications |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js (v18+) | Runtime |
| Express.js | Web framework |
| MongoDB + Mongoose | Database & ODM |
| JWT | Authentication |
| Helmet | HTTP security headers |
| Morgan | Request logging |
| Express Rate Limit | API abuse protection |
| node-cron | WhatsApp reminder scheduler |

### Integrations
| Service | Purpose |
|---|---|
| **Groq (LLaMA 3.3 70B)** | AI business assistant |
| **ImageKit** | Image CDN for logos & signatures |
| **Resend** | Transactional email (OTP, password reset) |
| **MongoDB Atlas** | Cloud database (or local MongoDB) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (local installation or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free cluster)
- **Groq API Key** (free at [console.groq.com](https://console.groq.com))

### 1. Clone the Repository

```bash
git clone https://github.com/nandeesh2799/StockBridge.git
cd StockBridge
```

### 2. Setup the Backend

```bash
cd back
npm install

# Copy example env and fill in your values
cp .env.example .env
# Edit .env with your actual credentials (see Environment Variables section below)

npm run dev   # Development server with hot reload
# or
npm start     # Production server
```

### 3. Setup the Frontend

```bash
cd ../front
npm install

# Copy example env and fill in your values
cp .env.example .env
# Set VITE_API_URL to your backend URL (default: http://localhost:5000/api/v1)

npm run dev   # Vite dev server at http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (`back/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/stockbridge
# For Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/stockbridge

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE_IN=7d

# Email (Resend — for OTP and password reset)
RESEND_API_KEY=re_your_resend_api_key

# Image CDN (ImageKit — for logos and signatures)
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint_id

# AI Assistant (Groq — required)
GROQ_API_KEY=gsk_your_groq_api_key
```

### Frontend (`front/.env`)

```env
# Backend API base URL
VITE_API_URL=http://localhost:5000/api/v1

# ImageKit public key (for frontend uploads)
VITE_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
```

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`. Protected routes require a `Bearer <token>` in the `Authorization` header.

| Route | Method | Description |
|---|---|---|
| `/auth/register` | POST | Register a new shop |
| `/auth/login-password` | POST | Login with email/password |
| `/auth/send-otp` | POST | Send OTP for verification |
| `/auth/verify-otp` | POST | Verify OTP |
| `/auth/staff-login` | POST | Staff PIN login |
| `/auth/me` | GET | Get current shop profile |
| `/auth/profile` | PUT | Update shop profile |
| `/auth/forgot-password` | POST | Request password reset |
| `/auth/reset-password` | POST | Reset password with token |
| `/items` | GET / POST | List / create inventory items |
| `/items/:id` | PUT / DELETE | Update / delete item |
| `/items/barcode-lookup/:barcode` | GET | Look up product by barcode |
| `/sales` | GET / POST | List / create sales |
| `/customers` | GET / POST | List / create customers |
| `/customers/:id` | GET / PUT / DELETE | Customer CRUD |
| `/expenses` | GET / POST | List / create expenses |
| `/suppliers` | GET / POST | List / create suppliers |
| `/staff` | GET / POST | List / create staff |
| `/reports/dashboard` | GET | Aggregated dashboard metrics |
| `/ai/chat` | POST | AI assistant query |

---

## 📁 Project Structure

```
StockBridge/
├── back/                        # Node.js + Express backend
│   ├── src/
│   │   ├── config/db.js         # MongoDB connection
│   │   ├── controllers/         # Route handlers
│   │   │   ├── ai.controller.js     # AI assistant (Groq)
│   │   │   ├── auth.controller.js   # Auth & shop profile
│   │   │   ├── item.controller.js   # Inventory
│   │   │   ├── sale.controller.js   # POS & billing
│   │   │   ├── customer.controller.js
│   │   │   ├── expense.controller.js
│   │   │   ├── supplier.controller.js
│   │   │   └── staff.controller.js
│   │   ├── middlewares/         # Auth, rate limiter, language
│   │   ├── models/              # Mongoose schemas
│   │   │   ├── Shop.js          # Shop / owner account
│   │   │   ├── Item.js          # Inventory items (multilingual)
│   │   │   ├── Sale.js          # Transactions
│   │   │   ├── Customer.js      # Khata ledger
│   │   │   ├── Expense.js
│   │   │   ├── Staff.js
│   │   │   └── Supplier.js
│   │   ├── routes/              # Express routers
│   │   └── utils/               # Helpers (Groq client, cache, barcode lookup, cron)
│   ├── app.js                   # Express app setup
│   ├── server.js                # Entry point
│   └── .env.example
│
└── front/                       # React + Vite frontend
    ├── src/
    │   ├── api/axiosInstance.js # Axios client with auth interceptor
    │   ├── components/layout/   # Sidebar, Topbar, Navbar
    │   ├── i18n/                # Translations (EN, HI, KN)
    │   ├── pages/
    │   │   ├── AIChat.jsx       # AI assistant chat UI
    │   │   ├── auth/            # Login, Signup
    │   │   └── dashboard/
    │   │       ├── DashboardHome.jsx
    │   │       ├── POS.jsx          # Point of Sale
    │   │       ├── Inventory.jsx
    │   │       ├── Khata.jsx        # Credit ledger
    │   │       ├── Reports.jsx
    │   │       ├── Expenses.jsx
    │   │       ├── Suppliers.jsx
    │   │       ├── Staff.jsx
    │   │       ├── StockAdjustment.jsx
    │   │       ├── Invoice.jsx
    │   │       ├── Settings.jsx
    │   │       └── Profile.jsx
    │   └── utils/offlineSync.js # Offline sale queue
    └── .env.example
```

---

## 🌐 Multilingual Support

StockBridge supports **3 languages** across the entire app:

| Language | Code | Coverage |
|---|---|---|
| English | `en` | Full UI + AI responses |
| Hindi | `hi` | Full UI + AI responses (हिंदी) |
| Kannada | `kn` | Full UI + AI responses (ಕನ್ನಡ) |

Item names, categories, and AI chat responses all adapt to the shop's configured language.

---

## 📸 Screenshots

<div align="center">
<img src="screenshots/pos2.png" alt="POS Screen" width="45%" />
<img src="SB architecture.png" alt="System Architecture" width="45%" />
</div>

---

## 🔐 Security

- JWT-based authentication with configurable expiry
- HTTP security headers via **Helmet**
- Rate limiting on all API routes (100 req/min production, 1000 dev)
- All protected routes enforce shop-scoped data access (no cross-shop data leakage)
- MongoDB sessions with atomic transactions for POS billing

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Built with ❤️ by [Nandeesh](https://github.com/nandeesh2799)

> For issues, feature requests, or contributions — open a GitHub Issue or Pull Request.
