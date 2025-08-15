# Call Manager - Simple Call Management System

A simple Node.js application for managing callers and employees, designed to be beginner-friendly with proper validation.

## Features

- **User Management**: Super admin can create and manage employees
- **Caller Management**: Add, edit, and manage callers
- **Assignment System**: Assign callers to employees
- **CSV Handling**: Download CSV templates and upload with 1MB limit
- **Basic Authentication**: Simple session-based authentication
- **Route Versioning**: All routes use `/v1` prefix
- **Comprehensive Validation**: Zod schemas for both frontend and backend

## Project Structure

```
Caller_project/
├── config/          # Configuration files
├── controller/      # Route controllers
├── middlewares/     # Express middlewares
├── models/          # Database models
├── public/          # Static files, CSV templates, and validation
├── routes/          # Route definitions
├── utils/           # Utility functions
├── views/           # EJS templates
├── app.js           # Main application file
├── server.js        # Server startup file
└── schema.sql       # Database schema
```

## Key Changes Made

### 1. **Route Versioning Added**
- All routes now use `/v1` prefix (e.g., `/v1/admin/dashboard`, `/v1/employee/callers`)
- Updated `server.js`, `app.js`, all route files, and view templates
- Consistent versioning across the entire application

### 2. **Simplified BaseModel**
- Removed complex helper methods (escape, buildWhereClause, buildOrderClause, etc.)
- Kept only essential `query()` and `transaction()` methods
- Now supports raw SQL queries with parameters for flexibility
- Beginner-friendly and easy to understand

### 3. **Simplified Logger**
- Replaced complex Winston-based logger with simple console-based logging
- Based on the wallet-api pattern but simplified for beginners
- Basic file logging support with environment variable control
- Simple methods: `info()`, `warn()`, `error()`, `success()`, `debug()`

### 4. **Simplified AppError Class**
- Replaced complex error management with simple AppError class
- Based on wallet-api pattern but simplified
- Basic error logging and response formatting
- Easy to understand and extend

### 5. **Removed Caller Role**
- Callers are now just data entities, not users
- Removed all caller role references from authentication
- Only `super_admin` and `employee` roles exist
- Simplified authentication logic throughout the application

### 6. **Enhanced CSV Handling with Validation**
- CSV uploads limited to 1MB maximum
- Proper Zod validation for file type, size, and content
- Static CSV templates in `/public/templates/`
- Comprehensive error handling and validation

### 7. **Comprehensive Zod Validation**
- **Backend Validation**: Zod schemas for all data inputs
- **Frontend Validation**: Client-side validation utility in `/public/js/validation.js`
- **File Validation**: CSV upload validation with 1MB limit
- **Consistent Schemas**: Same validation rules on both frontend and backend
- **Clean Implementation**: No code duplication, centralized validation

### 8. **Removed Complex Dependencies**
- Removed `winston` (replaced with simple logger)
- Removed `node-cron` (cron jobs removed)
- Kept `zod` for proper validation
- Kept only essential dependencies
- Simplified project structure

### 9. **Cleaned Up Duplicate Process Handlers**
- Removed duplicate `process.on` handlers from cronJobs.js
- Centralized process handling in server.js
- Cleaner shutdown handling

### 10. **Simplified Database Schema**
- Removed unnecessary `caller_assignment_log` table
- Kept only essential tables: `roles`, `users`, `callers`
- Simplified database structure

### 11. **Updated All Views**
- All href attributes now use `/v1` prefix
- Consistent routing throughout the application
- Updated navigation and links

### 12. **Beginner-Friendly Approach**
- Simple, straightforward code structure
- Easy to understand and modify
- Follows basic Node.js/Express patterns
- Proper validation without complexity

## Validation Features

### Backend Validation (Zod)
- **User Schemas**: Create, update, login validation
- **Caller Schemas**: Create, update, CSV row validation
- **Assignment Schemas**: Caller assignment and marking as called
- **Upload Schemas**: File validation with 1MB limit

### Frontend Validation (JavaScript)
- **Real-time Validation**: Input field validation on blur/input
- **Form Validation**: Complete form validation before submission
- **File Validation**: CSV file validation with size and type checks
- **Error Display**: Clean error messages with Bootstrap styling

### CSV Upload Validation
- **File Size**: Maximum 1MB limit
- **File Type**: Only CSV files allowed
- **Content Validation**: Each row validated against caller schema
- **Error Reporting**: Detailed error messages for invalid rows

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Create database using `schema.sql`
5. Start the application: `npm run dev`

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=call_assignment

# Application Configuration
APP_NAME=Call Manager
APP_VERSION=1.0.0
PORT=3000
NODE_ENV=development

# Debug Configuration
APP_DEBUG=true
DEBUG=false

# Logging Configuration
FILE_LOGGER=true

# Session Configuration
SESSION_SECRET=your-secret-key-change-in-production

# File Upload Configuration
# Note: CSV uploads are limited to 1MB by default
# This can be modified in config/index.js if needed
```

## Usage

- **Super Admin**: Access `/v1/admin/dashboard` to manage users and callers
- **Employee**: Access `/v1/employee/dashboard` to view assigned callers
- **Authentication**: Use `/v1/auth/login` for user authentication
- **CSV Upload**: Download template and upload with 1MB limit

## Dependencies

- **Express**: Web framework
- **MySQL2**: Database driver
- **EJS**: Template engine
- **Express-session**: Session management
- **Bcrypt**: Password hashing
- **Chalk**: Console colors
- **Zod**: Schema validation (frontend and backend)

## Development

This project demonstrates:
- Basic Express.js setup with route versioning
- Simple MySQL database operations with raw queries
- Basic authentication and authorization
- Simple view rendering with EJS
- Comprehensive validation with Zod schemas
- Client-side validation for better UX
- File upload validation with size limits

## Future Enhancements

The project is kept simple intentionally. Future enhancements can be added as needed:
- Advanced logging
- API endpoints
- Real-time features
- Advanced CSV processing
- Database migrations
- Cron jobs (when needed)
