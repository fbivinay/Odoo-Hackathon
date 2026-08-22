const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const employeeService = require('../services/employeeService');
const authService = require('../services/authService');
const documentService = require('../services/documentService');
const { selfEditSchema } = require('../validators/employeeValidators');
const { changePasswordSchema } = require('../validators/authValidators');
const { badRequest } = require('../lib/errors');

const router = Router();

const ALLOWED_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Raster-only allowlist — SVG is deliberately excluded, it can embed
    // <script>/onload and would execute as stored XSS when opened from /uploads.
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
      return cb(badRequest('Only JPEG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

const ALLOWED_DOC_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const uploadDoc = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOC_MIME[file.mimetype]) {
      return cb(badRequest('Only PDF, JPEG, or PNG files are allowed'));
    }
    cb(null, true);
  },
});

router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const data = await employeeService.getById(req.user.id);
    res.json({ ok: true, data });
  })
);

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const input = selfEditSchema.parse(req.body);
    const data = await employeeService.updateSelf(req.user.id, input);
    res.json({ ok: true, data });
  })
);

router.patch(
  '/me/password',
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const data = await authService.changePassword(req.user.id, input);
    res.json({ ok: true, data });
  })
);

router.post(
  '/me/photo',
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const photoUrl = `/uploads/${req.file.filename}`;
    const data = await employeeService.updateSelf(req.user.id, { photoUrl });
    res.json({ ok: true, data });
  })
);

router.get(
  '/me/documents',
  asyncHandler(async (req, res) => {
    const data = await documentService.listForEmployee(req.user.id);
    res.json({ ok: true, data });
  })
);

router.post(
  '/me/documents',
  uploadDoc.single('file'),
  asyncHandler(async (req, res) => {
    const data = await documentService.upload({
      employeeId: req.user.id,
      uploadedById: req.user.id,
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
    });
    res.status(201).json({ ok: true, data });
  })
);

module.exports = router;
