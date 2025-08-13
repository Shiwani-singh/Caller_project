# Call Manager

A production-ready Node.js + Express 5 + MySQL2 web application for managing callers and employees with automatic assignment capabilities.

## 🚀 Features

- **User Management**: Role-based access control (Super Admin, Employee, Caller)
- **Caller Management**: Add, edit, and manage callers individually or in bulk
- **CSV Bulk Upload**: Upload up to 200 callers at once with validation
- **Automatic Assignment**: Cron-based automatic caller assignment to employees
- **Manual Assignment**: Admin-controlled manual caller assignment
- **Call Tracking**: Mark callers as called and track completion
- **Responsive UI**: Bootstrap 5-based responsive interface
- **Security**: CSRF protection, rate limiting, input validation
- **Logging**: Comprehensive logging with Winston and color-coded output

## 🛠️ Tech Stack

- **Backend**: Node.js (latest LTS), Express 5
- **Database**: MySQL2 with connection pooling
- **Views**: EJS + Bootstrap 5
- **Authentication**: express-session, bcrypt
- **Validation**: Zod schemas (shared frontend/backend)
- **Security**: Helmet, CSRF protection, rate limiting
- **File Upload**: Multer (CSV only)
- **CSV Handling**: fast-csv
- **Cron Jobs**: node-cron
- **Logging**: Winston + chalk

## 📁 Project Structure

```
CWS_Caller_Project/
├── config/                 # Configuration files
│   ├── index.js           # Environment variables loader
│   └── errorCodes.js      # Error code definitions
├── controllers/            # Route controllers
├── middlewares/            # Express middlewares
│   ├── auth.js            # Authentication & authorization
│   └── errorHandler.js    # Error handling
├── models/                 # Database models
│   ├── BaseModel.js       # Base database operations
│   ├── User.js            # User management
│   └── Caller.js          # Caller management
├── routes/                 # Route definitions
│   ├── auth.js            # Authentication routes
│   ├── admin.js           # Admin routes
│   └── employee.js        # Employee routes
├── utils/                  # Utility functions
│   ├── logger.js          # Logging configuration
│   ├── AppError.js        # Custom error class
│   ├── validation.js      # Zod validation schemas
│   ├── csvHandler.js      # CSV processing
│   └── cronJobs.js        # Scheduled tasks
├── views/                  # EJS templates
├── public/                 # Static assets
├── logs/                   # Application logs
├── uploads/                # File uploads
├── schema.sql              # Database schema
├── sample_data.sql         # Sample data
├── server.js               # Main application file
├── package.json            # Dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CWS_Caller_Project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE call_assignment;
```

2. Import the schema:
```bash
mysql -u root -p call_assignment < schema.sql
```

3. Import sample data (optional):
```bash
mysql -u root -p call_assignment < sample_data.sql
```

### 4. Environment Configuration

1. Copy the environment file:
```bash
cp env.example .env
```

2. Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=call_assignment
SESSION_SECRET=your-secret-key
DEBUG=false
FILE_LOGGING=false
APP_NAME=Call Manager
APP_VERSION=1.0.0
PORT=3000
NODE_ENV=development
```

### 5. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## 🔐 Default Login Credentials

### Super Admin
- **Email**: admin@callmanager.com
- **Password**: admin123

### Employee
- **Email**: employee@callmanager.com
- **Password**: employee123

## 📊 Features Overview

### Super Admin Dashboard
- User management (create, edit, delete)
- Caller management (individual and bulk)
- CSV bulk upload with validation
- Manual caller assignment
- System administration
- Reports and analytics

### Employee Dashboard
- View assigned callers
- Mark callers as called
- Edit caller information
- Export data to CSV
- Personal reports

### CSV Bulk Upload
- **Template Download**: Get CSV template with headers
- **Validation**: Automatic validation of all rows
- **Error Handling**: Detailed error reports for failed rows
- **Batch Processing**: Efficient bulk insertion
- **Duplicate Detection**: Prevents duplicate entries

### Automatic Assignment
- **Cron Jobs**: Runs every 5 minutes
- **Smart Distribution**: Assigns callers to employees with 0 active callers
- **Batch Size**: Up to 100 callers per assignment
- **Logging**: Tracks all assignments with method (auto/manual)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | call_assignment |
| `SESSION_SECRET` | Session encryption key | (required) |
| `DEBUG` | Enable debug mode | false |
| `FILE_LOGGING` | Enable file logging | false |
| `APP_NAME` | Application name | Call Manager |
| `APP_VERSION` | Application version | 1.0.0 |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |

### Database Configuration

The application uses MySQL2 with connection pooling:

- **Connection Limit**: 10
- **Acquire Timeout**: 60 seconds
- **Query Timeout**: 60 seconds
- **Auto-reconnect**: Enabled

## 📁 CSV Upload Rules

### File Requirements
- **Format**: CSV only
- **Size**: Maximum 5MB
- **Rows**: Maximum 200 rows
- **Encoding**: UTF-8

### Required Columns
```csv
name,email,phone
John Doe,john@example.com,+1234567890
Jane Smith,jane@example.com,+1234567891
```

### Validation Rules
- **Name**: 2-100 characters
- **Email**: Valid email format, unique
- **Phone**: 10-20 digits, unique
- **No duplicates**: Within file or database

## 🚦 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/logout` - User logout
- `GET /auth/profile` - User profile
- `POST /auth/profile` - Update profile

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/users` - User management
- `GET /admin/callers` - Caller management
- `POST /admin/callers/upload` - CSV upload
- `POST /admin/callers/assign` - Manual assignment

### Employee Routes
- `GET /employee/dashboard` - Employee dashboard
- `GET /employee/callers` - Assigned callers
- `POST /employee/callers/:id/mark-called` - Mark as called

### System
- `GET /health` - Health check endpoint

## 🔒 Security Features

- **CSRF Protection**: All forms protected
- **Rate Limiting**: Login attempts limited
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Helmet security headers
- **Session Security**: HttpOnly cookies, secure sessions

## 📝 Logging

### Log Levels
- **Development**: All levels with stack traces
- **Production**: Warn and error only
- **File Logging**: Optional, configurable

### Log Categories
- 🚀 Startup information
- ✅ Success operations
- ⚠️ Warnings
- ❌ Errors
- 🔍 Debug information
- 🗄️ Database operations
- 🔐 Authentication
- 📁 File uploads
- ⏰ Cron jobs

## 🕐 Cron Jobs

### Automatic Caller Assignment
- **Schedule**: Every 5 minutes
- **Logic**: Assigns unassigned callers to employees with 0 active callers
- **Batch Size**: Up to 100 callers per assignment
- **Method**: Auto-assigned (logged in database)

### Database Health Check
- **Schedule**: Every 10 minutes
- **Purpose**: Monitor database connectivity
- **Action**: Logs connection status

### Manual Trigger
Admin can manually trigger cron jobs via the system administration page.

## 🧪 Testing

### Run Linting
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Configure secure `SESSION_SECRET`
3. Set up proper database credentials
4. Enable file logging if needed
5. Configure reverse proxy (nginx/Apache)
6. Set up SSL certificates
7. Configure firewall rules

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL service status
   - Verify credentials in `.env`
   - Ensure database exists

2. **CSV Upload Fails**
   - Check file format (must be CSV)
   - Verify file size (< 5MB)
   - Check column headers match template

3. **Authentication Issues**
   - Clear browser cookies
   - Check session configuration
   - Verify user exists in database

4. **Cron Jobs Not Running**
   - Check cron job status in admin panel
   - Verify system timezone
   - Check application logs

### Log Locations
- **Application Logs**: `/logs/app.log`
- **Uncaught Errors**: `/logs/uncaught.log`
- **Console Output**: Development mode with colors

## 📚 API Documentation

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "statusCode": 400,
    "timestamp": "2025-01-13T12:00:00Z"
  }
}
```

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review application logs
- Create an issue in the repository

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Complete user management system
- Caller management with CSV upload
- Automatic assignment system
- Role-based access control
- Comprehensive logging and error handling

---

**Call Manager** - Professional call management made simple.
