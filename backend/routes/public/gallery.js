// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const fs = require('fs');
const { pool } = require('../../db');
const { authenticatePublicToken, strictLimiter, sendBadRequest, sendInternalError } = require('../../middleware');
const { uploadPhoto } = require('../../upload');

const router = Router();

router.get('/', authenticatePublicToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, url, caption, submitter_name, featured, uploaded_at
       FROM photo_uploads WHERE status = 'approved'
       ORDER BY uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Gallery fetch error', error);
  }
});

router.get('/carousel/featured', authenticatePublicToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, url, caption, submitter_name, uploaded_at
       FROM photo_uploads WHERE status = 'approved' AND featured = true
       ORDER BY uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Featured carousel fetch error', error);
  }
});

router.post('/upload', strictLimiter, authenticatePublicToken, async (req, res) => {
  try {
    const { url, caption, submitterName } = req.body;
    if (!url) {
      return sendBadRequest(res, 'Photo URL is required');
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      return sendBadRequest(res, 'Photo URL must start with http:// or https://');
    }
    const result = await pool.query(
      `INSERT INTO photo_uploads (url, caption, submitter_name, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [url, caption || null, submitterName || null]
    );
    res.status(201).json({ success: true, photo: result.rows[0] });
  } catch (error) {
    return sendInternalError(res, 'Gallery upload error', error);
  }
});

router.post('/upload-file', strictLimiter, authenticatePublicToken, (req, res) => {
  uploadPhoto.array('photo', 10)(req, res, async (uploadError) => {
    try {
      if (uploadError) {
        const status = uploadError.status || (uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
        return res.status(status).json({ error: uploadError.message || 'Invalid upload' });
      }

      const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      if (files.length === 0) {
        return sendBadRequest(res, 'At least one image file is required');
      }

      const { caption, submitterName } = req.body;
      const uploadedPhotos = [];

      for (const file of files) {
        const url = `/uploads/${file.filename}`;
        const result = await pool.query(
          `INSERT INTO photo_uploads (url, caption, submitter_name, status)
           VALUES ($1, $2, $3, 'pending') RETURNING *`,
          [url, caption || null, submitterName || null]
        );
        uploadedPhotos.push(result.rows[0]);
      }

      return res.status(201).json({ success: true, photo: uploadedPhotos[0], photos: uploadedPhotos });
    } catch (error) {
      const uploadedFiles = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      for (const file of uploadedFiles) {
        if (file?.path) fs.unlink(file.path, () => {});
      }
      return sendInternalError(res, 'Gallery file upload error', error);
    }
  });
});

module.exports = router;
