-- Call Manager Database Schema
-- Simple database structure for the call management system

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS call_assignment;
USE call_assignment;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS caller_assignment_log;
DROP TABLE IF EXISTS callers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- Create roles table
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role_id (role_id)
);

-- Create callers table
CREATE TABLE callers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    assigned_to INT NULL,
    assigned_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    batch_id VARCHAR(50) NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_batch_id (batch_id),
    INDEX idx_status (status)
);

-- Create caller assignment log table
CREATE TABLE caller_assignment_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    caller_id INT NOT NULL,
    employee_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NOT NULL,
    method ENUM('auto', 'manual') NOT NULL,
    FOREIGN KEY (caller_id) REFERENCES callers(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_caller_id (caller_id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_assigned_at (assigned_at)
);

-- Insert default roles
INSERT INTO roles (name) VALUES 
('super_admin'),
('employee'),
('caller');

-- Insert default super admin user (password: admin123)
INSERT INTO users (name, email, phone, password, role_id) VALUES 
('Super Admin', 'admin@callmanager.com', '+1234567890', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- Insert sample employee (password: employee123)
INSERT INTO users (name, email, phone, password, role_id) VALUES 
('John Employee', 'employee@callmanager.com', '+1234567891', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2);

-- Insert sample callers
INSERT INTO callers (name, email, phone, batch_id) VALUES 
('Alice Johnson', 'alice@example.com', '+1234567892', 'BATCH_001'),
('Bob Smith', 'bob@example.com', '+1234567893', 'BATCH_001'),
('Carol Davis', 'carol@example.com', '+1234567894', 'BATCH_001');
