# 500 Error Fix Guide - Admin Login

## Common Causes & Solutions

### 1. JWT_SECRET Missing ❌

**Error:** `JWT_SECRET is not set in environment variables`

**Fix:**
`.env` file me add karein:
```env
JWT_SECRET=your_secret_key_here_make_it_long_and_random
```

**Example:**
```env
JWT_SECRET=my_super_secret_jwt_key_12345_change_this_in_production
```

### 2. Database Tables Not Created ❌

**Error:** `Table 'lottery_db.admins' doesn't exist`

**Fix:**
1. Server restart karein - tables automatically create honge
2. Ya manually check karein:
   ```sql
   USE lottery_db;
   SHOW TABLES;
   ```
3. Agar tables nahi hain, to server restart karein

### 3. Admin Account Not Created ❌

**Error:** `Invalid credentials` (but you're sure password is correct)

**Fix:**
Admin account create karein:

**Option A: Using Admin Signup Route**
```bash
POST http://localhost:5000/api/admin/signup
Body: {
  "username": "admin",
  "password": "your_password"
}
```

**Option B: Using adminPassword.js Script**
```bash
# .env me add karein:
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password

# Phir run karein:
node routes/adminPassword.js
```

### 4. Database Connection Failed ❌

**Error:** `Database connection failed`

**Fix:**
1. MySQL server running hai ya nahi check karein
2. `.env` me correct credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=lottery_db
   DB_USER=root
   DB_PASSWORD=your_password
   ```
3. Database create karein:
   ```sql
   CREATE DATABASE lottery_db;
   ```

### 5. Check Server Logs

Server console me detailed error messages dikhengi:
```bash
npm run dev
```

Look for:
- `MySQL connected successfully` ✅
- `Database synchronized` ✅
- `Admin login error:` ❌ (detailed error)

## Quick Checklist

- [ ] `.env` file me `JWT_SECRET` set hai
- [ ] `.env` file me MySQL credentials correct hain
- [ ] MySQL server running hai
- [ ] Database `lottery_db` create hai
- [ ] Server logs me "Database synchronized" dikh raha hai
- [ ] Admin account create hai (signup ya script se)

## Test Steps

1. **Check Server Status:**
   ```bash
   # Server console me yeh dikhna chahiye:
   MySQL connected successfully
   Database synchronized - All tables ready
   Server running on port: 5000
   ```

2. **Test Admin Signup:**
   ```bash
   POST http://localhost:5000/api/admin/signup
   {
     "username": "admin",
     "password": "test123"
   }
   ```

3. **Test Admin Login:**
   ```bash
   POST http://localhost:5000/api/admin/login
   {
     "username": "admin",
     "password": "test123"
   }
   ```

## Still Not Working?

Server console me exact error message check karein aur share karein!

