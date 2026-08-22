const { z } = require('zod');

const selfEditSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

const adminEditSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().url().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'HR_ADMIN']).optional(),
});

module.exports = { selfEditSchema, adminEditSchema };
