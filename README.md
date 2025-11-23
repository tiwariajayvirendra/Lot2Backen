# Lottery Backend - MySQL Setup

This backend has been converted from MongoDB to MySQL for Hostinger hosting.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory with the following:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MySQL Database Configuration (for Hostinger)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lottery_db
DB_USER=root
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Create MySQL Database
```sql
CREATE DATABASE lottery_db;
```

### 4. Run the Server
```bash
npm start
# or for development
npm run dev
```

The server will automatically create the required tables on first run.

## Database Tables
- `users` - User information
- `tickets` - Ticket purchases
- `admins` - Admin accounts
- `winners` - Winner records

## API Endpoints
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment and create ticket
- `GET /api/user-tickets/:mobile` - Get user tickets by mobile
- `POST /api/admin/signup` - Admin signup
- `POST /api/admin/login` - Admin login
- `GET /api/admin/tickets` - Get all tickets (admin)
- `GET /api/tickets/skim-status/:skimId` - Get skim status
- `GET /api/winners` - Get all winners

