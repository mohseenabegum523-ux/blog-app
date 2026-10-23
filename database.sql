-- =====================================================
-- database.sql
-- Simple Blogging Platform - Database Setup File
-- Compatible with XAMPP MySQL (localhost, user: root, no password)
--
-- HOW TO USE:
-- 1. Start XAMPP and turn ON Apache + MySQL
-- 2. Open phpMyAdmin (http://localhost/phpmyadmin)
-- 3. Click "Import" tab and select this file
--    (OR simply copy-paste this entire file into the SQL tab and click "Go")
-- =====================================================

-- Create the database (if it does not already exist)
CREATE DATABASE IF NOT EXISTS blogdb;

-- Select the database to use
USE blogdb;

-- ---------------------------------------------------
-- Table: users
-- Stores registered user accounts
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- ---------------------------------------------------
-- Table: blogs
-- Stores all blog posts
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Setup complete!
-- The "blogdb" database with "users" and "blogs" tables
-- is now ready to be used by the Node.js server.
-- =====================================================
