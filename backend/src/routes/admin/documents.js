const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const asyncHandler = require('../../middleware/asyncHandler');
const documentService = require('../../services/documentService');
const { badRequest } = require('../../lib/errors');

const router = Router();

const ALLOWED_DOC_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const uploadDoc = multer({
  dest: path.join(__dirname, '..', '..', '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOC_MIME[file.mimetype]) {
      return cb(badRequest('Only PDF, JPEG, or PNG files are allowed'));
    }
    cb(null, true);
  },
});

router.get(
  '/:employeeId',
  asyncHandler(async (req, res) => {
    const data = await documentService.listForEmployee(req.params.employeeId);
    res.json({ ok: true, data });
  })
);

router.post(
  '/:employeeId',
  uploadDoc.single('file'),
  asyncHandler(async (req, res) => {
    const data = await documentService.upload({
      employeeId: req.params.employeeId,
      uploadedById: req.user.id,
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
    });
    res.status(201).json({ ok: true, data });
  })
);

module.exports = router;
