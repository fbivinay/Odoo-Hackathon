const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const employeeService = require('../services/employeeService');
const { selfEditSchema } = require('../validators/employeeValidators');
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

router.post(
  '/me/photo',
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const photoUrl = `/uploads/${req.file.filename}`;
    const data = await employeeService.updateSelf(req.user.id, { photoUrl });
    res.json({ ok: true, data });
  })
);

module.exports = router;
