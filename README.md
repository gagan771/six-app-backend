# Six AI Backend v3

A sophisticated social networking backend application that leverages graph database technology for user connections and implements intelligent caching mechanisms for optimal performance.

## 🏗️ Architecture Overview

The Six AI Backend is built with a **hybrid architecture** that combines:
- **Neo4j Graph Database** - Primary data store for user relationships and connections
- **Supabase** - Caching layer for optimized data access
- **Express.js** - RESTful API framework
- **TypeScript** - Type-safe development

## 🗄️ Database Architecture

### Primary Database: Neo4j Graph Database
- **Purpose**: Stores user nodes and their relationships
- **Schema**:
  - `User` nodes with properties: `id`, `name`, `phone`
  - `CONNECTED_TO` relationships between users
  - `HAS_DEGREE` relationships for cached connection data

### Caching Layer: Supabase
- **Purpose**: Fast access to frequently requested user connection data
- **Tables**:
  - `user_connections` - Cached user relationships with metadata
  - `posts` - User-generated content
  - Additional tables for OTP and chat functionality

## 🔄 Data Flow Architecture

```
User Request → Express Router → Controller → Service Layer → Database Layer
                                    ↓
                              Cache Layer (Supabase)
                                    ↓
                              Primary DB (Neo4j)
```

### Caching Strategy
1. **Connection Caching**: User connections are cached in Supabase for fast retrieval
2. **Optimized Queries**: Complex graph queries are pre-computed and stored
3. **Cache Invalidation**: Caches are updated when connections change

## 📁 Project Structure

```
src/
├── app.ts                 # Main application entry point
├── config/               # Database and service configurations
│   ├── neo4j.ts         # Neo4j database connection
│   ├── supabase.ts      # Supabase client configuration
│   └── openai.ts        # OpenAI API configuration
├── controllers/         # Request handlers
│   ├── userController.ts    # User management endpoints
│   ├── chat.controller.ts   # Chat functionality
│   ├── otpController.ts     # OTP verification
│   └── sixAiController.ts   # AI-powered features
├── services/           # Business logic layer
│   ├── userService.ts      # User operations and caching
│   ├── connection.service.ts # Connection management
│   ├── chat.service.ts     # Chat operations
│   ├── message.services.ts # Message handling
│   ├── post.services.ts    # Post management
│   ├── sixAi.services.ts   # AI service integration
│   └── supabaseUserService.ts # Supabase operations
├── routes/             # API route definitions
│   ├── user.routes.ts      # User-related endpoints
│   ├── chat.routes.ts      # Chat endpoints
│   ├── otp.routes.ts       # OTP endpoints
│   └── sixai.routes.ts     # AI feature endpoints
├── types/              # TypeScript type definitions
│   └── post.types.ts       # Post-related types
└── utils/              # Utility functions
    ├── generateOtp.ts      # OTP generation
    └── postFallback.ts     # Fallback mechanisms
```

## 🚀 API Endpoints

### User Management (`/api/users`)
- `POST /create-node` - Create new user node in Neo4j
- `POST /connect` - Connect two users
- `POST /remove-connection` - Remove user connection
- `POST /remove-connection-and-chat` - Remove connection and associated chat
- `POST /connection-details` - Get connection metadata
- `GET /connections/:id` - Get user connections
- `GET /mutuals/:userId1/:userId2` - Get mutual connections
- `GET /posts/:userId` - Get user posts with degree filtering
- `GET /connection-requests/:userId/:userName` - Get connection requests
- `POST /cache-connections/:userId` - Cache user connections
- `GET /cached-connections/:userId` - Get cached connections

### Chat System (`/api/chat`)
- `POST /create-chat-and-intro-message` - Create chat with introduction

### AI Features (`/api/sixai`)
- `POST /introduce` - AI-powered user introductions
- `POST /suggestion` - AI post suggestions

### OTP System (`/api/otp`)
- `POST /request` - Request OTP
- `POST /verify` - Verify OTP
- `POST /loop-inbound` - Process inbound messages

## 🔧 Key Features

### 1. Graph-Based User Connections
- **Degree-based filtering**: Find connections at different relationship levels (1st, 2nd, 3rd degree)
- **Mutual connections**: Identify shared connections between users
- **Bidirectional relationships**: Support for chat-enabled connections

### 2. Intelligent Caching System
- **Connection caching**: Pre-compute and store user connection data
- **Performance optimization**: Reduce complex graph queries
- **Cache invalidation**: Automatic cache updates on data changes

### 3. AI-Powered Features
- **User introductions**: AI suggests connections between users
- **Content suggestions**: AI-powered post recommendations
- **Smart matching**: Algorithm-based user recommendations

### 4. Real-time Communication
- **Chat system**: Direct messaging between connected users
- **OTP verification**: Secure authentication system
- **Message processing**: Handle inbound messages from external services

## 🛠️ Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Primary Database**: Neo4j Graph Database
- **Caching Layer**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI API
- **Authentication**: OTP-based verification
- **External Services**: AWS DynamoDB, Loop messaging

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Neo4j Database
- Supabase Project
- OpenAI API Key

### Environment Variables
Create a `.env` file with:
```env
PORT=3000
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_user
NEO4J_PASSWORD=your_neo4j_password
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
```

### Installation
```bash
npm install
npm run build
npm start
```

### Development
```bash
npm run dev
```

## 📊 Performance Optimizations

1. **Connection Caching**: Reduces graph query complexity from O(n²) to O(1)
2. **Optimized Neo4j Queries**: Uses efficient Cypher queries with proper indexing
3. **Batch Operations**: Handles multiple operations in single transactions
4. **Connection Degree Filtering**: Efficient filtering of connections by relationship depth


---
