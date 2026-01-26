-- Migration: Allow NULL for email in users table
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
