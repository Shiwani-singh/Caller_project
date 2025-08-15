-- Sessions table for MySQL session storage
-- This table stores user sessions for the Call Manager application

CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` text,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index on expires for better performance
CREATE INDEX IF NOT EXISTS `idx_sessions_expires` ON `sessions` (`expires`);

-- Optional: Add a cleanup event to remove expired sessions
-- This requires MySQL event scheduler to be enabled
-- SET GLOBAL event_scheduler = ON;

-- CREATE EVENT IF NOT EXISTS `cleanup_expired_sessions`
-- ON SCHEDULE EVERY 1 HOUR
-- DO
--   DELETE FROM `sessions` WHERE `expires` < UNIX_TIMESTAMP();
