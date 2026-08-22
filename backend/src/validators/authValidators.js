const { z } = require('zod');

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const signupSchema = z.object({
  employeeId: z.string().min(1),
  email: z.string().email(),
  password: passwordRule,
  name: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = { signupSchema, verifyEmailSchema, signinSchema };
