-- Daily Habit Tracker Database Schema
-- Database: habit_tracker

CREATE DATABASE IF NOT EXISTS `habit_tracker` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `habit_tracker`;

DROP TABLE IF EXISTS `habits`;

CREATE TABLE `habits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `is_completed_today` TINYINT(1) NOT NULL DEFAULT 0,
  `streak_count` INT NOT NULL DEFAULT 0,
  `frequency` VARCHAR(50) NOT NULL DEFAULT 'Daily',
  `icon_type` VARCHAR(50) NOT NULL DEFAULT 'water',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data matching UI Mockup
INSERT INTO `habits` (`title`, `is_completed_today`, `streak_count`, `frequency`, `icon_type`) VALUES
('Drink 8 Glasses Water', 0, 3, 'Daily', 'water'),
('Read 20 Minutes', 0, 5, 'Daily', 'book'),
('No Social Media before 9AM', 0, 2, 'Weekdays', 'nosocial'),
('Journal Writing', 0, 7, 'Daily', 'journal'),
('Workout', 0, 4, 'Weekdays', 'workout');
