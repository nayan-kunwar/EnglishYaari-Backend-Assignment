import { z } from 'zod';

import { objectIdSchema } from './common.validator';

const dateTimestampSchema = z
  .union([z.string(), z.number()], {
    errorMap: () => ({
      message: 'dateTimestamp must be an epoch timestamp (ms) or ISO-8601 date',
    }),
  })
  .transform((value, ctx) => {
    const raw = typeof value === 'string' ? value.trim() : value;
    const looksLikeEpoch =
      typeof raw === 'number' || /^-?\d+$/.test(String(raw));
    const date = looksLikeEpoch ? new Date(Number(raw)) : new Date(String(raw));

    if (raw === '' || Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'dateTimestamp must be a valid epoch timestamp (ms) or ISO-8601 date',
      });
      return z.NEVER;
    }

    return date;
  });

export const createSessionSchema = z
  .object({
    teacherId: objectIdSchema('teacherId'),
    startTime: z.coerce.date({
      required_error: 'startTime is required',
      invalid_type_error: 'startTime must be a valid date',
    }),
    endTime: z.coerce.date({
      required_error: 'endTime is required',
      invalid_type_error: 'endTime must be a valid date',
    }),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be greater than startTime',
      });
    }
  });

export const bookSessionSchema = z
  .object({
    userId: objectIdSchema('userId'),
  })
  .strict();

export const availableSessionsQuerySchema = z
  .object({
    dateTimestamp: dateTimestampSchema,
  })
  .strict();

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type BookSessionInput = z.infer<typeof bookSessionSchema>;
export type AvailableSessionsQuery = z.infer<
  typeof availableSessionsQuerySchema
>;
