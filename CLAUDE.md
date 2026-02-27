# RMS (Restaurant Management System)

## Project Overview
Web-based restaurant management system for restaurants in Mexico. Servers use iPads (PWA) to take orders, which route to kitchen/bar touchscreen displays in real-time. Kitchen/bar staff mark items ready, servers get native push notifications, bills are calculated with IVA, and payment is recorded.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Database:** PostgreSQL (Neon) + Prisma 5
- **Real-time:** Pusher Channels (public channels for displays, private for server notifications)
- **Push Notifications:** Web Push API with VAPID keys (`web-push` package)
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
| `/es/tables/[orderId]` | Order view with items, void/cancel |
| `/es/tables/[orderId]/menu` | Menu browser with sidebar categories + seat picker |
| `/es/tables/[orderId]/bill` | Bill + payment with seat filtering |
| `/es/my-orders` | Server order history (today + date picker) |
| `/es/notifications` | Server notifications + push subscribe UI |
| `/es/kitchen` | Kitchen display (no auth) |
| `/es/bar` | Bar display (no auth) |
| `/es/admin` | Admin dashboard |
| `/es/admin/servers` | Manage servers |
| `/es/admin/menu` | Manage menu categories/items/modifiers |
| `/es/admin/tables` | Manage tables |
| `/es/admin/inventory` | Ingredient inventory management |
| `/es/admin/reports` | Revenue reports with charts + date ranges |

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

### Phase 8: Workflow Fixes + Seat Support + Push Notifications - COMPLETE
- [x] iOS safe area CSS fix (`@utility safe-area-top/bottom` in globals.css)
- [x] Web Push notifications (VAPID keys, `web-push` package, PushSubscription model)
  - Service worker push/notificationclick handlers
  - `/api/push/subscribe` and `/api/push/unsubscribe` API routes
  - `src/lib/webpush.ts` helper with lazy VAPID initialization
  - Push sent on item READY via `sendPushToUser()` in order-items status route
  - Enable banner in ServerLayout + subscribe UI on notifications page
- [x] Menu category sidebar (always-visible vertical sidebar on all screen sizes, replaces horizontal scroll)
- [x] Cancel order with cascading item cancellation + table auto-release
- [x] Void individual items (CANCELLED status with strikethrough UI)
- [x] Seat number support
  - `seatNumber Int?` field on OrderItem (migration applied)
  - Seat picker in menu item modal (1-N buttons based on table seats)
  - Purple seat badges on order view, bill page, kitchen/bar displays
  - Seat-based bill filtering with per-seat subtotals
- [x] Kitchen/bar display improvements
  - Timer freezes green when all items READY (uses readyAt timestamps)
  - Collapsible completed orders (chevron toggle)
  - Prominent item notes with yellow background + 📝 emoji
- [x] Server order history page (`/my-orders`) with date picker, expandable order cards
- [x] 3-tab bottom nav (Tables → My Orders → Notifications)
- [x] Notification page overhaul
  - localStorage (survives iOS PWA close) replaces sessionStorage
  - Push subscribe UI with enabled/blocked states
  - Visibility change catch-up polling via `/api/notifications` endpoint
- [x] Cart footer fixed-positioned above bottom nav (always visible)
- [x] All new i18n keys in es.json and en.json
- [x] Dependencies added: web-push, @types/web-push

### Phase 9: Admin Overhaul — Inventory, Reports, Dashboard, Table Layout - COMPLETE
- [x] Inventory management system
  - New Prisma models: Ingredient, MenuItemIngredient, RestaurantSetting
  - Full CRUD API at `/api/inventory` with stock adjustments and low-stock alerts
  - Admin inventory page with search, stock status indicators, "Receive Delivery" bulk modal
  - Menu item form updated to link ingredients with quantity-per-serving
  - Auto-deduct ingredient stock when orders submitted to kitchen/bar
  - "Inventory" nav item added to admin sidebar
- [x] Reports overhaul
  - New server-side aggregation API at `/api/reports` (replaces client-side computation)
  - Date range presets: Today, Yesterday, This Week, This Month, Custom
  - Recharts visualizations: AreaChart (revenue over time), PieChart (categories, payment methods),
    BarChart (orders by hour, top 10 items)
  - Sortable server performance table
  - Enhanced CSV export with summary + server breakdown
- [x] Dashboard redesign (professional SaaS look)
  - White stat cards with colored icons and trend indicators (↑/↓ vs yesterday)
  - AreaChart with gradient fill for 7-day revenue (replaces plain bar chart)
  - Recent orders activity feed with status badges and relative timestamps
  - Quick actions grid linking to admin pages (with low-stock badge on Inventory)
- [x] Table layout / custom arrangement
  - `posX`/`posY` fields on RestaurantTable + `RestaurantSetting` model for toggle
  - Admin: List View / Layout View toggle with @dnd-kit drag-and-drop editor
  - 800×600 canvas with dotted grid background, draggable table cards
  - "Enable Custom Layout" checkbox persists to settings API
  - Server tables page renders matching positioned layout when enabled
  - `/api/tables/positions` for batch position saves, `/api/settings` for config
- [x] Dependencies added: @dnd-kit/core, @dnd-kit/utilities
- [x] 40+ new i18n keys in both EN and ES (inventory, reports, tables, admin sections)

## Database Schema (15 models)
User, Session, MenuCategory, MenuItem, Modifier, RestaurantTable, Order, OrderItem, OrderItemModifier, Payment, PushSubscription, Ingredient, MenuItemIngredient, RestaurantSetting

## Pusher Channels
- `kitchen` (public) — kitchen display subscribes for new items + status changes
- `bar` (public) — bar display subscribes for new items + status changes
- `private-server-{userId}` — each server's notification channel

## Environment Variables
```
DATABASE_URL               # Neon PostgreSQL connection string
JWT_SECRET                 # JWT signing secret
PUSHER_APP_ID              # Pusher app ID
PUSHER_SECRET              # Pusher secret (server-side only)
NEXT_PUBLIC_PUSHER_KEY     # Pusher key (client-side)
NEXT_PUBLIC_PUSHER_CLUSTER # Pusher cluster (us2)
NEXT_PUBLIC_TAX_RATE       # IVA tax rate (0.16)
NEXT_PUBLIC_CURRENCY       # Currency code (MXN)
NEXT_PUBLIC_VAPID_PUBLIC_KEY  # VAPID public key for Web Push
VAPID_PRIVATE_KEY          # VAPID private key (server-side only)
VAPID_EMAIL                # VAPID contact email
```

## Common Commands
```bash
npx prisma migrate dev    # Run migrations locally
npx prisma db seed        # Seed database
npx next build            # Production build
npx next dev --turbopack  # Dev server
```
