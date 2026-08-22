const { z } = require('zod');

const applyLeaveSchema = z
  .object({
    type: z.enum(['PAID', 'SICK', 'UNPAID']),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    remarks: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

module.exports = { applyLeaveSchema, decisionSchema };
