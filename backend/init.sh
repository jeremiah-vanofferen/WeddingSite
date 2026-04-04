#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v admin_username="${ADMIN_USERNAME:-admin}" \
    -v admin_password="${ADMIN_PASSWORD:-password123}" \
    -v registry_link="${REGISTRY_LINK}" \
    -v wedding_date="${WEDDING_DATE:-2030-06-20}" \
    -v wedding_time="${WEDDING_TIME:-16:00}" \
    -v wedding_time_zone="${WEDDING_TIME_ZONE:-America/New_York}" \
    -v wedding_location="${WEDDING_LOCATION:-Celebration Venue}" \
    -v wedding_address="${WEDDING_ADDRESS:-123 Celebration Ave, Hometown, ST 12345}" \
    -v wedding_description="${WEDDING_DESCRIPTION:-Join us for our ceremony and reception.}" <<-EOSQL

-- Enable pgcrypto for in-database password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    rsvp VARCHAR(20) DEFAULT 'Pending' CHECK (rsvp IN ('Yes', 'No', 'Pending')),
    guest_count INTEGER DEFAULT 1 CONSTRAINT guests_guest_count_non_negative CHECK (guest_count >= 0),
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
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
INSERT INTO settings (key, value) VALUES ('weddingDate', :'wedding_date') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingTime', :'wedding_time') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingTimeZone', :'wedding_time_zone') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingLocation', :'wedding_location') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingAddress', :'wedding_address') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('weddingDescription', :'wedding_description') ON CONFLICT (key) DO NOTHING;
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
CREATE INDEX IF NOT EXISTS idx_guests_approval_status ON guests(approval_status);

EOSQL

# Seed any pre-existing files from the uploads folder as approved photos.
# This runs only during first database initialization.
UPLOADS_SEED_DIR="${UPLOADS_SEED_DIR:-/seed-uploads}"
if [ -d "$UPLOADS_SEED_DIR" ]; then
    if [ -d "/uploads-target" ]; then
        # Remove previously seeded files before copying seed images again.
        find /uploads-target -mindepth 1 -maxdepth 1 -type f ! -name '.gitkeep' -delete || true
    fi

    for file in "$UPLOADS_SEED_DIR"/*; do
        [ -f "$file" ] || continue

        filename="$(basename "$file")"
        ext="${filename##*.}"
        ext_lower="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"

        case "$ext_lower" in
            jpg|jpeg|png|gif|webp)
                ;;
            *)
                continue
                ;;
        esac

        url="/uploads/$filename"
        caption="${filename%.*}"

        # Only seed the database when the file copy succeeds to avoid broken gallery entries.
        if cp "$file" "/uploads-target/$filename" 2>/dev/null; then
            psql -v ON_ERROR_STOP=1 \
                     --username "$POSTGRES_USER" \
                     --dbname "$POSTGRES_DB" \
                     -v photo_url="$url" \
                     -v photo_caption="$caption" <<-'EOSQL'
INSERT INTO photo_uploads (url, caption, submitter_name, status, featured)
SELECT :'photo_url', :'photo_caption', 'seed-import', 'approved', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM photo_uploads WHERE url = :'photo_url'
);
EOSQL
        else
            echo "Skipping image seed for $filename: failed to copy into /uploads-target"
        fi
    done
fi

# Seed guests from the first compatible CSV file found in seed-uploads.
# Supported formats:
# 1) Name,Address,Phone,Email,RSVP,Guest Count
# 2) First name,Last Name,Dependants,Street address,Address Line,City,State,Zip,Phone,Email
for csv_file in "$UPLOADS_SEED_DIR"/*.csv; do
    [ -f "$csv_file" ] || continue
    echo "Attempting guest seed import from $(basename "$csv_file")..."

    # Format 1: Name,Address,Phone,Email,RSVP,Guest Count
    if psql -v ON_ERROR_STOP=1 \
         --username "$POSTGRES_USER" \
         --dbname "$POSTGRES_DB" <<EOSQL
CREATE TEMP TABLE guests_staging_simple (
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    rsvp TEXT,
    guest_count TEXT
);
\copy guests_staging_simple (name, address, phone, email, rsvp, guest_count) FROM '$csv_file' CSV HEADER

INSERT INTO guests (name, email, phone, address, rsvp, guest_count, approval_status)
SELECT
    TRIM(name),
    NULLIF(TRIM(email), ''),
    NULLIF(TRIM(phone), ''),
    NULLIF(TRIM(address), ''),
    CASE
        WHEN UPPER(TRIM(rsvp)) = 'YES' THEN 'Yes'
        WHEN UPPER(TRIM(rsvp)) = 'NO' THEN 'No'
        ELSE 'Pending'
    END,
    CASE WHEN TRIM(guest_count) ~ '^[0-9]+$' THEN TRIM(guest_count)::INTEGER ELSE 1 END,
    'approved'
FROM guests_staging_simple
WHERE TRIM(name) != ''
ON CONFLICT (email) DO NOTHING;
EOSQL
    then
        echo "Guest seed import succeeded using 6-column format"
        break
    fi

    # Format 2: First name,Last Name,Dependants,Street address,Address Line,City,State,Zip,Phone,Email
    if psql -v ON_ERROR_STOP=1 \
         --username "$POSTGRES_USER" \
         --dbname "$POSTGRES_DB" <<EOSQL
CREATE TEMP TABLE guests_staging_extended (
    first_name TEXT,
    last_name TEXT,
    dependants TEXT,
    street_address TEXT,
    address_line TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    email TEXT
);
\copy guests_staging_extended (first_name, last_name, dependants, street_address, address_line, city, state, zip, phone, email) FROM '$csv_file' CSV HEADER

INSERT INTO guests (name, email, phone, address, rsvp, guest_count, approval_status)
SELECT
    TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), ''))),
    NULLIF(TRIM(email), ''),
    NULLIF(TRIM(phone), ''),
    NULLIF(
        TRIM(
            CONCAT_WS(', ',
                NULLIF(TRIM(street_address), ''),
                NULLIF(TRIM(address_line), ''),
                NULLIF(TRIM(city), ''),
                NULLIF(TRIM(state), ''),
                NULLIF(TRIM(zip), '')
            )
        ),
        ''
    ),
    'Pending',
    1,
    'approved'
FROM guests_staging_extended
WHERE TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), ''))) != ''
ON CONFLICT (email) DO NOTHING;
EOSQL
    then
        echo "Guest seed import succeeded using 10-column format"
        break
    fi

    echo "Guest seed import skipped for $(basename "$csv_file"): unsupported CSV format"
done
