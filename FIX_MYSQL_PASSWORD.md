# Fix MySQL Password Error - Quick Solution

## Error:
```
Access denied for user 'root'@'localhost' (using password: NO)
```

## Solution Options:

### Option 1: Set Password in `.env` File (Recommended)

1. **Open `LottryBackend/.env` file**

2. **Add/Update `DB_PASSWORD`:**
   ```env
   DB_PASSWORD=your_mysql_password_here
   ```

3. **If you don't know your MySQL password:**

   **For XAMPP/WAMP:**
   - Usually password is **empty**
   - Set: `DB_PASSWORD=` (empty, no value)

   **For Standalone MySQL:**
   - Check installation password
   - Or reset password (see below)

### Option 2: Reset MySQL Root Password

**Windows (Command Prompt as Admin):**
```bash
# Stop MySQL service
net stop MySQL

# Start MySQL without password check
mysqld --skip-grant-tables

# In another terminal, connect:
mysql -u root

# Reset password:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# Restart MySQL normally
```

### Option 3: Create New MySQL User (Alternative)

```sql
CREATE USER 'lottery_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON lottery_db.* TO 'lottery_user'@'localhost';
FLUSH PRIVILEGES;
```

Then in `.env`:
```env
DB_USER=lottery_user
DB_PASSWORD=your_password
```

## Quick Fix Steps:

1. **Check if MySQL has password:**
   ```bash
   mysql -u root -p
   ```
   - If it asks for password → password set hai
   - If connects without password → no password

2. **Update `.env` accordingly:**
   ```env
   # If password exists:
   DB_PASSWORD=your_actual_password
   
   # If no password (XAMPP/WAMP):
   DB_PASSWORD=
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

## Most Common Solution (XAMPP/WAMP):

If you're using XAMPP or WAMP, usually password is empty:

**`.env` file:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lottery_db
DB_USER=root
DB_PASSWORD=
```

**Note:** Leave `DB_PASSWORD=` empty (no value after =)

## Test Connection:

After updating `.env`, restart server. You should see:
```
✅ MySQL connected successfully
✅ Database synchronized - All tables ready
✅ Server running on port: 5000
```

If still getting error, check MySQL service is running!

