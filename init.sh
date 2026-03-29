#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    rsvp VARCHAR(20) DEFAULT 'Pending' CHECK (rsvp IN ('Yes', 'No', 'Pending')),
    plus_one BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table for contact form
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- Insert default settings (admin email comes from ADMIN_EMAIL env var)
INSERT INTO settings (key, value) VALUES ('adminEmail', '${ADMIN_EMAIL:-your@email.com}') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('websiteName', 'My Wedding') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('theme', 'elegant') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('primaryColor', '#0a20ca') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('primaryColorHover', '#1894dc') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('fontFamily', 'sans serif') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('showCountdown', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('allowRsvp', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('welcomeMessage', 'Thank you for visiting our wedding website. We''re thrilled to share the details of our celebration with you.') ON CONFLICT (key) DO NOTHING;

-- Insert default admin user (Jeremiah with Wedding8826)
INSERT INTO admin_users (username, password_hash)
VALUES ('Jeremiah', '\$2a\$10\$eSkin6Cy1ZR8aoLv3c.vjer3FwM1HHPsHdh/4t1J0Gx9cc95sNTIO')
ON CONFLICT (username) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp ON guests(rsvp);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);

EOSQL
