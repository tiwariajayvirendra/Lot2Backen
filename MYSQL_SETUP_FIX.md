# MySQL Connection Fix

## Error: "Access denied for user 'root'@'localhost' (using password: NO)"

Yeh error aa raha hai kyunki MySQL root user ko password chahiye, lekin `.env` file me password set nahi hai.

## Solutions (किसी एक को चुनें):

### Option 1: `.env` File Me Password Set Karein (Recommended)

`LottryBackend/.env` file me `DB_PASSWORD` add karein:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lottery_db
DB_USER=root
DB_PASSWORD=your_mysql_password_here
```

**Note:** Agar aapka MySQL root user ka password hai, to woh yahan add karein.

### Option 2: MySQL Root User Ka Password Check Karein

Agar aapko password nahi pata, to:

1. **MySQL Command Line se check karein:**
   ```bash
   mysql -u root -p
   ```
   Agar password prompt aata hai, to password set hai.

2. **XAMPP/WAMP users ke liye:**
   - Usually password empty hota hai
   - `.env` me `DB_PASSWORD=` (empty) rakhein

### Option 3: MySQL Root User Ka Password Set/Reset Karein

Agar password set nahi hai aur aap set karna chahte hain:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
FLUSH PRIVILEGES;
```

Phir `.env` me password add karein.

### Option 4: No Password MySQL Setup (Development Only)

Agar aap development me password-free MySQL use kar rahe hain:

1. MySQL me root user ko no password allow karein:
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY '';
   FLUSH PRIVILEGES;
   ```

2. `.env` me `DB_PASSWORD` ko empty rakhein ya comment out karein:
   ```env
   DB_PASSWORD=
   # ya
   # DB_PASSWORD=
   ```

## Quick Fix Steps:

1. **Check your MySQL password:**
   - XAMPP/WAMP: Usually empty
   - Standalone MySQL: Check your installation password

2. **Update `.env` file:**
   ```env
   DB_PASSWORD=your_actual_password
   # ya empty ke liye
   DB_PASSWORD=
   ```

3. **Server restart karein:**
   ```bash
   npm run dev
   ```

## Common MySQL Passwords:

- **XAMPP:** Usually empty (no password)
- **WAMP:** Usually empty (no password)  
- **MAMP:** Usually `root`
- **Standalone:** Installation ke time set kiya gaya password

## Test Connection:

Database config ab properly handle karega:
- Empty password = `undefined` (MySQL no password mode)
- Set password = actual password

Server restart karein aur check karein!

