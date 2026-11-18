import { z } from 'zod';

export const createTeacherSchema = z
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
    specialization: z
      .string({ required_error: 'specialization is required' })
      .trim()
      .min(2, 'specialization must be at least 2 characters long')
      .max(100, 'specialization must be at most 100 characters long'),
    experience: z
      .number({
        required_error: 'experience is required',
        invalid_type_error: 'experience must be a number',
      })
      .min(0, 'experience cannot be negative')
      .max(70, 'experience cannot exceed 70 years'),
  })
  .strict();

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
