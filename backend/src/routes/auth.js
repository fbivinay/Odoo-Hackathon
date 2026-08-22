const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../middleware/asyncHandler');
const authService = require('../services/authService');
const { signinSchema } = require('../validators/authValidators');

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

router.post(
  '/signin',
  asyncHandler(async (req, res) => {
    const input = signinSchema.parse(req.body);
    const data = await authService.signin(input);
    res.json({ ok: true, data });
  })
);

module.exports = router;
