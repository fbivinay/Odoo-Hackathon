const { z } = require('zod');

const createPayrollSchema = z.object({
  employeeId: z.string().uuid(),
  baseSalary: z.coerce.number().positive(),
  effectiveDate: z.coerce.date(),
});

module.exports = { createPayrollSchema };
