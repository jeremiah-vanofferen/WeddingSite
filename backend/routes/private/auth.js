// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../db');
const { authenticateToken, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/verify', authenticateToken, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    return sendInternalError(res, 'Login error', error);
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Current password, new password, and confirmation are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const result = await pool.query('SELECT id, password_hash FROM admin_users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const adminUser = result.rows[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminUser.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return sendInternalError(res, 'Change password error', error);
  }
});

module.exports = router;
