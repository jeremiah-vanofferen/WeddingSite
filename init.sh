#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v admin_username="${ADMIN_USERNAME:-admin}" \
    -v admin_password="${ADMIN_PASSWORD:-password123}" \
    -v registry_link="${REGISTRY_LINK}" <<-EOSQL

-- Enable pgcrypto for in-database password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Create schedule table
CREATE TABLE IF NOT EXISTS schedule (
    id SERIAL PRIMARY KEY,
    time VARCHAR(10) NOT NULL,
    event VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Insert default schedule events
INSERT INTO schedule (time, event, description, sort_order) VALUES ('14:00', 'Ceremony', 'Outdoor wedding ceremony', 1) ON CONFLICT DO NOTHING;
INSERT INTO schedule (time, event, description, sort_order) VALUES ('15:00', 'Cocktail Hour', 'Drinks and appetizers', 2) ON CONFLICT DO NOTHING;
INSERT INTO schedule (time, event, description, sort_order) VALUES ('16:00', 'Reception', 'Dinner and dancing', 3) ON CONFLICT DO NOTHING;
INSERT INTO schedule (time, event, description, sort_order) VALUES ('20:00', 'End of Evening', 'Farewell and thank you', 4) ON CONFLICT DO NOTHING;

-- Insert default settings (admin email comes from ADMIN_EMAIL env var)
INSERT INTO settings (key, value) VALUES ('adminEmail', '${ADMIN_EMAIL:-your@email.com}') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('websiteName', '${WEBSITE_NAME:-My Wedding}') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('theme', 'elegant') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('primaryColor', '#0a20ca') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('primaryColorHover', '#1894dc') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('fontFamily', 'sans-serif') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('showCountdown', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('allowRsvp', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('welcomeMessage', 'Thank you for visiting our wedding website. We''re thrilled to share the details of our celebration with you.') ON CONFLICT (key) DO NOTHING;
-- Wedding details
INSERT INTO settings (key, value) VALUES ('weddingDate', '2026-08-08') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingTime', '14:00') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingTimeZone', 'America/Chicago') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingLocation', 'Windpoint Lighthouse') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingAddress', '4725 Lighthouse Drive, Wind Point, WI 53402') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingDescription', 'Join us for a beautiful outdoor ceremony followed by an elegant reception.') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('registryUrl', :'registry_link') ON CONFLICT (key) DO NOTHING;

-- Insert admin user (credentials from ADMIN_USERNAME/ADMIN_PASSWORD env vars; defaults: admin/password123)
INSERT INTO admin_users (username, password_hash)
VALUES (:'admin_username', crypt(:'admin_password', gen_salt('bf', 10)))
ON CONFLICT (username) DO NOTHING;

-- Create photo_uploads table (user-submitted gallery photos requiring admin approval)
CREATE TABLE IF NOT EXISTS photo_uploads (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    caption VARCHAR(255),
    submitter_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    featured BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp ON guests(rsvp);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_status ON photo_uploads(status);

EOSQL
