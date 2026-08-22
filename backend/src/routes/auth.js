const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../middleware/asyncHandler');
const authService = require('../services/authService');
const { signupSchema, verifyEmailSchema, signinSchema } = require('../validators/authValidators');

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const input = signupSchema.parse(req.body);
    const data = await authService.signup(input);
    res.status(201).json({ ok: true, data });
  })
);

router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = verifyEmailSchema.parse(req.body);
    const data = await authService.verifyEmail(token);
    res.json({ ok: true, data });
  })
);

router.post(
  '/signin',
  asyncHandler(async (req, res) => {
    const input = signinSchema.parse(req.body);
    const data = await authService.signin(input);
    res.json({ ok: true, data });
  })
);

module.exports = router;
