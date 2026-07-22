const multer = require('multer');
const path = require('path');
const fs = require('fs');

const bannerDir = path.join(__dirname, '..', 'uploads', 'banners');
if (!fs.existsSync(bannerDir)) {
  fs.mkdirSync(bannerDir, { recursive: true });
}

const getExtensionFromMimeType = (mimetype) => {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  return mimeToExt[mimetype] || '';
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, bannerDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = getExtensionFromMimeType(file.mimetype) || path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WEBP images are allowed!'), false);
  }
};

const bannerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = bannerUpload;
