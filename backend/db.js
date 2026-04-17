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

async function runMigrations() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await ensureGuestCountColumn();
    await ensureApprovalStatusColumn();
  } catch (error) {
    console.error('Startup migration error:', error);
    throw error;
  }
}

module.exports = { pool, getAdminEmail, normalizeGuestCount, ensureApprovalStatusColumn, runMigrations };
