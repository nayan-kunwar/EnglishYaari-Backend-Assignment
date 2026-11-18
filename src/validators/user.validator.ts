import { z } from 'zod';

export const createUserSchema = z
  .object({
    fullName: z
      .string({ required_error: 'fullName is required' })
      .trim()
      .min(2, 'fullName must be at least 2 characters long')
      .max(100, 'fullName must be at most 100 characters long'),
    email: z
      .string({ required_error: 'email is required' })
      .trim()
      .email('email must be a valid email address')
      .transform((value) => value.toLowerCase()),
    phone: z
      .string({ required_error: 'phone is required' })
      .trim()
      .regex(
        /^\+?[0-9][0-9\s-]{6,19}$/,
        'phone must be a valid phone number (7-20 digits, optional leading +)',
      ),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
