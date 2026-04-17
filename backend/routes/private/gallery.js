// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('../../db');
const { authenticateToken, sendBadRequest, sendNotFound, sendInternalError } = require('../../middleware');
const { uploadDir, uploadPhoto } = require('../../upload');

const router = Router();

router.get('/pending', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM photo_uploads WHERE status = 'pending' ORDER BY uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Gallery pending fetch error', error);
  }
});

router.post('/upload-file-admin', authenticateToken, (req, res) => {
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
           VALUES ($1, $2, $3, 'approved') RETURNING *`,
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

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return sendBadRequest(res, "status must be 'approved' or 'rejected'");
    }
    const result = await pool.query(
      `UPDATE photo_uploads SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found');
    }
    res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Gallery status update error', error);
  }
});

router.put('/:id/featured', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    if (typeof featured !== 'boolean') {
      return sendBadRequest(res, 'featured must be a boolean');
    }
    const result = await pool.query(
      `UPDATE photo_uploads SET featured = $1 WHERE id = $2 AND status = 'approved' RETURNING *`,
      [featured, id]
    );
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found or not approved');
    }
    res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Gallery featured update error', error);
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, caption, featured } = req.body;

    if (!url || typeof url !== 'string') {
      return sendBadRequest(res, 'Photo URL is required');
    }
    if (!/^https?:\/\/.+/i.test(url) && !url.startsWith('/uploads/')) {
      return sendBadRequest(res, 'Photo URL must start with http://, https://, or /uploads/');
    }
    if (!caption || typeof caption !== 'string') {
      return sendBadRequest(res, 'Photo caption is required');
    }
    if (typeof featured !== 'boolean') {
      return sendBadRequest(res, 'featured must be a boolean');
    }

    const result = await pool.query(
      `UPDATE photo_uploads SET url = $1, caption = $2, featured = $3
       WHERE id = $4 AND status = 'approved' RETURNING *`,
      [url.trim(), caption.trim(), featured, id]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found or not approved');
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Gallery photo update error', error);
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM photo_uploads WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found');
    }

    const deletedPhoto = result.rows[0];
    if (deletedPhoto.url && deletedPhoto.url.startsWith('/uploads/')) {
      const filePath = path.join(uploadDir, path.basename(deletedPhoto.url));
      fs.unlink(filePath, () => {});
    }

    return res.json({ success: true, photo: deletedPhoto });
  } catch (error) {
    return sendInternalError(res, 'Gallery delete error', error);
  }
});

module.exports = router;
