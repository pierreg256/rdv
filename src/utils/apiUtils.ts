/**
 * Utilitaires pour l'API
 */

// Format standard pour les réponses d'API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
  total?: number;
}

// Fonction pour formater les réponses réussies
export const successResponse = <T>(
  data: T,
  message?: string,
  total?: number
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    total,
    timestamp: new Date().toISOString(),
  };
};

// Fonction pour formater les réponses d'erreur
export const errorResponse = (
  message: string,
  statusCode: number = 400
): {
  statusCode: number;
  response: ApiResponse<null>;
} => {
  return {
    statusCode,
    response: {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    },
  };
};

// Fonction pour générer un identifiant de service basé sur ses attributs
export const generateServiceIdentifier = (
  name: string,
  type: string,
  hostname: string,
  port: number
): string => {
  return `${name}-${type}-${hostname}-${port}`;
};

// Fonction pour valider une URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// Fonction pour échapper les caractères spéciaux dans les valeurs de filtrage
export const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
