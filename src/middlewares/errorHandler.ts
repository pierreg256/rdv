import { Request, Response, NextFunction } from "express";

// Classe pour les erreurs API personnalisées
export class ApiError extends Error {
  statusCode: number;
  errors?: any[];
  data?: any;

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;

    // Nécessaire pour le bon fonctionnement avec prototype inheritance en TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Middleware de gestion des erreurs
 */
export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Déterminer si l'erreur est une ApiError
  const isApiError = err instanceof ApiError;

  const statusCode = isApiError ? err.statusCode : 500;
  const message = err.message || "Erreur serveur";
  const data = isApiError ? err.data : undefined;

  console.error(`[${new Date().toISOString()}] Error:`, err);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data,
    errors: isApiError && err.errors ? err.errors : [],
    // Inclure la stack trace en développement uniquement
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
