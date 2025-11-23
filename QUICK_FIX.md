# Quick Fix - MySQL Password Error

## Problem:
```
Access denied for user 'root'@'localhost' (using password: NO)
```

## Solution:

### Step 1: `.env` File Me Password Set Karein

`LottryBackend` folder me `.env` file open karein aur yeh add/update karein:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lottery_db
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### Step 2: MySQL Password Kaise Pata Karein?

**XAMPP/WAMP Users:**
- Usually password **empty** hota hai
- `.env` me: `DB_PASSWORD=` (empty rakhein)

**Standalone MySQL:**
- Installation ke time set kiya gaya password
- Ya command line se check karein: `mysql -u root -p`

### Step 3: Server Restart

```bash
npm run dev
```

## Common Scenarios:

1. **Password Empty Hai (XAMPP/WAMP):**
   ```env
   DB_PASSWORD=
   ```

2. **Password Set Hai:**
   ```env
   DB_PASSWORD=yourpassword123
   ```

3. **Password Nahi Pata:**
   - MySQL reset karein ya
   - New user create karein

## Database Config Updated ✅

Ab code properly handle karega:
- Empty password = No password mode
- Set password = With password

**Just `.env` me correct password set karein aur server restart karein!**

