// Copyright 2026 Jeremiah Van Offeren

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const uploadPhoto = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(Object.assign(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), { status: 400 }));
  }
});

module.exports = { uploadDir, uploadPhoto };
