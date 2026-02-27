# RMS (Restaurant Management System)

## Project Overview
Web-based restaurant management system for restaurants in Mexico. Servers use iPads (PWA) to take orders, which route to kitchen/bar touchscreen displays in real-time. Kitchen/bar staff mark items ready, servers get notified, bills are calculated with IVA, and payment is recorded.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Database:** PostgreSQL (Neon) + Prisma 5
- **Real-time:** Pusher Channels (public channels for displays, private for server notifications)
- **Styling:** Tailwind CSS v4
- **Auth:** Custom JWT with `jose` + `bcryptjs` (PIN for servers, email/password for admin)
- **i18n:** `next-intl` (Spanish default, English switchable)
- **Deployment:** Vercel + Neon PostgreSQL

## Live URLs
- **Production:** https://rms-blond.vercel.app
- **GitHub:** https://github.com/cvsxy/rms

## Login Credentials
- **Servers:** Maria `1234`, Carlos `5678`, Ana `9012`
- **Admin:** `admin@rms.com` / `admin123`

## Key Routes
| Route | Purpose |
|---|---|
| `/es/pin-login` | Server PIN login (iPad) |
| `/es/admin-login` | Admin email/password login |
| `/es/tables` | Server table grid |
| `/es/tables/[orderId]` | Order view with items |
| `/es/tables/[orderId]/menu` | Menu browser + add items |
| `/es/tables/[orderId]/bill` | Bill + payment |
| `/es/notifications` | Server real-time notifications |
| `/es/kitchen` | Kitchen display (no auth) |
| `/es/bar` | Bar display (no auth) |
| `/es/admin` | Admin dashboard |
| `/es/admin/servers` | Manage servers |
| `/es/admin/menu` | Manage menu categories/items/modifiers |
| `/es/admin/tables` | Manage tables |
| `/es/admin/reports` | Revenue reports with date/server filters |

## Implementation Progress

### Phase 1: Foundation - COMPLETE
- [x] Next.js project setup with TypeScript, Tailwind, App Router
- [x] Prisma schema (10 models) + migration + seed data
- [x] JWT auth library (PIN + admin login)
- [x] next-intl i18n setup (es/en)
- [x] Middleware (locale routing + auth protection)
- [x] PIN login page + admin login page

### Phase 2-3: Server UI + Order Flow - COMPLETE
- [x] 14 CRUD API routes (menu, tables, orders, order-items, payments, servers)
- [x] Server layout with bottom tab navigation
- [x] Table grid (color-coded: green=available, red=occupied)
- [x] Order view with status badges and running total
- [x] Menu browser with category tabs, modifier selection, cart
- [x] Bill view with IVA 16% calculation, cash/card payment
- [x] Kitchen display with elapsed time color coding
- [x] Bar display (same, filtered to bar items)

### Phase 4-5: Admin + Reports - COMPLETE
- [x] Admin layout with sidebar navigation
- [x] Dashboard with today's stats (revenue, orders, open tables)
- [x] Server management (CRUD with PIN)
- [x] Menu management (categories, items, modifiers, bilingual)
- [x] Table management (CRUD)
- [x] Reports page with date filtering and per-server breakdown

### Phase 6: Real-Time (Pusher) - COMPLETE
- [x] Pusher server + client setup
- [x] Order submission triggers kitchen/bar display channels
- [x] Mark-ready triggers server notification channel
- [x] usePusher hook for client subscriptions
- [x] Notifications page with real-time alerts
- [x] Polling fallback (5s) for displays

### Phase 7: UX Polish + Server PWA Layout - COMPLETE
- [x] Server layout overhaul: SVG nav icons, notification badge, 44px+ touch targets, safe area insets
- [x] Table grid: 5s polling, responsive columns (2/3/4), skeleton loading, reserved status
- [x] Order view: color-coded status badges, "Mark Served" on ready items, skeleton
- [x] Menu browser: search bar across categories, larger ±/close buttons, live price preview, clear cart
- [x] Bill page: tip presets (10%/15%/20%/no tip/custom), larger inputs, payment icons
- [x] Notifications: sessionStorage persistence, confirm modal for clear all, larger targets
- [x] PWA: manifest.ts, SVG icons (192/512), service worker with cache-first static assets
- [x] Admin dashboard: recharts bar charts (7-day revenue, hourly orders, top 5 items)
- [x] Reusable Skeleton + ConfirmModal components (replaced all window.confirm)
- [x] CSV export on reports page
- [x] All new i18n keys in es.json and en.json
- [x] Dependency added: recharts

## Database Schema (10 models)
User, Session, MenuCategory, MenuItem, Modifier, RestaurantTable, Order, OrderItem, OrderItemModifier, Payment

## Pusher Channels
- `kitchen` (public) — kitchen display subscribes for new items
- `bar` (public) — bar display subscribes for new items
- `private-server-{userId}` — each server's notification channel

## Environment Variables
```
DATABASE_URL          # Neon PostgreSQL connection string
JWT_SECRET            # JWT signing secret
PUSHER_APP_ID         # Pusher app ID
PUSHER_SECRET         # Pusher secret (server-side only)
NEXT_PUBLIC_PUSHER_KEY     # Pusher key (client-side)
NEXT_PUBLIC_PUSHER_CLUSTER # Pusher cluster (us2)
NEXT_PUBLIC_TAX_RATE       # IVA tax rate (0.16)
NEXT_PUBLIC_CURRENCY       # Currency code (MXN)
```

## Common Commands
```bash
npx prisma migrate dev    # Run migrations locally
npx prisma db seed        # Seed database
npx next build            # Production build
npx next dev --turbopack  # Dev server
```
