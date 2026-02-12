# Opexio - Technical Codebase Documentation

## Project Overview

**Opexio** is a shipment management system built as a monorepo with a React frontend and Cloudflare Workers backend. The application features customer management, shipment tracking, QR code-based public verification, and a secure authentication system.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Tech Stack](#tech-stack)
3. [Environment Setup](#environment-setup)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Frontend Architecture](#frontend-architecture)
7. [Deployment](#deployment)
8. [Development Workflow](#development-workflow)
9. [Security Considerations](#security-considerations)
10. [Known Issues & TODOs](#known-issues--todos)

---

## Project Structure

```
opexio/
├── api/                          # Cloudflare Workers Backend
│   ├── src/
│   │   ├── auth/                # Better Auth configuration
│   │   ├── db/                  # Database schema & utilities
│   │   │   └── schema.ts        # Drizzle ORM schema definitions
│   │   ├── routes/              # API endpoints
│   │   │   ├── customers.ts     # Customer CRUD operations
│   │   │   ├── public.ts        # Public shipment verification
│   │   │   └── shipments.ts    # Shipment CRUD & PDF generation
│   │   └── index.ts             # Main Hono app entry point
│   ├── drizzle/                 # Generated database migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── drizzle.config.ts       # Drizzle Kit configuration
│
├── web/                         # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── lib/                # Utility functions (cn, auth-client)
│   │   ├── pages/              # Route components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── .env.development        # Dev environment variables
│   ├── .env.production         # Prod environment variables
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts          # Vite build configuration
│
├── .wrangler/                   # Wrangler configuration directory
├── package.json                 # Root workspace config
└── README.md
```

---

## Tech Stack

### Frontend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 19.2.0 | UI Framework |
| **Router** | React Router DOM | 7.13.0 | Client-side routing |
| **Build Tool** | Vite | 7.3.1 | Build tool & dev server |
| **Language** | TypeScript | 5.9.3 | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 3.4.19 | Utility-first CSS |
| **UI Components** | Radix UI | Various | Accessible UI primitives |
| **Icons** | Lucide React | 0.563.0 | Icon library |
| **State Management** | React Hooks | Built-in | Local component state |
| **Server State** | TanStack Query | 5.90.20 | Data fetching & caching |
| **Charts** | Recharts | 3.7.0 | Data visualization |
| **Component Variants** | CVA | 0.7.1 | Component variant system |
| **Class Merging** | clsx/tailwind-merge | 2.1.1/3.4.0 | Tailwind class utilities |

### Backend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Runtime** | Cloudflare Workers | - | Edge computing platform |
| **Framework** | Hono | 4.11.9 | Lightweight HTTP framework |
| **Database** | SQLite (Cloudflare D1) | - | Edge relational database |
| **ORM** | Drizzle ORM | 0.45.1 | Type-safe database queries |
| **Migration Tool** | Drizzle Kit | 0.31.9 | Database migrations |
| **Authentication** | Better Auth | 1.4.18 | Complete auth solution |
| **Password Hashing** | bcryptjs | 3.0.3 | Secure password hashing |
| **PDF Generation** | pdf-lib | 1.17.1 | PDF manipulation & creation |
| **QR Code** | qr-image | 3.2.0 | QR code generation |
| **UUID** | uuid | 13.0.0 | Unique identifier generation |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node Package Manager | npm | Package management |
| Wrangler CLI | 4.4.0 | Cloudflare Workers deployment |
| Concurrently | 9.2.1 | Run multiple scripts simultaneously |
| ESLint | 9.39.1 | Code linting |
| TypeScript ESLint | 8.48.0 | TypeScript linting rules |
| Autoprefixer | 10.4.24 | CSS vendor prefixing |
| PostCSS | 8.5.6 | CSS transformation |

---

## Environment Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm
- Wrangler CLI (installed via npm)
- Cloudflare account with Workers & D1 enabled

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd opexio

# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspace=api
npm install --workspace=web
```

### Environment Variables

**Frontend (web/.env.development):**
```env
VITE_API_URL=http://localhost:8787
```

**Frontend (web/.env.production):**
```env
VITE_API_URL=https://opexio-production.indraargaaa.workers.dev
```

### Cloudflare Configuration

Set up Wrangler:
```bash
wrangler login
```

Configure D1 database binding (via Wrangler dashboard or command line):
```bash
wrangler d1 create opexio-db
```

Apply database migrations:
```bash
cd api
npm run db:generate
# Then apply migrations via Wrangler dashboard or CLI
```

---

## Database Schema

### Tables Overview

| Table | Primary Key | Purpose |
|-------|-------------|---------|
| `user` | `id` (text) | User accounts |
| `session` | `id` (text) | User authentication sessions |
| `account` | `id` (text) | OAuth & credential accounts |
| `verification` | `id` (text) | Email verification tokens |
| `customers` | `id` (text) | Customer records |
| `shipmentHeader` | `id` (text) | Shipment master records |
| `shipmentDetail` | `id` (text) | Shipment line items |

### Schema Details

#### user
```typescript
{
  id: text (primary key)
  name: text (not null)
  email: text (not null, unique)
  emailVerified: boolean (not null)
  image: text (optional)
  createdAt: timestamp (not null)
  updatedAt: timestamp (not null)
}
```

#### session
```typescript
{
  id: text (primary key)
  expiresAt: timestamp (not null)
  token: text (not null, unique)
  createdAt: timestamp (not null)
  updatedAt: timestamp (not null)
  ipAddress: text (optional)
  userAgent: text (optional)
  userId: text (foreign key → user.id)
}
```

#### account
```typescript
{
  id: text (primary key)
  accountId: text (not null)
  providerId: text (not null)
  userId: text (foreign key → user.id)
  accessToken: text (optional)
  refreshToken: text (optional)
  idToken: text (optional)
  accessTokenExpiresAt: timestamp (optional)
  refreshTokenExpiresAt: timestamp (optional)
  scope: text (optional)
  password: text (optional, hashed with bcrypt)
  createdAt: timestamp (not null)
  updatedAt: timestamp (not null)
}
```

#### verification
```typescript
{
  id: text (primary key)
  identifier: text (not null)
  value: text (not null)
  expiresAt: timestamp (not null)
  createdAt: timestamp (optional)
  updatedAt: timestamp (optional)
}
```

#### customers
```typescript
{
  id: text (primary key)
  customerId: text (not null, unique)
  name: text (not null)
  emailAddress: text (optional)
  createdBy: text (foreign key → user.id)
  updatedAt: timestamp (not null)
  createdAt: timestamp (not null)
}
```

#### shipmentHeader
```typescript
{
  id: text (primary key)
  shipmentNumber: text (not null, unique)
  customerId: text (foreign key → customers.id)
  r2FileKey: text (optional)
  stampedFileKey: text (optional)
  status: text (not null)
  publicToken: text (unique, optional)
  isLinkActive: boolean (default: true)
  deliveryComments: text (optional)
  createdBy: text (foreign key → user.id)
  createdAt: timestamp (not null)
  updatedAt: timestamp (not null)
}
```

#### shipmentDetail
```typescript
{
  id: text (primary key)
  shipmentHeaderId: text (foreign key → shipmentHeader.id)
  itemCode: text (not null)
  itemDescription: text (optional)
  quantity: integer (not null)
  qtyDelivered: integer (optional)
  status: text (not null)
  createdAt: timestamp (not null)
  updatedAt: timestamp (not null)
}
```

### Foreign Key Relationships

```
user.id ←─ session.userId
user.id ←─ account.userId
user.id ←─ customers.createdBy
user.id ←─ shipmentHeader.createdBy

customers.id ←─ shipmentHeader.customerId

shipmentHeader.id ←─ shipmentDetail.shipmentHeaderId
```

---

## API Routes

### Base URL
- **Development**: `http://localhost:8787`
- **Production**: `https://opexio-production.indraargaaa.workers.dev`

### Route Structure

#### Authentication (`/api/auth/**`)
All Better Auth endpoints are handled by the authentication middleware.
- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - User logout
- `GET /api/auth/session` - Get current session

#### Public Routes (`/public/*`)
- `GET /public/shipments/:token` - Public shipment verification page

#### Customer Routes (`/api/customers/*`)
- `GET /api/customers` - List all customers (authenticated)
- `POST /api/customers` - Create new customer (authenticated)
- `GET /api/customers/:id` - Get customer by ID (authenticated)
- `PUT /api/customers/:id` - Update customer (authenticated)
- `DELETE /api/customers/:id` - Delete customer (authenticated)

#### Shipment Routes (`/api/shipments/*`)
- `GET /api/shipments` - List all shipments (authenticated)
- `POST /api/shipments` - Create new shipment with PDF (authenticated)
- `GET /api/shipments/:id` - Get shipment by ID (authenticated)
- `PUT /api/shipments/:id` - Update shipment (authenticated)
- `DELETE /api/shipments/:id` - Delete shipment (authenticated)
- `POST /api/shipments/:id/generate-pdf` - Regenerate shipment PDF (authenticated)

### CORS Configuration

The API allows requests from:
- `http://localhost:5173` (development)
- `https://opexio-web.pages.dev` and all `*.opexio-web.pages.dev` subdomains (production)

Credentials (`cookies`) are enabled for authentication.

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/              # Base UI components (buttons, dialogs, etc.)
│   └── auth/            # Auth-related components
├── pages/
│   ├── LoginPage.tsx    # Login form
│   ├── Dashboard.tsx    # Main dashboard with charts
│   ├── CustomersPage.tsx   # Customer management
│   ├── ShipmentsPage.tsx   # Shipment management
│   └── VerifyPage.tsx      # Public shipment verification
├── hooks/
│   └── useAuth.ts       # Authentication hook
├── lib/
│   ├── utils.ts         # Utility functions (cn helper)
│   └── auth-client.ts   # Better Auth client configuration
├── App.tsx
└── main.tsx
```

### Path Aliases

The Vite config includes a path alias:
```typescript
"@": "./src"
```

Usage: `import { Button } from "@/components/ui/button"`

### State Management Strategy

| Type | Implementation |
|------|----------------|
| **Local Component State** | `useState`, `useReducer` |
| **Server State** | TanStack Query (`useQuery`, `useMutation`) |
| **Authentication State** | Better Auth hooks |
| **Global State** | Not used (component-level only) |

### Protected Routes

Routes are protected using Better Auth's session checking. Unauthenticated users are redirected to the login page.

### Styling Approach

- **Tailwind CSS** for utility classes
- **Radix UI** for accessible component primitives
- **CVA** (Class Variance Authority) for component variants
- **Tailwind Animate** for animations
- Custom colors and spacing in `tailwind.config.js`

---

## Deployment

### Deployment Platforms

| Service | Platform | Purpose |
|---------|----------|---------|
| API Backend | Cloudflare Workers | Serverless API |
| Frontend | Cloudflare Pages | Static site hosting |
| Database | Cloudflare D1 | Edge SQL database |
| File Storage | Cloudflare R2 | Object storage (implied for file keys) |

### Build Commands

```bash
# Root package.json scripts
npm run dev           # Start both API and web in dev mode
npm run dev:api       # Start API only
npm run dev:web       # Start web only
npm run build         # Full production build
npm run build:api     # Deploy API to Workers
npm run build:web     # Build web for Pages
npm run deploy        # Full deployment (API + web)
```

### Deployment Process

#### API Deployment
```bash
cd api
wrangler deploy --minify --env production
```

#### Frontend Deployment
```bash
cd web
npm run build
cd ..
wrangler pages deploy web/dist --project-name=opexio-web
```

### Production URLs

- **API**: https://opexio-production.indraargaaa.workers.dev
- **Web**: https://opexio-web.pages.dev (and preview deployments)

---

## Development Workflow

### Local Development

1. **Start API Server:**
   ```bash
   npm run dev:api
   ```
   Serves at `http://localhost:8787`

2. **Start Frontend Dev Server:**
   ```bash
   npm run dev:web
   ```
   Serves at `http://localhost:5173`

3. **Or run both simultaneously:**
   ```bash
   npm run dev
   ```

### Database Migrations

Generate new migration:
```bash
cd api
npm run db:generate
```

Apply migrations via Wrangler:
```bash
wrangler d1 execute <database-name> --file=./drizzle/<migration-file>.sql
```

### Type Generation

Generate Cloudflare Workers TypeScript types:
```bash
cd api
npm run cf-typegen
```
Outputs to `worker-configuration.d.ts`

---

## Security Considerations

### Authentication & Authorization

- **Password Hashing**: bcryptjs with 10 salt rounds
- **Session Management**: Secure cookies with `SameSite=none`
- **IP & User-Agent Tracking**: Stored in session table for security
- **Trusted Origins**: Configured in Better Auth and CORS

### API Security

- **CORS**: Dynamic origin checking for dev/production
- **Route Protection**: Authentication middleware on all protected endpoints
- **Public Token System**: Token-based access for shipment verification (no auth required)

### Data Security

- **Foreign Key Relationships**: Enforced at database level
- **Timestamp Fields**: Proper audit trail with createdAt/updatedAt
- **Email Validation**: Unique constraint on user emails

### Considerations for Future Enhancement

- [ ] Add rate limiting to API endpoints
- [ ] Implement input validation/sanitization with Zod
- [ ] Add request signing for API security
- [ ] Environment variable encryption
- [ ] Add audit logging for sensitive operations

---

## Known Issues & TODOs

### Current Issues (Based on Recent Commits)

1. **Quantity Validation**: Quantity not validated on both frontend and backend
2. **Comments Display**: Delivery comments not displayed in UI
3. **Table Resizing**: Tables may need further resizing adjustments

### TODO Items

1. **Testing**
   - [ ] Add unit tests for API routes
   - [ ] Add component tests for React components
   - [ ] Add integration tests for auth flow

2. **UI/UX**
   - [ ] Complete comment display functionality
   - [ ] Improve table responsiveness
   - [ ] Add loading skeletons

3. **Features**
   - [ ] Implement pagination for large datasets
   - [ ] Add search/filter functionality
   - [ ] Add export functionality
   - [ ] Add real-time updates (WebSockets/SSE)

4. **Code Quality**
   - [ ] Add ESLint/Prettier configuration consistency
   - [ ] Add JSDoc comments for public APIs
   - [ ] Standardize error handling patterns

---

## Key Architectural Decisions

1. **Monorepo Structure**: Clean separation between API and web using npm workspaces
2. **Cloudflare-First**: Leveraging Workers, D1, and Pages for edge computing benefits
3. **Hono Framework**: Minimalist HTTP framework ideal for serverless environments
4. **SQLite in Production**: Using D1 SQLite for simplicity despite traditional scaling concerns
5. **PDF with QR Codes**: Generated shipment documents include QR codes for public verification
6. **Public Verification System**: Token-based access allows shipment confirmation without authentication
7. **No Global State**: Component-level state management for simplicity and testability
8. **Type-Safe Development**: Full TypeScript coverage with strict mode enabled

---

## Contact & Support

For questions or issues related to this codebase:
- Review this documentation first
- Check existing GitHub issues
- Contact the development team
