-- InterviewAI Database Schema
-- MySQL 8.0

CREATE DATABASE IF NOT EXISTS interviewai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE interviewai;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  domain        VARCHAR(60)  NOT NULL,
  overall       TINYINT UNSIGNED DEFAULT 0,
  technical     TINYINT UNSIGNED DEFAULT 0,
  communication TINYINT UNSIGNED DEFAULT 0,
  confidence    TINYINT UNSIGNED DEFAULT 0,
  grammar       TINYINT UNSIGNED DEFAULT 0,
  answers       JSON,
  date          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
