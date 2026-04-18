// Copyright 2026 Jeremiah Van Offeren

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

let guestCountColumnReady = false;

async function getAdminEmail() {
  const result = await pool.query("SELECT value FROM settings WHERE key = 'adminEmail'");
  return result.rows[0]?.value || process.env.ADMIN_EMAIL;
}

function normalizeGuestCount(guestCount, plusOne) {
  if (guestCount !== undefined && guestCount !== null && String(guestCount).trim() !== '') {
    const parsed = Number.parseInt(guestCount, 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return plusOne ? 2 : 1;
}

async function ensureGuestCountColumn() {
  if (guestCountColumnReady || process.env.NODE_ENV === 'test') return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const guestCountColumnResult = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'guests' AND column_name = 'guest_count' LIMIT 1`
    );
    if (guestCountColumnResult.rowCount === 0) {
      await client.query('ALTER TABLE guests ADD COLUMN guest_count INTEGER');
    }

    const plusOneColumnResult = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'guests' AND column_name = 'plus_one' LIMIT 1`
    );
    if (plusOneColumnResult.rowCount > 0) {
      await client.query(
        'UPDATE guests SET guest_count = CASE WHEN plus_one THEN 2 ELSE 1 END WHERE guest_count IS NULL'
      );
      await client.query('ALTER TABLE guests DROP COLUMN IF EXISTS plus_one');
    }

    await client.query('UPDATE guests SET guest_count = 1 WHERE guest_count IS NULL');
    await client.query('ALTER TABLE guests ALTER COLUMN guest_count SET DEFAULT 1');

    const emailNotNullResult = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'guests' AND column_name = 'email' AND is_nullable = 'NO' LIMIT 1`
    );
    if (emailNotNullResult.rowCount > 0) {
      await client.query('ALTER TABLE guests ALTER COLUMN email DROP NOT NULL');
    }

    const guestCountConstraintResult = await client.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'guests_guest_count_non_negative' LIMIT 1`
    );
    if (guestCountConstraintResult.rowCount === 0) {
      await client.query(
        `ALTER TABLE guests ADD CONSTRAINT guests_guest_count_non_negative CHECK (guest_count >= 0) NOT VALID`
      );
      await client.query('ALTER TABLE guests VALIDATE CONSTRAINT guests_guest_count_non_negative');
    }

    await client.query('COMMIT');
    guestCountColumnReady = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

let approvalStatusColumnReady = false;
let approvalStatusColumnReadyPromise = null;

async function ensureApprovalStatusColumn() {
  if (process.env.NODE_ENV === 'test') return;
  if (approvalStatusColumnReady) return;
  if (approvalStatusColumnReadyPromise) {
    await approvalStatusColumnReadyPromise;
    return;
  }

  approvalStatusColumnReadyPromise = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name = 'guests' AND column_name = 'approval_status' LIMIT 1`
      );
      if (result.rowCount === 0) {
        await client.query(
          `ALTER TABLE guests ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved'
           CHECK (approval_status IN ('pending', 'approved', 'rejected'))`
        );
      }

      await client.query('COMMIT');
      approvalStatusColumnReady = true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      approvalStatusColumnReadyPromise = null;
    }
  })();

  await approvalStatusColumnReadyPromise;
}

// Returns a SELECT column list that decrypts email/phone/address using the given SQL param reference.
function guestDecryptCols(keyParam) {
  return `id, name,
    CASE WHEN email IS NOT NULL THEN pgp_sym_decrypt(decode(email, 'base64'), ${keyParam}) ELSE NULL END AS email,
    CASE WHEN phone IS NOT NULL THEN pgp_sym_decrypt(decode(phone, 'base64'), ${keyParam}) ELSE NULL END AS phone,
    CASE WHEN address IS NOT NULL THEN pgp_sym_decrypt(decode(address, 'base64'), ${keyParam}) ELSE NULL END AS address,
    rsvp, guest_count, approval_status, created_at, updated_at`;
}

async function encryptGuestColumns() {
  if (process.env.NODE_ENV === 'test') return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const already = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name = 'encrypt_guest_columns' LIMIT 1"
    );
    if (already.rowCount > 0) {
      await client.query('ROLLBACK');
      return;
    }

    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY is required for migration');

    // Widen columns to TEXT before encrypting — base64 ciphertext exceeds VARCHAR(50/255)
    await client.query('ALTER TABLE guests ALTER COLUMN email   TYPE TEXT');
    await client.query('ALTER TABLE guests ALTER COLUMN phone   TYPE TEXT');
    await client.query('ALTER TABLE guests ALTER COLUMN address TYPE TEXT');

    await client.query(`
      UPDATE guests SET
        email   = CASE WHEN email   IS NOT NULL THEN encode(pgp_sym_encrypt(email,   $1), 'base64') ELSE NULL END,
        phone   = CASE WHEN phone   IS NOT NULL THEN encode(pgp_sym_encrypt(phone,   $1), 'base64') ELSE NULL END,
        address = CASE WHEN address IS NOT NULL THEN encode(pgp_sym_encrypt(address, $1), 'base64') ELSE NULL END
    `, [key]);

    await client.query('DROP INDEX IF EXISTS idx_guests_email');
    await client.query('ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_email_key');

    await client.query("INSERT INTO schema_migrations (name) VALUES ('encrypt_guest_columns')");

    await client.query('COMMIT');
    console.log('Guest sensitive columns encrypted');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await ensureGuestCountColumn();
    await ensureApprovalStatusColumn();
    await encryptGuestColumns();
  } catch (error) {
    console.error('Startup migration error:', error);
    throw error;
  }
}

module.exports = { pool, getAdminEmail, normalizeGuestCount, ensureApprovalStatusColumn, runMigrations, guestDecryptCols };
