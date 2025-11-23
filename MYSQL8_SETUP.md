# MySQL 8.0 Setup Guide (Workbench)

## MySQL 8.0 Configuration

Aapka MySQL Workbench 8.0 use ho raha hai. MySQL 8.0 me kuch special settings chahiye.

## Step 1: MySQL Workbench Me Database Create Karein

1. **MySQL Workbench** open karein
2. **Local instance** connect karein (root user se)
3. **New Query** tab open karein
4. Ye query run karein:

```sql
CREATE DATABASE IF NOT EXISTS lottery_db;
USE lottery_db;
```

## Step 2: MySQL Root User Password Check/Set

### Option A: Agar Password Pata Hai

`.env` file me:
```env
DB_PASSWORD=your_mysql_password
```

### Option B: Agar Password Nahi Pata Ya Set Karna Hai

**MySQL Workbench me:**
```sql
-- Current user check
SELECT user, host FROM mysql.user WHERE user='root';

-- Password set karein (agar nahi hai)
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
FLUSH PRIVILEGES;
```

**Phir `.env` me:**
```env
DB_PASSWORD=your_new_password
```

### Option C: No Password (Development Only)

**MySQL Workbench me:**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
```

**`.env` me:**
```env
DB_PASSWORD=
```

## Step 3: MySQL 8.0 Authentication Method Check

MySQL 8.0 me default `caching_sha2_password` hota hai. Agar connection issues aaye, to:

**MySQL Workbench me:**
```sql
-- Check current authentication
SELECT user, host, plugin FROM mysql.user WHERE user='root';

-- Agar caching_sha2_password hai aur issues aaye, to change karein:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

## Step 4: Complete `.env` File

`LottryBackend/.env` me yeh add karein:

```env
PORT=5000

# MySQL 8.0 Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lottery_db
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Secret
JWT_SECRET=9f1c8d3a5e6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d

# Razorpay
RAZORPAY_KEY_ID=rzp_test_Rh7zJDqrADq65c
RAZORPAY_KEY_SECRET=7krYwW0jPFrRESE3ee8NKmhA
```

## Step 5: Test Connection

**MySQL Workbench me test karein:**
```sql
-- Connection test
SELECT VERSION();
-- Should show: 8.0.x

-- Database check
SHOW DATABASES;
-- Should show: lottery_db
```

## Step 6: Server Start

```bash
cd LottryBackend
npm run dev
```

**Expected Output:**
```
✅ MySQL connected successfully
✅ Database synchronized - All tables ready
✅ Server running on port: 5000
✅ All systems ready!
```

## Common MySQL 8.0 Issues & Fixes:

### Issue 1: "Access denied"
**Fix:** Password check karein aur `.env` me set karein

### Issue 2: "Authentication plugin error"
**Fix:** 
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
```

### Issue 3: "Connection timeout"
**Fix:** MySQL service running hai ya nahi check karein

## Quick Checklist:

- [ ] MySQL Workbench me `lottery_db` database create hai
- [ ] Root user ka password pata hai ya set kiya hai
- [ ] `.env` file me `DB_PASSWORD` set hai
- [ ] MySQL service running hai
- [ ] Server start karke test kiya hai

## MySQL 8.0 Specific Settings:

Code me already add kar diya hai:
- ✅ MySQL 8.0 compatibility settings
- ✅ Proper authentication handling
- ✅ Connection timeout settings

**Ab bas `.env` me password set karein aur server start karein!** 🚀

