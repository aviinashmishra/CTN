# Critical Thinking Network (CTN)

A luxury social media platform for college students featuring role-based access control, discussion panels, and academic resource sharing.

## 🎨 Design Inspiration

- **X (Twitter)**: Clean, minimalist UI with smooth interactions
- **Instagram**: Beautiful visual design with luxury aesthetics
- **Dark Mode First**: Optimized for comfortable viewing

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** (TypeScript)
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Zustand** - State management
- **React Query** - Server state management
- **Lucide Icons** - Beautiful icon library

### Backend
- **NestJS** (TypeScript)
- **Neon DB (PostgreSQL)** - Serverless PostgreSQL for user data & resources
- **MongoDB** - Posts & activity feeds
- **Redis** - Caching layer
- **JWT** - Authentication
- **TypeORM** - PostgreSQL ORM
- **Mongoose** - MongoDB ODM

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- **Neon DB account** (free tier available at [neon.tech](https://neon.tech))
- MongoDB 6+ (or MongoDB Atlas)
- Redis 7+ (or Redis Cloud)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd critical-thinking-network
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Configure Neon DB**

See [NEON_DB_SETUP.md](./NEON_DB_SETUP.md) for detailed instructions.

Quick setup:
- Create a Neon account at [console.neon.tech](https://console.neon.tech)
- Create a new project
- Copy your connection string
- Update `DATABASE_URL` in `.env` file

5. **Start other services**
```bash
# MongoDB (if running locally)
mongod --dbpath /path/to/data

# Redis (if running locally)
redis-server
```

6. **Run the application**
```bash
# Development mode (both frontend and backend)
npm run dev

# Or run separately:
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001
```

## 📁 Project Structure

```
critical-thinking-network/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & API client
│   │   └── store/           # Zustand stores
│   └── public/              # Static assets
│
├── backend/                 # NestJS backend
│   └── src/
│       ├── modules/         # Feature modules
│       ├── entities/        # TypeORM entities
│       ├── schemas/         # Mongoose schemas
│       └── config/          # Configuration files
│
└── .kiro/specs/            # Project specifications
```

## 🎯 Features

### User Roles
- **Guest**: View national posts (read-only)
- **General User**: Full national panel access
- **College User**: National + college panel + resources
- **Moderator**: Resource management for their college
- **Admin**: Full platform control

### Core Modules
1. **National Discussion Panel** - Public intellectual discourse
2. **College Discussion Panel** - Private campus communities
3. **Academic Resources** - Hierarchical resource system with paid cross-college access

### Key Features
- ✨ Unique usernames (like Twitter)
- 👤 Personal profiles with bio & stats
- 🔍 User search & discovery
- 📚 5-level resource hierarchy
- 💳 Payment system for cross-college resources
- 🎨 Luxury UI with dark mode
- ⚡ Real-time updates
- 📱 Responsive design

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# Property-based tests
npm run test:properties
```

## 📝 License

Private - All rights reserved

## 👥 Team

Built with ❤️ for college students worldwide
