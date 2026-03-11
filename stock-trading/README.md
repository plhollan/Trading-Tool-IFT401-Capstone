# TradeDesk — Stock Trading System

A full-stack stock trading web application built for the IFT401 Capstone.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | AWS EC2 + Nginx |

## Features

### Customer
- Register / login with full name, username, email
- Browse live stock market (auto-refreshes every 30s)
- Buy and sell stocks at current market price
- Deposit and withdraw cash
- View portfolio with live P&L
- Full transaction and order history

### Admin
- Create new stocks (company, ticker, volume, initial price)
- Toggle stocks active/inactive
- Manage market hours (open/close time, timezone)
- Manage market holidays (prevent trades on holidays)
- View all users and their balances
- View and filter all orders system-wide

### System
- Random stock price generator — prices drift gradually using a mean-reverting random walk
- Market hours enforcement — trades blocked outside market hours and on holidays
- Daily OHLC reset — open/high/low/close tracked per trading day
- Price history stored per stock

## Quick Start (Local)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env   # edit JWT_SECRET
node scripts/seed.js   # seed demo data
npm run dev            # starts on :5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev            # starts on :5173 with proxy to :5000
```

Open http://localhost:5173

Demo accounts:
- **Admin:** `admin` / `Admin1234!`
- **Customer:** `demo` / `Demo1234!`

## AWS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step guide.

## Project Structure

```
stock-trading/
├── backend/
│   ├── server.js           # Express entry point
│   ├── db.js               # SQLite setup + schema
│   ├── priceGenerator.js   # Random price engine
│   ├── routes/
│   │   ├── auth.js         # Register, login, /me
│   │   ├── stocks.js       # List, create, toggle stocks
│   │   ├── orders.js       # Place + cancel orders
│   │   ├── portfolio.js    # Holdings, deposit/withdraw, transactions
│   │   ├── admin.js        # Admin: market, holidays, users
│   │   └── market.js       # Market open/close status
│   ├── middleware/
│   │   └── auth.js         # JWT + admin guard
│   ├── utils/
│   │   └── market.js       # isMarketOpen() helper
│   └── scripts/
│       └── seed.js         # Demo data seeder
├── frontend/
│   └── src/
│       ├── pages/          # All page components
│       ├── components/     # Navbar, MarketBanner
│       ├── context/        # AuthContext
│       └── utils/          # API client, formatters
├── DEPLOYMENT.md
└── README.md
```
