-- Sample Data for Call Manager
-- This file contains additional sample data for development and testing

USE call_assignment;

-- Insert additional sample employees
INSERT INTO users (name, email, phone, password, role_id) VALUES 
('Sarah Wilson', 'sarah@callmanager.com', '+1234567895', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2),
('Mike Brown', 'mike@callmanager.com', '+1234567896', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2),
('Lisa Garcia', 'lisa@callmanager.com', '+1234567897', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2);

-- Insert additional sample callers
INSERT INTO callers (name, email, phone, batch_id) VALUES 
('David Miller', 'david@example.com', '+1234567898', 'BATCH_002'),
('Emma Taylor', 'emma@example.com', '+1234567899', 'BATCH_002'),
('Frank Anderson', 'frank@example.com', '+1234567900', 'BATCH_002'),
('Grace Martinez', 'grace@example.com', '+1234567901', 'BATCH_003'),
('Henry Thompson', 'henry@example.com', '+1234567902', 'BATCH_003'),
('Ivy Rodriguez', 'ivy@example.com', '+1234567903', 'BATCH_003'),
('Jack Lewis', 'jack@example.com', '+1234567904', 'BATCH_004'),
('Kate White', 'kate@example.com', '+1234567905', 'BATCH_004'),
('Leo Harris', 'leo@example.com', '+1234567906', 'BATCH_004'),
('Maya Clark', 'maya@example.com', '+1234567907', 'BATCH_005'),
('Noah Young', 'noah@example.com', '+1234567908', 'BATCH_005'),
('Olivia Hall', 'olivia@example.com', '+1234567909', 'BATCH_005');

-- Assign some callers to employees for testing
UPDATE callers SET assigned_to = 2, assigned_at = NOW() WHERE id IN (1, 2, 3);
UPDATE callers SET assigned_to = 3, assigned_at = NOW() WHERE id IN (4, 5, 6);
UPDATE callers SET assigned_to = 4, assigned_at = NOW() WHERE id IN (7, 8, 9);

-- Insert some assignment log entries
INSERT INTO caller_assignment_log (caller_id, employee_id, assigned_by, method) VALUES 
(1, 2, 1, 'manual'),
(2, 2, 1, 'manual'),
(3, 2, 1, 'manual'),
(4, 3, 1, 'manual'),
(5, 3, 1, 'manual'),
(6, 3, 1, 'manual'),
(7, 4, 1, 'manual'),
(8, 4, 1, 'manual'),
(9, 4, 1, 'manual');
