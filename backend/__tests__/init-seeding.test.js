// Copyright 2026 Jeremiah Van Offeren
const fs = require('fs');
const path = require('path');

describe('init.sh seeding safeguards', () => {
  // init.sh is bind-mounted at /app/init.sh inside the backend container
  const initScriptPath = path.resolve(__dirname, '..', 'init.sh');
  const initScript = fs.readFileSync(initScriptPath, 'utf8');

  it('preserves .gitkeep when clearing uploads-target before image seeding', () => {
    expect(initScript).toContain(
      "find /uploads-target -mindepth 1 -maxdepth 1 -type f ! -name '.gitkeep' -delete"
    );
  });

  it('marks seeded images as featured', () => {
    expect(initScript).toContain('INSERT INTO photo_uploads (url, caption, submitter_name, status, featured)');
    expect(initScript).toContain("SELECT :'photo_url', :'photo_caption', 'seed-import', 'approved', TRUE");
  });

  it('includes guest CSV seeding for the 6-column format', () => {
    expect(initScript).toContain('CREATE TEMP TABLE guests_staging_simple');
    expect(initScript).toContain('\\copy guests_staging_simple (name, address, phone, email, rsvp, guest_count)');
    expect(initScript).toContain('Guest seed import succeeded using 6-column format');
  });

  it('includes guest CSV seeding for the 10-column format', () => {
    expect(initScript).toContain('CREATE TEMP TABLE guests_staging_extended');
    expect(initScript).toContain('\\copy guests_staging_extended (first_name, last_name, dependants, street_address, address_line, city, state, zip, phone, email)');
    expect(initScript).toContain('Guest seed import succeeded using 10-column format');
  });

  it('normalizes guest_count with numeric guard when importing simple CSV', () => {
    expect(initScript).toContain("CASE WHEN TRIM(guest_count) ~ '^[0-9]+$' THEN TRIM(guest_count)::INTEGER ELSE 1 END");
  });
});
