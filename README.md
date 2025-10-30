# Hedera LandFi - Land Tokenization dApp

A comprehensive land tokenization platform built on Hedera Hashgraph for the African market.

### Quick Start for Judges

**Important**: The live demo backend is hosted on Render's free tier and may enter sleep mode after inactivity. If you encounter connection issues on first access, please wait 2 minutes for the server to wake up and retry.

### Testing Instructions
To quickly test this project:
1. Clone and install: `pnpm install`
2. Start with Docker: `pnpm docker:up && pnpm dev`
3. Access at: http://localhost:5173
4. Use demo credentials: demo@LandFi-africa.com password: Demo123!
5. [Live Demo](https://landfi.tiic-system.com)


##  Hedera Hack Africa Submission

###  Pitch Deck
[View our Pitch Deck](https://www.canva.com/design/DAGzXfego8g/B-JeR3sTUIJRgLzVIiPF4w/view?utm_content=DAGzXfego8g&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h8208b16287#19)
###  Certifications
- [Hedera Certification ](https://explore.hashpack.app/nft/0.0.3872504/12026)

###  Team
- C. Dimitri rock Dossa  - dev fullstack - project manager - Web3 & Blockchain Strategist - [GitHub](https://github.com/Dmtlhrx/) | [LinkedIn](https://www.linkedin.com/in/dimitriblockchain/)

- Geovany Bignon - designer graphic - [LinkedIn](https://www.linkedin.com/in/geovany-bignon-9987b5367/)

- Bellevie AGBALE UI/UX Designer - https://www.linkedin.com/in/bellevie-agbale/

- Esther Houndonougbo  - SMM , business developer https://www.linkedin.com/in/estherhoundonougbo/

###  Demo Video
[Watch our Demo](https://youtu.be/VJq1t1nyS0c?si=w9X0zP_x8L3-sjXz)

###  Hackathon Track
Land & Property Rights - Tokenization & Digital Identity(RWA)

---

##  Problem Statement

Land ownership in Africa faces critical challenges:
- **Lack of transparency** in land registries
- **Fraud and double registration** incidents
- **Limited access to credit** due to illiquid assets
- **Complex bureaucratic processes** for land transfers
- **No standardized digital identity** for landowners

##  Our Solution

Hedera LandFi leverages Hedera's enterprise-grade distributed ledger technology to create a secure, transparent, and efficient land tokenization ecosystem that addresses these challenges through:

- **Hedera Token Service (HTS)** for NFT-based land certificates
- **Hedera Consensus Service (HCS)** for immutable transaction history
- **Decentralized Identity (DID)** for secure owner verification
- **Smart Contracts** for automated and trustless transactions
- **DeFi Integration** to unlock liquidity from tokenized assets

---

##  Key Features

###  Land Tokenization (HTS)
- Transform physical land parcels into secure NFTs
- Each token represents verifiable ownership rights
- Immutable metadata including GPS coordinates, size, and legal documents
- Fractional ownership capabilities for investment opportunities

###  Transaction Traceability (HCS)
- Complete, immutable history of all land transactions
- Transparent audit trail for regulators and stakeholders
- Timestamp verification for legal compliance
- Real-time consensus on ownership changes

###  Decentralized Identity (DID)
- Secure digital identity system for landowners
- KYC/AML compliance built-in
- Privacy-preserving verification
- Multi-signature authorization for high-value transactions

###  DeFi Ecosystem
- Collateralized loans using land NFTs
- Liquidity pools for tokenized properties
- Yield farming opportunities
- Automated lending protocols

###  Marketplace
- Buy and sell tokenized land parcels
- Escrow services for secure transactions
- Price discovery mechanisms
- Multi-currency support (HBAR, stablecoins)

###  Analytics Dashboard
- Portfolio management and tracking
- Real-time market data and trends
- Transaction history and reports
- ROI calculations and projections

---

##  Technology Stack

### Frontend
- **React 18** + **TypeScript** - Modern UI framework with type safety
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** + **Framer Motion** - Responsive styling with smooth animations
- **Zustand** - Lightweight state management
- **React Router v6** - Client-side routing
- **@react-three/fiber** - 3D graphics for immersive hero section
- **HashPack Wallet** - Secure Hedera wallet integration

### Backend
- **Node.js 20** + **TypeScript** - Scalable server runtime
- **Fastify** - High-performance web framework
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Reliable relational database
- **Hedera SDK** (@hashgraph/sdk) - Native Hedera integration
- **JWT** - Secure authentication
- **Docker** - Containerized deployment

### Hedera Services Integration
- **HTS (Hedera Token Service)** - NFT minting and management
- **HCS (Hedera Consensus Service)** - Transaction logging
- **Hedera Smart Contracts** - Automated business logic
- **Hedera SDK** - Full API integration
- **Testnet** - Development and testing environment

---

##  Installation & Setup

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Hedera testnet account

### 1. Clone and Install Dependencies

```bash
git clone (https://github.com/Dmtlhrx/landfiprodV3.git)
cd landfiprodV3
pnpm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your Hedera credentials:

```env
# Hedera Configuration
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/hedera_africa

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# API
API_PORT=3001
API_HOST=localhost
```

### 3. Start Database

```bash
pnpm docker:up
```

### 4. Run Database Migrations

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:5173
- API: http://localhost:3001

---

##  Hedera Network Setup

### Getting Testnet Credentials

1. Visit [Hedera Portal](https://portal.hedera.com)
2. Create a new testnet account
3. Save your Account ID and Private Key
4. Add credentials to `.env` file

### Funding Your Account

```bash
# Use Hedera Testnet Faucet
# Visit: https://portal.hedera.com/faucet
```

### Network Configuration

The application automatically connects to Hedera Testnet for development:
- Network: `testnet`
- Mirror Node: `https://testnet.mirrornode.hedera.com`
- JSON-RPC: `https://testnet.hashio.io/api`

---

## 🔧 Available Scripts

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm dev:web          # Start frontend only
pnpm dev:api          # Start backend only

# Build
pnpm build            # Build for production
pnpm build:web        # Build frontend
pnpm build:api        # Build backend


# Code Quality
pnpm lint             # Lint all code


# Database
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # Open Prisma Studio
pnpm db:seed          # Create demo user

# Docker
pnpm docker:up        # Start all services
pnpm docker:down      # Stop all services
pnpm docker:logs      # View logs
```

---

##  Docker Deployment

### Development Environment

```bash
docker compose up -d
```

### Production Deployment

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Available Services

| Service    | URL                   | Description |
|------------|-----------------------|-------------|
| Web App    | http://localhost:5173 | Frontend application |
| API        | http://localhost:3001 | Backend REST API |
| PostgreSQL | localhost:5432        | Database server |
| pgAdmin    | http://localhost:8080 | Database management |

---

##  Project Structure

```
hedera-africa-dapp/
├── apps/
│   ├── web/                    # Frontend React application
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand state stores
│   │   │   ├── services/       # API and Hedera services
│   │   │   ├── utils/          # Helper functions
│   │   │   └── types/          # TypeScript types
│   │   └── public/             # Static assets
│   │
│   └── api/                    # Backend Fastify application
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── services/       # Business logic
│       │   ├── models/         # Data models
│       │   ├── middleware/     # Express middleware
│       │   ├── hedera/         # Hedera SDK integration
│       │   └── utils/          # Helper functions
│       └── prisma/             # Database schema
│
├── packages/
│   ├── ui/                     # Shared UI component library
│   ├── config/                 # Shared configuration
│   └── types/                  # Shared TypeScript types
│
├── docker-compose.yml          # Development Docker setup
├── docker-compose.prod.yml     # Production Docker setup
├── turbo.json                  # Turborepo configuration
└── package.json                # Root package configuration
```

---

##  Design System

### Color Palette
Inspired by Benin's vibrant culture with modern neon accents:

- **Primary**: `#10B981` (Emerald) - Growth and prosperity
- **Secondary**: `#F59E0B` (Amber) - Warmth and energy
- **Accent**: `#EC4899` (Pink) - Modern and bold
- **Dark**: `#0F172A` (Slate) - Professional depth
- **Light**: `#F8FAFC` (Slate) - Clean backgrounds

### Typography
- **Headings**: Space Grotesk - Modern geometric sans-serif
- **Body**: Inter - Optimized for readability
- **Code**: JetBrains Mono - Developer-friendly monospace

### Animations
- **Framer Motion** - Smooth page transitions and micro-interactions
- **Three.js** - Interactive 3D hero visualization
- **CSS Animations** - Performance-optimized UI effects

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader optimized
- High contrast mode available
- Focus indicators on all interactive elements

---

##  Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- HTTP-only cookies for token storage
- Role-based access control (RBAC)

### Input Validation
- Zod schema validation on all endpoints
- SQL injection prevention via Prisma ORM
- XSS protection with sanitization
- CSRF token validation

### Network Security
- Rate limiting (100 requests/15min per IP)
- CORS configuration with whitelist
- Helmet.js security headers
- TLS/SSL encryption in production

### Database Security
- Row Level Security (RLS) policies
- Encrypted sensitive data at rest
- Prepared statements for all queries
- Regular automated backups

### Hedera Integration Security
- Private keys stored in environment variables (never committed)
- Secure key management with HashPack wallet
- Transaction signing on client-side only
- Multi-signature support for high-value operations

---

##  Testing

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for API endpoints
├── e2e/            # End-to-end tests for user flows
└── fixtures/       # Test data and mocks
```

### Testing Tools
- **Vitest** - Fast unit test runner
- **Playwright** - E2E browser testing
- **Testing Library** - React component testing
- **MSW** - API mocking

---

##  Performance Optimizations

- **Code Splitting** - Dynamic imports for faster initial load
- **Image Optimization** - WebP format with lazy loading
- **Bundle Analysis** - Webpack bundle analyzer for size tracking
- **Caching Strategy** - Service worker for offline functionality
- **CDN Integration** - Static assets served via CDN
- **Database Indexing** - Optimized queries with proper indexes

---

##  Deployment

### Frontend (Hostinger)

```bash
pnpm build:web
# Deploy the apps/web/dist folder
```

### Backend (Render)

```bash
pnpm build:api
# Deploy with Dockerfile
```

### Environment Variables

Ensure all production environment variables are set:
- `HEDERA_ACCOUNT_ID` - Production Hedera account
- `HEDERA_PRIVATE_KEY` - Secure private key
- `DATABASE_URL` - Production database connection
- `JWT_SECRET` - Strong secret for JWT signing
- `CORS_ORIGIN` - Production frontend URL

---

##  Hedera Mainnet Migration

When ready for production:

1. Update `.env` configuration:
```env
HEDERA_NETWORK=mainnet
```

2. Obtain mainnet account credentials
3. Update smart contract addresses
4. Test thoroughly on testnet first
5. Deploy backend with mainnet configuration
6. Update frontend to connect to mainnet

---

##  Documentation

- [Hedera Documentation](https://docs.hedera.com)


---

##  Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


---

##  Known Issues

- [ ] Wallet connection sometimes requires page refresh
- [ ] Large file uploads may timeout (working on chunked uploads)
- [ ] Mobile responsiveness needs improvement on tablet sizes


---

##  Roadmap

### Phase 1 (Current) - MVP
- [x] Land tokenization with HTS
- [x] Basic marketplace functionality
- [x] User authentication and profiles
- [x] Transaction history with HCS

### Phase 2 - DeFi Integration
- [ ] Collateralized lending protocol
- [ ] Liquidity pools for land tokens
- [ ] Yield farming mechanisms
- [ ] Stablecoin integration

### Phase 3 - Advanced Features
- [ ] Mobile applications (iOS/Android)
- [ ] AI-powered land valuation
- [ ] Integration with government registries
- [ ] Multi-chain bridges

### Phase 4 - Scale & Expansion
- [ ] Launch in 5 African countries
- [ ] Partnership with land registries
- [ ] Institutional investor platform
- [ ] Carbon credit tokenization

---

##  Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Dashboard │  │Marketplace│ │  Profile │  │  Wallet  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                    Backend (Fastify)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   Auth   │  │  Tokens  │  │  Users   │  │Marketplace│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
    ┌────────┴────────┐    ┌───────┴────────┐
    │   PostgreSQL    │    │ Hedera Network │
    │    Database     │    │  - HTS (NFTs)  │
    └─────────────────┘    │  - HCS (Logs)  │
                           │  - DID Service │
                           └────────────────┘
```

---

##  Hackathon Highlights

### Why This Project Stands Out

1. **Real-World Impact** - Addresses critical land ownership issues in Africa
2. **Full Hedera Integration** - Uses HTS, HCS, and DID services comprehensively
3. **Production-Ready Code** - Clean architecture, well-tested, and documented
4. **User-Centric Design** - Intuitive UI/UX with African cultural elements
5. **Scalable Architecture** - Built to handle millions of land parcels
6. **DeFi Innovation** - Unlocks liquidity from traditionally illiquid assets

### Technical Innovation

- **3D Visualization** - Interactive map using Three.js
- **Offline-First** - PWA capabilities for limited connectivity areas
- **Multi-Language** - Support for English, French, and local languages
- **Mobile-Responsive** - Works seamlessly on all devices

---



##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Acknowledgments

- **Hedera Hashgraph** - For providing enterprise-grade DLT infrastructure
- **HashPack** - For secure wallet integration
- **DoraHacks** - For organizing this amazing hackathon
- **Open Source Community** - For the incredible tools and libraries
- **Our Beta Testers** - For valuable feedback and support

---

##  Links

- [Live Demo](https://landfi.tiic-system.com)

- [GitHub Repository](https://github.com/Dmtlhrx/landfiprodV3)

---

s

---

##  Important Notes for Judges

### GitHub Collaborator Access
 The email `Hackathon@hashgraph-association.com` has been added as a collaborator to this repository for AI-assisted judging.

### Repository Information
- **Created**: Date during hackathon period
- **Status**: Public
- **License**: MIT
- **Activity**: All commits made during hackathon timeframe

### Testing Instructions
To quickly test this project:

1. Clone and install: `pnpm install`
2. Start with Docker: `pnpm docker:up && pnpm dev`
3. Access at: http://localhost:5173
4. Use demo credentials: demo@LandFi-africa.com / Demo123!

### Video Walkthrough
Watch the complete demo video here https://youtu.be/VJq1t1nyS0c?si=w9X0zP_x8L3-sjXz showing:
- Land tokenization process
- Marketplace transactions
- DeFi lending feature
- Analytics dashboard

---

Made with passion for Hedera Hack Africa 