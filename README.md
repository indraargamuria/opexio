# Opexio

A modern shipment management system built with React, Cloudflare Workers, and SQLite. Opexio provides comprehensive customer management, shipment tracking, and QR code-based public verification capabilities.

## Features

- **Customer Management** - Create, read, update, and delete customer records
- **Shipment Management** - Full CRUD operations for shipments with line item tracking
- **PDF Generation** - Automatic PDF document generation for shipments
- **QR Code Verification** - Public token-based shipment verification without authentication
- **Dashboard** - Visual dashboard with charts and metrics
- **Authentication** - Secure email/password authentication with session management
- **Responsive Design** - Mobile-friendly UI built with Tailwind CSS
- **Edge Deployment** - Deployed on Cloudflare's edge network for global performance

## Tech Stack

### Frontend

- **React 19** - UI framework
- **React Router 7** - Client-side routing
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible UI components
- **TanStack Query** - Server state management
- **Recharts** - Data visualization

### Backend

- **Cloudflare Workers** - Serverless edge computing
- **Hono** - Lightweight HTTP framework
- **Cloudflare D1** - Edge SQLite database
- **Drizzle ORM** - Type-safe database operations
- **Better Auth** - Complete authentication solution
- **pdf-lib** - PDF generation and manipulation
- **qr-image** - QR code generation

## Prerequisites

- Node.js 18 or higher
- npm
- Wrangler CLI (Cloudflare Workers)
- Cloudflare account with Workers & D1 enabled

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/indraargamuria/opexio.git
   cd opexio
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Cloudflare**

   ```bash
   # Login to Cloudflare
   wrangler login

   # Create D1 database
   wrangler d1 create opexio-db
   ```

4. **Configure environment variables**

   Create `web/.env.development`:
   ```env
   VITE_API_URL=http://localhost:8787
   ```

   Create `web/.env.production`:
   ```env
   VITE_API_URL=https://opexio-production.indraargaaa.workers.dev
   ```

5. **Apply database migrations**

   ```bash
   cd api
   npm run db:generate

   # Apply migrations via Wrangler CLI
   wrangler d1 execute opexio-db --file=./drizzle/<migration-file>.sql
   ```

## Development

### Start both API and frontend

```bash
npm run dev
```

This starts:
- API server at `http://localhost:8787`
- Frontend dev server at `http://localhost:5173`

### Start individually

```bash
# API only
npm run dev:api

# Frontend only
npm run dev:web
```

### Generate Cloudflare Worker types

```bash
cd api
npm run cf-typegen
```

This generates TypeScript types based on your Worker configuration in `worker-configuration.d.ts`.

### Using CloudflareBindings in Hono

```ts
// api/src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Project Structure

```
opexio/
├── api/                      # Cloudflare Workers backend
│   ├── src/
│   │   ├── auth/            # Better Auth configuration
│   │   ├── db/              # Database schema & utilities
│   │   ├── routes/          # API endpoints
│   │   └── index.ts         # Main entry point
│   ├── drizzle/             # Database migrations
│   └── package.json
│
├── web/                     # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Route components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   └── main.tsx         # Entry point
│   └── package.json
│
└── package.json            # Root workspace config
```

## API Endpoints

### Authentication

- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - User logout
- `GET /api/auth/session` - Get current session

### Customers

- `GET /api/customers` - List all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Shipments

- `GET /api/shipments` - List all shipments
- `POST /api/shipments` - Create new shipment with PDF
- `GET /api/shipments/:id` - Get shipment by ID
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment
- `GET /api/shipments/:id/file?type=stamped` - Download PDF with QR code

### Public

- `GET /public/shipments/:token` - Public shipment verification

## Deployment

### Deploy to Cloudflare

```bash
# Deploy everything (API + Web)
npm run deploy

# Deploy API only
npm run build:api

# Deploy Web only
npm run build:web && npm run deploy:web
```

### Production URLs

- **API**: https://opexio-production.indraargaaa.workers.dev
- **Web**: https://opexio-web.pages.dev

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `user` | User accounts |
| `session` | Authentication sessions |
| `account` | OAuth & credential accounts |
| `verification` | Email verification tokens |
| `customers` | Customer records |
| `shipmentHeader` | Shipment master records |
| `shipmentDetail` | Shipment line items |

For detailed schema information, see [codebase.md](./codebase.md).

## Environment Variables

### Frontend

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `VITE_API_URL` | `http://localhost:8787` | `https://opexio-production.indraargaaa.workers.dev` | API base URL |

### Backend

Backend variables are configured via Cloudflare Worker bindings:
- `DB` - D1 database binding
- `R2` - R2 storage binding (for file uploads)

## Security

- Passwords are hashed using bcrypt (10 rounds)
- Secure session cookies with SameSite=none
- CORS configured for allowed origins
- Public token-based access for shipment verification
- IP and User-Agent tracking for sessions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Style

- TypeScript strict mode enabled
- ESLint for code linting
- Conventional commits for commit messages

## Documentation

- [Technical Documentation](./codebase.md) - Comprehensive technical documentation

## Known Issues

- Quantity validation not fully implemented on frontend/backend
- Delivery comments display not complete
- Table responsiveness needs improvement

## License

[MIT License](LICENSE) - See LICENSE file for details

## Support

For questions or issues:
- Create an issue on GitHub
- Contact the development team

---

Built with ❤️ using Cloudflare Workers and React
