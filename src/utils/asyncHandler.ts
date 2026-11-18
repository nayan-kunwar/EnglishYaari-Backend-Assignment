import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Express 4 does not forward rejected promises to the error middleware.
 * This wrapper keeps controllers free of repetitive try/catch blocks.
 */
export const asyncHandler =
  (handler: AsyncRouteHandler): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };
