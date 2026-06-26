# CRM Workflow Automator: HubSpot + Salesforce Integration Simulator

A full-stack, production-ready web application that simulates comprehensive CRM integration between HubSpot and Salesforce. Features mock OAuth 2.0 authentication, bidirectional data synchronization, visual field mapping, workflow automation, ETL pipelines, and comprehensive activity logging.

## ✨ Features

- **Mock OAuth 2.0 Authentication** - Simulate secure token-based authentication for both HubSpot and Salesforce
- **Bidirectional CRM Sync** - Real-time data synchronization between systems with full history tracking
- **Visual Field Mapper** - Dynamic field mapping configuration with payload transformation
- **Workflow Builder** - IF/THEN rule engine for automating CRM actions with event simulation
- **CSV ETL Pipeline** - Bulk data migration with cleaning, deduplication, and normalization
- **Activity Logging** - Comprehensive audit trail of all operations with detailed payload tracking
- **Dashboard Interface** - Elegant, polished UI with 6 specialized modules
- **Comprehensive Testing** - 47 passing unit tests covering core functionality

## 🚀 Quick Start

### Prerequisites

- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL 8.0+ or TiDB
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd crm-workflow-automator

# Install dependencies
pnpm install

# Set up environment variables (copy from .env.example if available)
# Required: DATABASE_URL, JWT_SECRET, VITE_APP_ID, etc.

# Generate database migrations
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit migrate

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/crm_automator

# Authentication
JWT_SECRET=your-secret-key-here
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# Owner Information
OWNER_OPEN_ID=owner-id
OWNER_NAME=Owner Name

# Built-in APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# Application
VITE_APP_TITLE=CRM Workflow Automator
VITE_APP_LOGO=https://example.com/logo.png
```

## 📁 Project Structure

```
crm-workflow-automator/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   │   ├── Dashboard.tsx       # Main dashboard
│   │   │   ├── Home.tsx            # Landing page
│   │   │   └── modules/            # Feature modules
│   │   │       ├── Overview.tsx
│   │   │       ├── CRMConnections.tsx
│   │   │       ├── FieldMapper.tsx
│   │   │       ├── WorkflowBuilder.tsx
│   │   │       ├── DataMigration.tsx
│   │   │       └── ActivityLog.tsx
│   │   ├── components/             # Reusable components
│   │   ├── lib/                    # Utilities and helpers
│   │   ├── App.tsx                 # Main app component
│   │   └── index.css               # Global styles
│   ├── index.html
│   └── public/
├── server/                          # Node.js backend
│   ├── services/                   # Business logic
│   │   ├── oauthService.ts         # OAuth simulation
│   │   ├── syncEngine.ts           # CRM sync logic
│   │   ├── workflowEngine.ts       # Workflow execution
│   │   ├── etlService.ts           # ETL pipeline
│   │   └── *.test.ts               # Service tests
│   ├── utils/                      # Utility functions
│   │   ├── dataTransform.ts        # Data transformation
│   │   └── dataTransform.test.ts   # Transformation tests
│   ├── db.ts                       # Database queries
│   ├── routers.ts                  # tRPC procedures
│   └── _core/                      # Framework code
├── drizzle/                         # Database schema
│   ├── schema.ts                   # Table definitions
│   └── migrations/                 # SQL migrations
├── shared/                          # Shared types
├── ARCHITECTURE.md                  # System architecture
├── README.md                        # This file
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 🔧 Core Modules

### 1. Overview Module
Dashboard with key metrics, quick actions, and system status overview.

### 2. CRM Connections Module
Manage OAuth connections to HubSpot and Salesforce with token management and connection status.

### 3. Field Mapper Module
Configure field mappings between CRM systems with dynamic payload transformation.

### 4. Workflow Builder Module
Create IF/THEN rules for automating CRM actions with event simulation and testing.

### 5. Data Migration Module
Upload CSV files and execute ETL pipeline with progress tracking and error reporting.

### 6. Activity Log Module
Comprehensive audit trail with filtering, search, and detailed payload inspection.

## 🧪 Testing

The project includes a comprehensive test suite with 47 passing tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test server/services/oauthService.test.ts

# Generate coverage report
pnpm test --coverage
```

### Test Coverage

- **OAuth Service** - Token generation, validation, refresh, disconnection
- **Data Transformation** - Email hashing, phone normalization, deduplication, CSV parsing
- **ETL Pipeline** - Data cleaning, validation, transformation, error handling
- **Field Mapping** - Payload transformation, field validation
- **Deduplication** - Email-hash based duplicate detection

## 🔐 Security Features

- **Token Encryption** - OAuth tokens encrypted at rest
- **Email Hashing** - SHA-256 hashing for deduplication (no plain email storage)
- **Activity Logging** - Complete audit trail for compliance
- **Input Validation** - All user inputs validated and sanitized
- **User Isolation** - Data scoped to authenticated user
- **Protected Procedures** - tRPC procedures require valid authentication

## 📊 Database Schema

### Core Tables

- **users** - User accounts and roles
- **crmConnections** - OAuth tokens and connection state
- **fieldMappings** - Field mapping configurations
- **workflows** - Workflow rules and triggers
- **syncHistory** - Sync operations and results
- **etlJobs** - CSV migration jobs and progress
- **activityLog** - Comprehensive audit trail
- **sandboxData** - Mock HubSpot/Salesforce entities
- **webhookEvents** - Webhook triggers and processing

## 🔄 Data Flow

### OAuth Connection Flow
```
User → Connect Button → OAuth Simulation → Token Generation → 
Database Storage → Activity Log → Success Response
```

### Sync Operation Flow
```
User → Trigger Sync → Field Mapping Applied → Data Validation → 
Target CRM Insert → History Recorded → Activity Logged
```

### ETL Pipeline Flow
```
CSV Upload → Parsing → Cleaning → Normalization → Deduplication → 
Validation → Transformation → Batch Insert → Progress Tracking
```

### Workflow Execution Flow
```
Event Trigger → Rule Evaluation → Action Execution → 
Result Logging → Activity Recording → User Notification
```

## 🚢 Deployment

### Build for Production

```bash
# Build frontend and backend
pnpm build

# Output in dist/ directory
```

### Environment Setup

1. Set all required environment variables
2. Ensure database is accessible and migrated
3. Configure S3 storage credentials
4. Set up Manus OAuth application

### Running in Production

```bash
# Start production server
pnpm start

# Server runs on port 3000 by default
# Access at http://localhost:3000
```

## 📝 API Documentation

### Authentication Endpoints

- `POST /api/trpc/auth.me` - Get current user
- `POST /api/trpc/auth.logout` - End session

### CRM Connection Endpoints

- `POST /api/trpc/crm.connect` - Connect to CRM
- `GET /api/trpc/crm.getConnections` - List connections
- `POST /api/trpc/crm.disconnect` - Disconnect CRM
- `POST /api/trpc/crm.sync` - Trigger sync operation

### Field Mapping Endpoints

- `POST /api/trpc/fieldMapping.create` - Create mapping
- `GET /api/trpc/fieldMapping.list` - List mappings
- `PUT /api/trpc/fieldMapping.update` - Update mapping
- `DELETE /api/trpc/fieldMapping.delete` - Delete mapping

### Workflow Endpoints

- `POST /api/trpc/workflow.create` - Create workflow
- `GET /api/trpc/workflow.list` - List workflows
- `PUT /api/trpc/workflow.update` - Update workflow
- `DELETE /api/trpc/workflow.delete` - Delete workflow
- `POST /api/trpc/workflow.execute` - Execute workflow

### ETL Endpoints

- `POST /api/trpc/etl.execute` - Execute ETL job
- `GET /api/trpc/etl.getJobs` - List ETL jobs

### Activity Endpoints

- `GET /api/trpc/activity.getLog` - Get activity log

## 🎨 Design System

The application uses a refined, elegant design system:

- **Typography** - Clean, professional fonts with clear hierarchy
- **Colors** - Sophisticated color palette with semantic meaning
- **Spacing** - Consistent spacing system for visual harmony
- **Components** - shadcn/ui components for consistency
- **Animations** - Smooth, purposeful transitions and interactions
- **Responsive** - Mobile-first design that works on all devices

## 🔍 Monitoring & Debugging

### Development Logs

```bash
# Check dev server logs
tail -f .manus-logs/devserver.log

# Check browser console logs
tail -f .manus-logs/browserConsole.log

# Check network requests
tail -f .manus-logs/networkRequests.log
```

### Activity Log Dashboard

Access the Activity Log module to view:
- All API calls and responses
- Webhook events and processing
- Sync operations and results
- Error logs with stack traces
- Performance metrics

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests for new functionality
4. Run `pnpm test` to verify
5. Submit a pull request

## 📚 Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed system architecture
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
mysql -u user -p -h host -D database_name
```

### Build Errors

```bash
# Clear build cache
rm -rf dist/ .vite/

# Reinstall dependencies
rm -rf node_modules/ pnpm-lock.yaml
pnpm install

# Rebuild
pnpm build
```

### Test Failures

```bash
# Run tests with verbose output
pnpm test --reporter=verbose

# Run specific test
pnpm test --grep "test name"
```

## 📄 License

MIT License - see LICENSE file for details

## 📧 Support

For issues, questions, or suggestions, please open an issue on the project repository.

---

**Built with ❤️ using React, Node.js, and Tailwind CSS**
