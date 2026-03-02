# RMS (Restaurant Management System)

## Project Overview
Web-based restaurant management system for restaurants in Mexico. Servers use iPads (PWA) to take orders, which route to kitchen/bar touchscreen displays in real-time. Kitchen/bar staff mark items ready, servers get native push notifications, bills are calculated with IVA, and payment is recorded.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Database:** PostgreSQL (Neon) + Prisma 5
- **Real-time:** Pusher Channels (public channels for displays, private for server notifications)
- **Push Notifications:** Web Push API with VAPID keys (`web-push` package)
- **Styling:** Tailwind CSS v4
- **Auth:** Custom JWT with `jose` + `bcryptjs` (PIN for servers, email/password for admin) + session DB validation
- **Validation:** Zod schemas on critical API mutation routes
- **i18n:** `next-intl` (Spanish default, English switchable)
- **Charts:** Recharts (AreaChart, BarChart, PieChart)
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/utilities (table layout editor)
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
| `/es/guide` | Server user guide (bilingual) |
| `/es/kitchen` | Kitchen display (no auth) |
| `/es/bar` | Bar display (no auth) |
| `/es/admin` | Admin dashboard |
| `/es/admin/servers` | Manage servers |
| `/es/admin/menu` | Manage menu categories/items/modifiers |
| `/es/admin/tables` | Manage tables |
| `/es/admin/inventory` | Ingredient inventory management |
| `/es/admin/reports` | Revenue reports with charts + date ranges |
| `/es/admin/operations` | Live operations dashboard (auto-refresh) |
| `/es/admin/discounts` | Discount/comp management |
| `/es/admin/audit` | Audit log with filters |
| `/es/admin/guide` | Admin & manager user guide (bilingual, includes server guide) |
| `/es/admin/reservations` | Reservation management + waitlist |
| `/es/admin/customers` | Customer CRM directory |
| `/es/admin/loyalty` | Loyalty program settings + rewards + members |
| `/es/admin/gift-cards` | Gift card management |

## Design System
- **Brand accent:** Indigo-600 (`#4f46e5`) for primary actions, active states, focus rings
- **Semantic colors:** Emerald for revenue/success, Amber for tips/warnings, Red for critical, Indigo for orders/info, Purple for insights, Sky for neutral
- **Cards:** `shadow-sm` on all admin cards, colored left borders on stat cards
- **Charts:** Emerald for revenue, Indigo for orders, varied palette for top items, CartesianGrid on all charts
- **Admin utilities:** `admin-card`, `admin-input`, `admin-select`, `admin-label` defined in globals.css

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
- [x] Sample inventory seed data
  - 40 realistic ingredients (proteins, produce, dairy, tortillas, sauces, spirits, mixers, beer, pantry) — all bilingual EN/ES
  - Every menu item linked with accurate quantities per serving
  - Standalone `prisma/seed-ingredients.ts` for seeding existing databases
  - Updated main `prisma/seed.ts` for future full re-seeds
- [x] Ingredient UI across app
  - Admin menu: ingredient picker per item with dropdown + quantity-per-serving inputs
  - Server menu: collapsible "What's in this" section in item detail sheet
  - Kitchen/bar displays: ingredient details shown per order item
  - Menu items API includes ingredients in GET response
  - 6 new `menu.*` i18n keys (EN + ES)

### Phase 10: Admin Upgrade — Operations, 86'd Items, Discounts, Audit Log - COMPLETE
- [x] Audit log system
  - New `AuditLog` model with `AuditAction` enum (ITEM_VOIDED, ORDER_CANCELLED, PAYMENT_PROCESSED, DISCOUNT_APPLIED, ITEM_86D, STOCK_ADJUSTED)
  - Shared `src/lib/audit.ts` helper called from all mutating API routes
  - Admin audit log page (`/admin/audit`) with filterable table (action, server, date range), pagination
  - All voids, cancellations, payments, stock adjustments, and discount applications logged
- [x] Void reasons
  - `voidReason` and `voidNote` fields on OrderItem
  - Server void modal with 5 reason categories (Server Mistake, Kitchen Mistake, Out of Stock, Customer Request, Other) + optional note
  - Void details included in audit log entries
- [x] 86'd items (out of stock)
  - `available` boolean on MenuItem, PATCH toggle at `/api/menu/items/[id]/availability`
  - Admin menu page: availability toggle button + red "86'd" badge
  - Server menu: grayed-out items with "86'd" label, disabled interaction
  - Auto-86: when order submission depletes ingredient stock to 0, linked menu items automatically marked unavailable
  - Pusher `menu` channel with `item-availability-changed` event for real-time sync
- [x] Discounts & comps
  - New `Discount` and `OrderDiscount` models with `DiscountType` enum (PERCENTAGE, FIXED)
  - Admin discounts page (`/admin/discounts`) with full CRUD (name EN/ES, type, value, code)
  - Server bill page: "Apply Discount" button with preset selection + custom comp tab
  - Applied discounts shown as removable chips on bill
  - Payment calculation: `(subtotal - discount) * taxRate`, discount stored on Payment record
  - All discount applications logged to audit trail
- [x] Live operations dashboard
  - `/api/operations` endpoint with real-time stats (parallel Prisma queries)
  - Admin operations page (`/admin/operations`) with 10-second auto-refresh
  - 4 stat cards: active orders, kitchen queue, bar queue, avg prep time
  - Orders-by-status progress bars, server workload table, 86'd items alert
- [x] Admin sidebar expanded: 3 new nav items (Operations, Discounts, Audit Log) with SVG icons
- [x] 60+ new i18n keys in both EN and ES (operations, discounts, audit, void, menu86 sections)

### Phase 11: Admin UI/UX — SaaS Design Upgrade - COMPLETE
- [x] Admin UI redesigned for SaaS product feel
  - Indigo-600 brand accent replacing gray-900 for all primary actions
  - Semantic color coding (emerald revenue, amber tips, indigo orders, purple insights)
  - Colored left borders on dashboard stat cards
  - Multi-color charts (emerald revenue area, indigo order bars, varied palette for top items)
  - CartesianGrid added to all charts, shadow-sm restored on all admin cards
  - Admin utility classes in globals.css (admin-card, admin-input, admin-select, admin-label)
- [x] 4 new dashboard insight widgets
  - Void rate (color-coded green/amber/red thresholds)
  - Table turnover (covers + avg cover time in minutes)
  - Payment split (cash vs card with progress bar)
  - Peak hour (busiest hour + order count)
- [x] Server leaderboard with gold/silver/bronze medal colors
- [x] Operations page: colored stat card borders, semantic progress bars (blue/amber/green)
- [x] Reports: indigo tab indicators, emerald/indigo chart colors
- [x] Color refresh across all 20 admin page files (buttons, focus rings, hover states, table headers)
- [x] 6 new i18n keys (voidRate, tableTurnover, avgCoverTime, paymentSplit, peakHour, items)

### Phase 12: In-App User Guides — Bilingual - COMPLETE
- [x] Server guide at `/guide` (8 sections)
  - Getting Started, Tables, Taking Orders, Managing Orders, Bills & Payment, Notifications, My Orders, Tips & Tricks
- [x] Admin guide at `/admin/guide` (18 sections — includes all server content + 10 admin sections)
  - Dashboard, Managing Servers, Managing the Menu, Managing Tables, Inventory, Reports, Live Operations, Discounts, Audit Log, Kitchen & Bar Displays
- [x] Dedicated guide message files (`guide-en.json`, `guide-es.json`) with ~170 keys each
  - Merged into main messages via `i18n/request.ts` spread pattern
  - Accessed via `useTranslations('guide')` namespace
- [x] Shared `ServerGuideSections` component used by both pages (zero content duplication)
- [x] Guide components: `GuideLayout` (sticky TOC sidebar + IntersectionObserver active tracking), `GuideSection` (anchor IDs + scroll-mt), `GuideCallout` (tip/important/note boxes)
- [x] Mobile support: collapsible TOC accordion, back-to-top button with safe-area offset
- [x] Navigation links: `?` help icon in server header, "Guide" book icon in admin sidebar footer
- [x] Full bilingual content (ES + EN) with friendly, casual tone
- [x] 2 new common i18n keys (help, guide) in en.json + es.json

### Phase 13: Security Hardening & Data Integrity - COMPLETE
- [x] API auth guards on all mutating/sensitive routes
  - New `src/lib/api-auth.ts` with `requireAuth()` and `requireAdmin()` helpers (discriminated union return types)
  - `requireAdmin()` on 16 admin routes: servers, menu items, categories, tables, positions, inventory, settings, reports, daily-close, discounts
  - `requireAuth()` on 4 server routes: order items, order status, payments, order item voids
  - Kitchen/bar display status updates (READY, PREPARING, SERVED) remain unauthenticated
- [x] Session DB validation + logout invalidation
  - `getSession()` now validates JWT `jti` against `Session` table in DB on every request
  - Logout deletes Session record from DB, immediately invalidating intercepted tokens
  - Deleted/deactivated users lose access instantly (no waiting for JWT expiry)
- [x] Duplicate payment prevention
  - `findFirst` check before payment creation returns 409 Conflict
  - Order status check blocks payment on CLOSED/CANCELLED orders
  - Payment + order close + table release wrapped in `prisma.$transaction()` for atomicity
- [x] Order item status state machine
  - `VALID_TRANSITIONS` map: PENDING→SENT→PREPARING→READY→SERVED (terminal)
  - CANCELLED allowed from any non-terminal state, blocked from SERVED/CANCELLED
  - Prevents fraudulent voids after delivery
- [x] Discount validation
  - Type must be PERCENTAGE or FIXED, value must be positive
  - Percentage capped at 100%, fixed capped at order subtotal
- [x] Stock floor protection
  - `updateMany` clamps negative ingredient stock to 0 after decrement operations
- [x] Rate limiting on auth endpoints
  - In-memory rate limiting (5 failed attempts per IP per 60-second window) on both PIN and admin login
  - Uses `Map<string, { count, resetAt }>` pattern
- [x] Zod input validation on critical mutation routes
  - Payment: orderId, method enum, tip >= 0
  - Server creation: name length, PIN digits-only 4-6 chars
  - Discount creation: name EN/ES, type enum, value, percentage cap refinement
- [x] Dependency added: zod

### Phase 14: Reservations, CRM, Coursing, Loyalty & Gift Cards - COMPLETE
- [x] 10 new Prisma models + 3 new enums + migration
  - Customer, Reservation, WaitlistEntry, OrderCourse, LoyaltyProgram, LoyaltyMember, LoyaltyTransaction, LoyaltyReward, GiftCard, GiftCardUsage
  - ReservationStatus, ReservationSource, LoyaltyTxType enums
  - Modified Order (+customerId, +courses), OrderItem (+courseNumber), RestaurantTable (+reservations), AuditAction (+6 actions)
- [x] Customer CRM
  - Customer model with phone as primary lookup key (Mexico standard)
  - CRUD API at `/api/customers` with search, tag filters, pagination
  - Phone-based quick-lookup at `/api/customers/lookup` for server use
  - Link customer to order at `/api/orders/[id]/customer`
  - Admin customers page with directory, detail panel, order history
  - Tags: VIP, Regular, Tourist, New
- [x] Reservation system
  - Full CRUD at `/api/reservations` with date/status filtering
  - Confirm, seat, cancel, no-show status workflows
  - Seat action auto-creates order + marks table occupied (prisma.$transaction)
  - Availability API generates 30-min slots with capacity checking
  - Admin reservations page with date presets, status tabs, create/edit modal
  - Waitlist management at `/api/waitlist` with notify/seat/cancel actions
- [x] WhatsApp integration (Meta Cloud API)
  - `src/lib/whatsapp.ts` helper with `sendTemplate()` and `sendMessage()`
  - `/api/whatsapp/send` endpoint for template or free-form messages
  - Graceful fallback if env vars not configured
- [x] Course firing system
  - OrderCourse model tracks fired status per course per order
  - Course 1 auto-fires; courses 2+ stay PENDING until explicitly fired
  - Fire course API at `/api/orders/[id]/courses/fire` → updates PENDING→SENT, triggers Pusher
  - Course control bar on order view with fire button
  - Course picker (C1-C4) in menu item modal
  - Kitchen/bar displays group items by course with labels
- [x] Loyalty program
  - LoyaltyProgram, LoyaltyMember, LoyaltyReward, LoyaltyTransaction models
  - Program settings + rewards CRUD at `/api/loyalty/*`
  - Points auto-earned on payment (pointsPerPeso × order total)
  - Redeem rewards as OrderDiscount at `/api/loyalty/redeem`
  - Tier system: Bronze, Silver, Gold
  - Admin loyalty page with program config, rewards table, members list
  - Bill page: loyalty section shows points balance + redeem button
- [x] Digital gift cards
  - GiftCard + GiftCardUsage models
  - Auto-generated 8-char codes with collision retry
  - CRUD at `/api/gift-cards/*`, lookup by code, partial redemption
  - Redeem as OrderDiscount (FIXED type) at `/api/gift-cards/redeem`
  - Admin gift cards page with stats, create modal, detail with usage history
  - Bill page: gift card code entry + balance lookup + redeem
- [x] Admin sidebar updated: new "Customers" nav group with 4 items (Reservations, Customers, Loyalty, Gift Cards)
- [x] Customer stats auto-updated on payment (totalVisits++, totalSpent, lastVisit)
- [x] Mobile responsiveness pass: responsive column hiding on all admin tables, 44px min touch targets, stacking grids on mobile
- [x] ~155 new i18n keys in both EN and ES (reservations, customers, loyalty, giftCards, courses namespaces)

## Database Schema (28 models)
User, Session, MenuCategory, MenuItem, Modifier, RestaurantTable, Order, OrderItem, OrderItemModifier, Payment, PushSubscription, Ingredient, MenuItemIngredient, RestaurantSetting, Discount, OrderDiscount, AuditLog, DailyClose, Customer, Reservation, WaitlistEntry, OrderCourse, LoyaltyProgram, LoyaltyMember, LoyaltyTransaction, LoyaltyReward, GiftCard, GiftCardUsage

## Key Enums
- **OrderItemStatus:** PENDING, SENT, PREPARING, READY, SERVED, CANCELLED
- **OrderStatus:** OPEN, SUBMITTED, COMPLETED, CLOSED, CANCELLED
- **PaymentMethod:** CASH, CARD
- **DiscountType:** PERCENTAGE, FIXED
- **AuditAction:** ITEM_VOIDED, ORDER_CANCELLED, PAYMENT_PROCESSED, DISCOUNT_APPLIED, ITEM_86D, STOCK_ADJUSTED, RESERVATION_CREATED, RESERVATION_CANCELLED, RESERVATION_NO_SHOW, LOYALTY_REDEEMED, GIFT_CARD_REDEEMED, COURSE_FIRED
- **ReservationStatus:** PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW
- **ReservationSource:** PHONE, WALKIN, WHATSAPP, WEBSITE, MANUAL
- **LoyaltyTxType:** EARN, REDEEM, ADJUST, EXPIRE

## Pusher Channels
- `kitchen` (public) — kitchen display subscribes for new items + status changes
- `bar` (public) — bar display subscribes for new items + status changes
- `menu` (public) — item availability changes (86'd items)
- `private-server-{userId}` — each server's notification channel

## i18n Architecture
- Main messages: `src/messages/en.json` + `src/messages/es.json` (~525 keys each)
- Guide messages: `src/messages/guide-en.json` + `src/messages/guide-es.json` (~170 keys each)
- Merged at load time in `src/i18n/request.ts` via spread: `{ ...main, ...guide }`
- Guide content accessed via `useTranslations('guide')` namespace

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
WHATSAPP_PHONE_NUMBER_ID   # Meta Business phone number ID (optional)
WHATSAPP_ACCESS_TOKEN      # Meta API access token (optional)
```

## Common Commands
```bash
npx prisma migrate dev    # Run migrations locally
npx prisma db seed        # Seed database
npx next build            # Production build
npx next dev --turbopack  # Dev server
```
