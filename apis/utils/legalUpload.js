const multer = require('multer');
const path = require('path');
const fs = require('fs');

const legalDir = path.join(__dirname, '..', 'uploads', 'legal');
if (!fs.existsSync(legalDir)) {
  fs.mkdirSync(legalDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, legalDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname) || '.pdf';
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const legalUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = legalUpload;
