import type { RequestHandler } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';

import { ApiError } from '../utils/ApiError';

const formatIssues = (error: ZodError, fallbackField: string) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || fallbackField,
    message: issue.message,
  }));

export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new ApiError(400, 'Validation failed', formatIssues(result.error, 'body')));
      return;
    }

    req.body = result.data;
    next();
  };

export const validateQuery =
  (schema: ZodTypeAny): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(new ApiError(400, 'Validation failed', formatIssues(result.error, 'query')));
      return;
    }

    // req.query is a getter in Express; keep parsed/coerced values on res.locals.
    res.locals.query = result.data;
    next();
  };
