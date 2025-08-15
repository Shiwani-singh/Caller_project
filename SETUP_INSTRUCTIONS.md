# Call Manager - Setup Instructions

## Issues Fixed

1. **Session Management**: Replaced in-memory sessions with MySQL-based sessions
2. **Error Handling**: Simplified complex error handler to beginner-friendly version
3. **Dashboard Errors**: Fixed missing variables in EJS templates
4. **Route Consistency**: Fixed inconsistent route paths

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Sessions Table

Run the following SQL query in your MySQL database:

```sql
-- Sessions table for MySQL session storage
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` text,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index on expires for better performance
CREATE INDEX IF NOT EXISTS `idx_sessions_expires` ON `sessions` (`expires`);
```

### 3. Environment Variables

Make sure your `.env` file has:

```env
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
```

### 4. Start the Application

```bash
npm run dev
```

## What Was Fixed

### Session Issues
- **Before**: Used in-memory sessions that didn't persist
- **After**: MySQL-based sessions that persist across server restarts
- **Package**: `express-mysql-session`

### Error Handler
- **Before**: Complex error handler with many specific error types
- **After**: Simple, beginner-friendly error handler
- **Inspiration**: Based on wallet-api error middleware

### Dashboard Errors
- **Before**: Missing variables caused 500 errors
- **After**: Safe variable handling with defaults
- **Example**: `locals.user && user.name ? user.name : 'Employee'`

### Route Consistency
- **Before**: Mixed `/v1/` and `/` routes
- **After**: Consistent routes without versioning

## Testing

1. Login as an employee
2. Navigate to `/employee/dashboard`
3. Session should persist after page refresh
4. No more 500 errors on dashboard

## Troubleshooting

### Session Not Working
- Check if sessions table exists
- Verify database connection
- Check SESSION_SECRET in .env

### Dashboard Still Shows Errors
- Check browser console for JavaScript errors
- Verify all routes are working
- Check database connection

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in config
- Test connection with `npm run dev`

