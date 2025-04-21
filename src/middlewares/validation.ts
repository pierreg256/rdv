import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { errorResponse } from "../utils/apiUtils";

/**
 * Middleware de validation d'ID
 */
export const validateId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id || typeof id !== "string" || id.length < 10) {
    const { statusCode, response } = errorResponse(
      "ID invalide ou manquant",
      400
    );
    return res.status(statusCode).json(response);
  }

  next();
};

/**
 * Middleware pour valider le résultat de express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const { statusCode, response } = errorResponse(
      "Données d'entrée invalides",
      400
    );
    return res.status(statusCode).json({
      ...response,
      errors: errors.array(),
    });
  }

  next();
};
