# Call Manager - Production-Ready Node.js Application

A fully working, production-ready Node.js + Express 5 + MySQL2 web application for managing callers and employees. This application adheres to DRY principles, is beginner-friendly, and meets production-usable standards.

## 🚀 Tech Stack

- **Runtime**: Node.js (latest LTS) with ES6 Modules
- **Web Framework**: Express 5
- **Database**: MySQL2 (pooled connections, no Sequelize)
- **Template Engine**: EJS
- **UI Framework**: Bootstrap 5
- **Authentication**: `express-session` for server-side sessions, `bcrypt` for password hashing
- **Validation**: `Zod` for shared validation schemas
- **Security**: `helmet` and `csurf` for security, `express-rate-limit` for login
- **File Handling**: `Multer` for CSV file uploads, `fast-csv` for CSV parsing
- **Scheduling**: `node-cron` for cron jobs
- **Messaging**: `connect-flash` for flash messages
- **Logging**: `winston` + `chalk` for logging with optional file logging
- **Error Handling**: Centralized `AppError` class with error codes
- **Development**: `nodemon`, `eslint`, `prettier`, `dotenv`

## 📁 Project Structure

```
CWS_Caller_Project/
├── config/                 # Configuration files
│   ├── index.js           # Centralized config loader
│   └── errorCodes.js      # Application-specific error codes
├── controller/             # Business logic controllers
│   ├── authController.js   # Authentication logic
│   ├── adminController.js  # Admin functionality logic
│   └── employeeController.js # Employee functionality logic
├── middlewares/            # Express middleware
│   ├── auth.js            # Authentication & authorization
│   └── errorHandler.js    # Centralized error handling
├── models/                 # Database models
│   ├── BaseModel.js       # Base database model class
│   ├── User.js            # User management
│   └── Caller.js          # Caller management
├── routes/                 # Route definitions only
│   ├── auth.js            # Authentication routes
│   ├── admin.js           # Admin routes
│   └── employee.js        # Employee routes
├── utils/                  # Utility functions
│   ├── AppError.js        # Custom error class
│   ├── logger.js          # Winston-based logging
│   ├── validation.js      # Zod validation schemas
│   ├── csvHandler.js      # CSV file processing
│   └── cronJobs.js        # Scheduled task management
├── views/                  # EJS templates
│   ├── auth/              # Authentication views
│   ├── admin/             # Admin panel views
│   ├── employee/          # Employee views
│   └── error.ejs          # Error page
├── public/                 # Static assets
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── uploads/           # File uploads
├── logs/                   # Application logs
├── uploads/                # CSV file uploads
├── schema.sql              # Database schema
├── sample_data.sql         # Sample data
├── server.js               # Main application file
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variables template
├── .eslintrc.json          # ESLint configuration
└── .prettierrc             # Prettier configuration
```

## 🏗️ Architecture Overview

This application follows the **MVC (Model-View-Controller)** pattern with a clear separation of concerns:

- **Models** (`/models`): Handle database operations and business logic
- **Views** (`/views`): EJS templates for rendering HTML
- **Controllers** (`/controller`): Contain all business logic and request handling
- **Routes** (`/routes`): Define URL endpoints and connect them to controller methods
- **Middleware** (`/middlewares`): Handle cross-cutting concerns like authentication and error handling

### Controller Pattern

All business logic has been moved from route files into dedicated controller classes:

- **`AuthController`**: Handles user authentication, registration, profile management, and password operations
- **`AdminController`**: Manages super admin functionality including user/caller management, CSV uploads, and system administration
- **`EmployeeController`**: Handles employee-specific operations like viewing assigned callers and marking them as called

Route files now only contain:
- Route definitions (HTTP method + path)
- Middleware application
- Controller method calls

This separation provides:
- **Better maintainability**: Business logic is centralized and easier to test
- **Cleaner routes**: Route files are focused solely on URL mapping
- **Reusability**: Controller methods can be called from multiple routes if needed
- **Testability**: Business logic can be unit tested independently

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ (LTS version recommended)
- MySQL 8.0+ server
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CWS_Caller_Project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

4. **Set up the database**
   ```bash
   # Create database
   mysql -u root -p -e "CREATE DATABASE call_assignment;"
   
   # Import schema
   mysql -u root -p call_assignment < schema.sql
   
   # Import sample data
   mysql -u root -p call_assignment < sample_data.sql
   ```

5. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Login with the default super admin account:
     - Email: `admin@callmanager.com`
     - Password: `admin123`

## 🔐 Authentication & Roles

The application implements a role-based access control system:

### Roles

- **`super_admin`**: Full system access, can manage users, callers, and system settings
- **`employee`**: Can view assigned callers, mark them as called, and manage their own profile
- **`caller`**: Basic user role (can be expanded for future features)

### Security Features

- **Password Hashing**: Uses `bcrypt` with salt rounds of 12
- **Session Management**: Server-side sessions with `express-session`
- **CSRF Protection**: All forms are protected with `csurf`
- **Rate Limiting**: Login attempts are rate-limited to prevent brute force attacks
- **Input Validation**: All user inputs are validated using Zod schemas
- **SQL Injection Prevention**: Uses parameterized queries and input sanitization

## ✨ Features

### Super Admin Dashboard
- **User Management**: Add, edit, delete users with role assignment
- **Caller Management**: Add individual callers or bulk upload via CSV
- **Assignment System**: Manual assignment of callers to employees
- **System Monitoring**: View cron job status, database health, and system statistics
- **Reports & Analytics**: Comprehensive reporting on users, callers, and batches

### Employee Dashboard
- **Assigned Callers**: View list of callers assigned to the employee
- **Call Management**: Mark callers as called (removes from active list)
- **Profile Management**: Update personal information and change password
- **Export Functionality**: Download assigned callers as CSV
- **Performance Reports**: View completion rates and batch statistics

### CSV Bulk Upload System
- **Template Download**: Download CSV template with required columns
- **Validation**: Comprehensive validation of CSV data including:
  - Required fields (name, email, phone)
  - Email format validation
  - Phone number format validation
  - Duplicate detection (both in file and database)
- **Batch Processing**: Automatic batch ID assignment for uploaded callers
- **Error Handling**: Detailed error reporting for invalid rows
- **File Size Limits**: Maximum 5MB file size with 200 row limit

### Automatic Assignment System
- **Cron Jobs**: Scheduled automatic assignment every X minutes
- **Load Balancing**: Assigns callers to employees with 0 active callers
- **Assignment Logging**: Tracks all assignments with timestamps and methods
- **Manual Override**: Admins can manually assign callers to specific employees

## 🗄️ Database Schema

### Core Tables

- **`users`**: User accounts with role-based access control
- **`roles`**: Role definitions and permissions
- **`callers`**: Caller information and assignment status
- **`caller_assignment_log`**: Audit trail for all caller assignments

### Key Features

- **Indexes**: Optimized for common queries (email, phone, status, assigned_to)
- **Foreign Keys**: Proper referential integrity between tables
- **Timestamps**: Automatic creation and update timestamps
- **Soft Deletes**: Data preservation with status-based filtering

## 🛡️ Security Features

### Application Security
- **Helmet**: Security headers for XSS protection, content type sniffing, etc.
- **CSRF Protection**: All forms protected against cross-site request forgery
- **Rate Limiting**: Prevents brute force attacks on authentication endpoints
- **Input Sanitization**: All user inputs are cleaned and validated
- **SQL Injection Prevention**: Parameterized queries and input escaping

### Session Security
- **Secure Cookies**: HTTPS-only cookies in production
- **HttpOnly**: Prevents XSS attacks on session cookies
- **Session Expiry**: Automatic session cleanup after 24 hours
- **CSRF Tokens**: Unique tokens for each form submission

## 🧪 Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run linting
npm run lint

# Format code with Prettier
npm run format
```

### Code Quality

- **ESLint**: JavaScript linting with strict rules
- **Prettier**: Automatic code formatting
- **ES6 Modules**: Modern JavaScript import/export syntax
- **Async/Await**: Modern asynchronous programming patterns

### Testing

The application is structured to support easy testing:
- **Controllers**: Business logic can be unit tested independently
- **Models**: Database operations can be mocked for testing
- **Routes**: Endpoint testing with controller method mocking

## 📊 CSV Upload Rules

### Required Columns
- **`name`**: Caller's full name (required)
- **`email`**: Valid email address (required, must be unique)
- **`phone`**: Phone number (required, must be unique)

### Validation Rules
- **File Size**: Maximum 5MB
- **Row Limit**: Maximum 200 rows per upload
- **Email Format**: Must be valid email format
- **Phone Format**: Must be valid phone number
- **Uniqueness**: No duplicate emails or phones in file or database
- **Batch Assignment**: All valid callers get assigned to the same batch

### Error Handling
- **Row-by-Row Validation**: Each row is validated independently
- **Detailed Error Messages**: Specific error messages for each validation failure
- **Partial Success**: Valid rows are processed even if some rows fail
- **Error Reporting**: Downloadable CSV with error details for failed rows

## 🔄 Assignment System

### Automatic Assignment
- **Frequency**: Configurable cron job (default: every X minutes)
- **Algorithm**: Assigns oldest unassigned callers to employees with 0 active callers
- **Batch Size**: Processes up to 100 callers per run
- **Logging**: All assignments are logged with timestamps and methods

### Manual Assignment
- **Admin Interface**: Multi-select interface for caller assignment
- **Employee Selection**: Choose specific employee for assignment
- **Bulk Operations**: Assign multiple callers at once
- **Validation**: Ensures callers are not already assigned

### Assignment Tracking
- **Audit Trail**: Complete history of all assignments
- **Method Tracking**: Distinguishes between automatic and manual assignments
- **Timestamp Recording**: Precise timing of all assignment operations
- **User Attribution**: Tracks which admin performed manual assignments

## 📈 Monitoring & Logging

### Logging System
- **Winston Logger**: Structured logging with multiple levels
- **Console Output**: Colored output for development
- **File Logging**: Optional file-based logging for production
- **Log Rotation**: Automatic log file management
- **Uncaught Error Logging**: Captures all unhandled errors

### Log Levels
- **Error**: Application errors and exceptions
- **Warn**: Warning conditions and potential issues
- **Info**: General information and status updates
- **Debug**: Detailed debugging information (development only)

### Monitoring Features
- **Health Check Endpoint**: `/health` route for system monitoring
- **Database Connection**: Automatic connection testing on startup
- **Cron Job Status**: Monitoring of scheduled task execution
- **Performance Metrics**: Response time and throughput tracking

## 🚨 Error Handling

### Centralized Error Management
- **AppError Class**: Custom error class with structured error information
- **Error Codes**: Standardized error codes for consistent error handling
- **Global Error Handler**: Catches all unhandled errors
- **User-Friendly Messages**: Appropriate error messages for different user types

### Error Types
- **Validation Errors**: Input validation failures
- **Authentication Errors**: Login and permission failures
- **Database Errors**: Database connection and query failures
- **File Upload Errors**: CSV processing and file handling failures

### Error Recovery
- **Graceful Degradation**: Application continues running even with errors
- **User Feedback**: Clear error messages and recovery suggestions
- **Logging**: All errors are logged for debugging and monitoring
- **Fallback Handling**: Default behavior when operations fail

## 🌍 Environment Variables

### Required Variables
```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=call_assignment

# Session Security
SESSION_SECRET=your_very_long_random_secret_key

# Application Settings
PORT=3000
NODE_ENV=development
```

### Optional Variables
```bash
# Logging Configuration
FILE_LOGGING=true
DEBUG=true

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# File Upload Limits
MAX_FILE_SIZE=5242880
MAX_ROWS=200
```

## 📱 Responsive Design

### Bootstrap 5 Integration
- **Mobile-First**: Responsive design that works on all devices
- **Component Library**: Pre-built UI components for consistent design
- **Grid System**: Flexible layout system for different screen sizes
- **Utility Classes**: Helper classes for spacing, colors, and typography

### Custom Styling
- **Custom CSS**: Application-specific styles and overrides
- **Theme Consistency**: Unified color scheme and typography
- **Interactive Elements**: Hover effects, transitions, and animations
- **Accessibility**: High contrast and keyboard navigation support

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify MySQL server is running
   - Check database credentials in `.env` file
   - Ensure database exists and is accessible

2. **Port Already in Use**
   - Change `PORT` in `.env` file
   - Kill existing process using the port
   - Use `npm run dev` for development

3. **CSV Upload Fails**
   - Check file format (must be CSV)
   - Verify file size (max 5MB)
   - Ensure required columns are present
   - Check for duplicate emails/phones

4. **Authentication Issues**
   - Verify session configuration
   - Check `SESSION_SECRET` in `.env`
   - Clear browser cookies and try again

### Debug Mode

Enable debug mode for detailed logging:
```bash
DEBUG=true npm run dev
```

### Log Files

Check log files in the `logs/` directory for detailed error information:
```bash
tail -f logs/app.log
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Code Standards
- Follow ESLint rules
- Use Prettier for formatting
- Write clear commit messages
- Include tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the error logs
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ using modern Node.js best practices**
