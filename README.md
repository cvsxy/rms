# RMS - Restaurant Management System

A full-featured, bilingual restaurant management system built for restaurants in Mexico. Servers use iPads (PWA) to take orders in real-time, which route to kitchen and bar touchscreen displays. Kitchen/bar staff mark items ready, servers receive push notifications, bills are calculated with IVA, and payment is recorded — all in Spanish and English.

**Live:** [rms-blond.vercel.app](https://rms-blond.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Project Structure](#project-structure)
- [Key Routes](#key-routes)
- [Real-Time System](#real-time-system)
- [Authentication](#authentication)
- [Internationalization](#internationalization)
- [Design System](#design-system)
- [Deployment](#deployment)

---

## Features

### Server (iPad PWA)
- **PIN login** — servers log in with a 4-6 digit PIN
- **Table grid** — color-coded tables (green = available, red = occupied, blue = reserved) with optional custom drag-and-drop layout
- **Order taking** — category sidebar, search, modifier selection, seat assignment (per guest), course assignment (C1-C4)
- **Course firing** — course 1 auto-fires to kitchen/bar; subsequent courses fire manually
- **Bill & payment** — IVA 16% calculation, tip presets (10/15/20%/custom), cash or card, seat-based bill splitting
- **Void & cancel** — void individual items with reason tracking, cancel entire orders
- **Discounts** — apply preset discounts or custom comps, redeem loyalty rewards and gift cards
- **Customer linking** — attach a customer profile to any order by phone number
- **Push notifications** — native Web Push alerts when items are marked ready
- **Order history** — view past orders by date with expandable detail cards
- **In-app guide** — bilingual help documentation accessible from the header

### Kitchen & Bar Displays
- **Real-time order feed** — new items appear instantly via Pusher
- **Elapsed time indicators** — color-coded timers (green → yellow → red)
- **Course grouping** — items organized by course with labels
- **Mark ready** — tap to mark items ready, which notifies the server
- **Ingredient details** — see what goes into each dish
- **Collapsible completed orders** — keep the screen focused on active work

### Admin Dashboard
- **Revenue analytics** — today's stats with trend indicators (vs. yesterday), 7-day revenue chart, hourly order distribution, top-selling items
- **Insight widgets** — void rate, table turnover, payment split (cash vs. card), peak hour
- **Server leaderboard** — ranked by revenue with medal indicators
- **Reports** — date range filtering (today/week/month/custom), area/bar/pie charts, sortable server performance table, CSV export
- **Live operations** — 10-second auto-refresh dashboard with active orders, kitchen/bar queue depths, average prep time, server workload, 86'd item alerts
- **Menu management** — categories, items, modifiers (all bilingual), ingredient linking with quantity-per-serving, 86'd (out of stock) toggle with real-time sync
- **Inventory** — ingredient stock tracking, low-stock alerts, bulk "Receive Delivery" modal, auto-deduction on order submission, auto-86 when stock hits zero
- **Server management** — CRUD with PIN assignment
- **Table management** — list view + drag-and-drop layout editor (800x600 canvas)
- **Discounts** — create percentage or fixed discounts with codes
- **Audit log** — filterable log of all voids, cancellations, payments, stock adjustments, discount applications, and more

### Customer & Loyalty
- **CRM** — customer directory with phone-based lookup, tags (VIP/Regular/Tourist/New), order history, auto-updated visit stats
- **Reservations** — calendar view with 30-minute slots, status workflows (pending → confirmed → seated → completed), waitlist with notify/seat actions, auto-order creation on seating
- **Loyalty program** — configurable points-per-peso, tiered rewards (Bronze/Silver/Gold), points auto-earned on payment, reward redemption on bill
- **Gift cards** — auto-generated 8-character codes, partial redemption, usage history tracking
- **Reservation widget** — iframe-embeddable public booking page for your website, with honeypot spam protection and rate limiting

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Database | PostgreSQL (Neon) + Prisma 5 |
| Real-time | Pusher Channels |
| Push Notifications | Web Push API + VAPID (`web-push`) |
| Styling | Tailwind CSS v4 |
| Auth | Custom JWT (`jose` + `bcryptjs`) + session DB validation |
| Validation | Zod |
| i18n | `next-intl` (Spanish default, English switchable) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Deployment | Vercel + Neon PostgreSQL |

---

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Server PWA │    │   Kitchen   │    │     Bar     │
│   (iPad)    │    │   Display   │    │   Display   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────┬───────┴──────────────────┘
                  │
            ┌─────┴─────┐
            │  Next.js   │──── Pusher Channels (real-time)
            │  API Routes│──── Web Push (notifications)
            └─────┬─────┘
                  │
            ┌─────┴─────┐
            │  Neon      │
            │ PostgreSQL │
            └───────────┘
```

**Flow:** Server submits order → API saves to DB + triggers Pusher → Kitchen/bar displays update instantly → Staff marks item ready → Pusher notifies server + Web Push sent to iPad

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- [Pusher](https://pusher.com) account (for real-time)

### Installation

```bash
# Clone the repository
git clone https://github.com/cvsxy/rms.git
cd rms

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev

# Seed the database with sample data
npx prisma db seed

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000) (redirects to `/es/pin-login`).

### Demo Credentials

| Role | Login | Credentials |
|---|---|---|
| Server | `/es/pin-login` | Maria: `1234`, Carlos: `5678`, Ana: `9012` |
| Admin | `/es/admin-login` | `admin@rms.com` / `admin123` |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Auth
JWT_SECRET="your-secret-key"

# Pusher (real-time)
PUSHER_APP_ID="your-app-id"
PUSHER_SECRET="your-secret"
NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# Web Push Notifications (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
VAPID_EMAIL="mailto:you@example.com"

# App Config
NEXT_PUBLIC_TAX_RATE="0.16"
NEXT_PUBLIC_CURRENCY="MXN"

# WhatsApp (optional — Meta Cloud API)
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_ACCESS_TOKEN="your-access-token"
```

---

## Database

### Schema Overview (28 Models)

The database schema covers the full restaurant operation:

- **Auth:** User, Session
- **Menu:** MenuCategory, MenuItem, Modifier, MenuItemIngredient
- **Orders:** Order, OrderItem, OrderItemModifier, OrderCourse
- **Tables:** RestaurantTable
- **Payments:** Payment, Discount, OrderDiscount
- **Inventory:** Ingredient, RestaurantSetting
- **Customers:** Customer, Reservation, WaitlistEntry
- **Loyalty:** LoyaltyProgram, LoyaltyMember, LoyaltyReward, LoyaltyTransaction
- **Gift Cards:** GiftCard, GiftCardUsage
- **System:** PushSubscription, AuditLog, DailyClose

### Common Commands

```bash
npx prisma migrate dev      # Create + apply migrations
npx prisma db seed           # Seed with sample data
npx prisma studio            # Visual database browser
npx prisma generate          # Regenerate Prisma client
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Locale-prefixed routes (es/en)
│   │   ├── (auth)/               # Auth pages (PIN login, admin login)
│   │   ├── (displays)/           # Kitchen & bar displays (no auth)
│   │   ├── (public)/             # Public pages (reservation widget)
│   │   ├── (server)/             # Server pages (tables, orders, bill)
│   │   └── (admin)/              # Admin pages (dashboard, reports, etc.)
│   ├── api/                      # API routes
│   │   ├── auth/                 # PIN + admin login
│   │   ├── orders/               # Order CRUD + courses
│   │   ├── order-items/          # Item status + void
│   │   ├── menu/                 # Categories, items, availability
│   │   ├── tables/               # Table CRUD + positions
│   │   ├── payments/             # Payment processing
│   │   ├── inventory/            # Stock management
│   │   ├── reservations/         # Reservations + public booking
│   │   ├── customers/            # CRM
│   │   ├── loyalty/              # Loyalty program
│   │   ├── gift-cards/           # Gift cards
│   │   ├── push/                 # Web Push subscribe/unsubscribe
│   │   ├── reports/              # Aggregated reporting
│   │   ├── operations/           # Live ops stats
│   │   ├── discounts/            # Discount CRUD
│   │   ├── audit/                # Audit log queries
│   │   └── settings/             # Restaurant settings
│   └── manifest.ts               # PWA manifest
├── components/
│   ├── guide/                    # Guide components (GuideLayout, GuideSection, etc.)
│   ├── layouts/                  # ServerLayout, AdminLayout
│   ├── ConfirmModal.tsx          # Reusable confirmation dialog
│   └── Skeleton.tsx              # Loading skeleton
├── hooks/
│   └── usePusher.ts              # Pusher subscription hook
├── i18n/                         # next-intl config + routing
├── lib/
│   ├── auth.ts                   # JWT helpers (sign, verify, getSession)
│   ├── api-auth.ts               # Route-level auth guards
│   ├── audit.ts                  # Audit log helper
│   ├── prisma.ts                 # Prisma client singleton
│   ├── pusher.ts                 # Pusher server instance
│   ├── webpush.ts                # Web Push helper
│   └── whatsapp.ts               # WhatsApp API helper
├── messages/
│   ├── en.json / es.json         # Main translations (~570 keys)
│   └── guide-en.json / guide-es.json  # Guide translations (~250 keys)
└── types/                        # Shared TypeScript types
```

---

## Key Routes

### Server (iPad)

| Route | Purpose |
|---|---|
| `/es/pin-login` | Server PIN login |
| `/es/tables` | Table grid with status colors |
| `/es/tables/[orderId]` | Order view with items, void/cancel, course firing |
| `/es/tables/[orderId]/menu` | Menu browser with categories, search, seat + course picker |
| `/es/tables/[orderId]/bill` | Bill with IVA, discounts, loyalty, gift cards, payment |
| `/es/my-orders` | Server order history |
| `/es/notifications` | Notification center + push subscribe |
| `/es/guide` | Server user guide |

### Displays (No Auth)

| Route | Purpose |
|---|---|
| `/es/kitchen` | Kitchen display — real-time order feed |
| `/es/bar` | Bar display — filtered to bar items |

### Admin

| Route | Purpose |
|---|---|
| `/es/admin` | Dashboard with stats, charts, insights |
| `/es/admin/servers` | Manage servers + PINs |
| `/es/admin/menu` | Menu categories, items, modifiers, ingredients |
| `/es/admin/tables` | Table list + drag-and-drop layout |
| `/es/admin/inventory` | Ingredient stock management |
| `/es/admin/reports` | Revenue reports with charts + CSV |
| `/es/admin/operations` | Live operations dashboard |
| `/es/admin/discounts` | Discount / comp management |
| `/es/admin/audit` | Audit log with filters |
| `/es/admin/reservations` | Reservations + waitlist |
| `/es/admin/customers` | Customer CRM directory |
| `/es/admin/loyalty` | Loyalty program config |
| `/es/admin/gift-cards` | Gift card management |
| `/es/admin/widget` | Reservation widget embed code + settings |
| `/es/admin/guide` | Admin + server user guide |

### Public

| Route | Purpose |
|---|---|
| `/es/reserve` | Reservation booking widget (iframe-embeddable) |

---

## Real-Time System

The app uses **Pusher Channels** for real-time updates with a polling fallback (5-second interval for displays).

| Channel | Type | Purpose |
|---|---|---|
| `kitchen` | Public | New items + status changes for kitchen display |
| `bar` | Public | New items + status changes for bar display |
| `menu` | Public | Item availability changes (86'd items) |
| `private-server-{userId}` | Private | Per-server notifications (items ready) |

**Web Push** notifications are sent via VAPID when items are marked READY, so servers receive native push alerts on their iPads even when the app is in the background.

---

## Authentication

Two auth flows, both using JWT (`jose`):

1. **Server PIN login** — 4-6 digit PIN → JWT with `role: "server"`
2. **Admin login** — email + password (bcrypt) → JWT with `role: "admin"`

### Security Features

- **Session DB validation** — every request validates the JWT's `jti` against the `Session` table
- **Logout invalidation** — deleting the session record immediately revokes access
- **Rate limiting** — 5 failed attempts per IP per 60-second window on auth endpoints
- **Auth guards** — `requireAuth()` and `requireAdmin()` helpers on all mutating routes
- **Order item state machine** — enforced status transitions prevent invalid operations
- **Duplicate payment prevention** — atomic transactions with pre-checks
- **Input validation** — Zod schemas on critical mutation endpoints

---

## Internationalization

The app is fully bilingual (Spanish and English) using `next-intl`:

- **Default locale:** Spanish (`es`)
- **Supported:** Spanish (`es`), English (`en`)
- **~820 translation keys** across 4 message files
- All user-facing text, menu items, categories, discount names, and guide content are bilingual
- Locale prefix on all routes (`/es/...`, `/en/...`)

---

## Design System

- **Brand accent:** Indigo-600 (`#4f46e5`) for primary actions, active states, focus rings
- **Semantic colors:** Emerald (revenue/success), Amber (tips/warnings), Red (critical), Indigo (orders/info), Purple (insights)
- **Cards:** `shadow-sm` on all admin cards, colored left borders on stat cards
- **Touch targets:** 44px minimum for all interactive elements (iPad optimization)
- **Safe areas:** iOS PWA safe area inset handling for notch devices
- **Admin utilities:** Reusable CSS classes — `admin-card`, `admin-input`, `admin-select`, `admin-label`

---

## Deployment

The app is deployed on **Vercel** with a **Neon** PostgreSQL database. Pushes to `main` trigger automatic deployments.

```bash
# Production build
npm run build    # Runs: prisma generate && next build

# The app is configured as a PWA with:
# - manifest.ts for app metadata
# - Service worker (sw.js) with cache-first for static assets
# - SVG icons (192x192 and 512x512)
```

### PWA Installation

On iPad Safari, tap **Share → Add to Home Screen** to install as a full-screen app with native push notification support.

---

## License

Private — all rights reserved.
