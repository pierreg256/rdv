import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import serviceDiscoveryService from "../services/serviceDiscovery.service";
import { ServiceType, ServiceStatus, Service } from "../models/service.model";
import { successResponse, errorResponse } from "../utils/apiUtils";
import { ApiError } from "../middlewares/errorHandler";

export class ServiceController {
  /**
   * Enregistre un nouveau service
   */
  async registerService(req: Request, res: Response, next: NextFunction) {
    try {
      // Valider les données d'entrée
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

      // Récupérer l'adresse IP du client si elle n'est pas fournie
      if (!req.body.ipAddress) {
        req.body.ipAddress = req.ip;
      }

      // Enregistrer le service
      const service = await serviceDiscoveryService.registerService(req.body);

      res
        .status(201)
        .json(successResponse(service, "Service enregistré avec succès"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Met à jour un service existant
   */
  async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      // Valider les données d'entrée
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

      const { id } = req.params;
      const updatedService = await serviceDiscoveryService.updateService(
        id,
        req.body
      );

      if (!updatedService) {
        const { statusCode, response } = errorResponse(
          `Service avec l'ID ${id} non trouvé`,
          404
        );
        return res.status(statusCode).json(response);
      }

      res
        .status(200)
        .json(
          successResponse(updatedService, "Service mis à jour avec succès")
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rafraîchit un service (heartbeat)
   */
  async refreshService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const refreshedService = await serviceDiscoveryService.refreshService(id);

      if (!refreshedService) {
        const { statusCode, response } = errorResponse(
          `Service avec l'ID ${id} non trouvé`,
          404
        );
        return res.status(statusCode).json(response);
      }

      res
        .status(200)
        .json(
          successResponse(refreshedService, "Service rafraîchi avec succès")
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprime un service
   */
  async unregisterService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await serviceDiscoveryService.unregisterService(id);

      if (!deleted) {
        const { statusCode, response } = errorResponse(
          `Service avec l'ID ${id} non trouvé`,
          404
        );
        return res.status(statusCode).json(response);
      }

      res
        .status(200)
        .json(
          successResponse(null, `Service avec l'ID ${id} supprimé avec succès`)
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère un service par son ID
   */
  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const service = await serviceDiscoveryService.getServiceById(id);

      if (!service) {
        const { statusCode, response } = errorResponse(
          `Service avec l'ID ${id} non trouvé`,
          404
        );
        return res.status(statusCode).json(response);
      }

      res.status(200).json(successResponse(service));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recherche des services
   */
  async findServices(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = ServiceController.parseQueryFilters(req);
      const result = await serviceDiscoveryService.findServices(filters);

      res
        .status(200)
        .json(successResponse(result.services, undefined, result.total));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vérifie si un service est actif
   */
  async checkServiceHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const service = await serviceDiscoveryService.getServiceById(id);

      if (!service) {
        const { statusCode, response } = errorResponse(
          `Service avec l'ID ${id} non trouvé`,
          404
        );
        return res.status(statusCode).json(response);
      }

      const isActive = service.status === ServiceStatus.ACTIVE;

      res.status(200).json(
        successResponse({
          id: service.id,
          name: service.name,
          status: service.status,
          active: isActive,
          lastSeen: new Date(service.lastUpdated).toISOString(),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère des statistiques sur les services enregistrés
   */
  async getServiceStats(req: Request, res: Response, next: NextFunction) {
    try {
      const allServices = await serviceDiscoveryService.findServices({});
      const services = allServices.services;

      // Statistiques par type de service
      const servicesByType: Record<string, number> = {};
      // Statistiques par statut
      const servicesByStatus: Record<string, number> = {};
      // Compter les services actifs, inactifs, etc.
      let activeCount = 0;
      let inactiveCount = 0;
      let unreachableCount = 0;

      // Collecter les statistiques
      services.forEach((service) => {
        // Compter par type
        servicesByType[service.type] = (servicesByType[service.type] || 0) + 1;

        // Compter par statut
        servicesByStatus[service.status] =
          (servicesByStatus[service.status] || 0) + 1;

        // Statut global
        if (service.status === ServiceStatus.ACTIVE) {
          activeCount++;
        } else if (service.status === ServiceStatus.INACTIVE) {
          inactiveCount++;
        } else if (service.status === ServiceStatus.UNREACHABLE) {
          unreachableCount++;
        }
      });

      res.status(200).json(
        successResponse(
          {
            total: services.length,
            activeCount,
            inactiveCount,
            unreachableCount,
            byType: servicesByType,
            byStatus: servicesByStatus,
          },
          "Statistiques des services"
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère les services par type
   */
  async getServicesByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;

      // Vérifier si le type est valide
      if (!Object.values(ServiceType).includes(type as ServiceType)) {
        const { statusCode, response } = errorResponse(
          `Type de service '${type}' invalide`,
          400
        );
        return res.status(statusCode).json(response);
      }

      const filters = { type: type as ServiceType };
      const result = await serviceDiscoveryService.findServices(filters);

      res
        .status(200)
        .json(
          successResponse(
            result.services,
            `Services de type '${type}'`,
            result.total
          )
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyse les paramètres de requête pour créer des filtres
   */
  static parseQueryFilters(req: Request) {
    const filters: any = {};

    // Filtrer par type de service
    if (
      req.query.type &&
      Object.values(ServiceType).includes(req.query.type as ServiceType)
    ) {
      filters.type = req.query.type as ServiceType;
    }

    // Filtrer par nom
    if (req.query.name) {
      filters.name = req.query.name as string;
    }

    // Filtrer par hostname
    if (req.query.hostname) {
      filters.hostname = req.query.hostname as string;
    }

    // Filtrer par port
    if (req.query.port) {
      filters.port = parseInt(req.query.port as string, 10);
    }

    // Filtrer par protocole
    if (req.query.protocol) {
      filters.protocol = req.query.protocol as string;
    }

    // Filtrer par sous-type
    if (req.query.subtype) {
      filters.subtype = req.query.subtype as string;
    }

    // Filtrer par statut
    if (
      req.query.status &&
      Object.values(ServiceStatus).includes(req.query.status as ServiceStatus)
    ) {
      filters.status = req.query.status as ServiceStatus;
    }

    // Filtrer par métadonnées
    if (req.query.metadataKey) {
      filters.metadataKey = req.query.metadataKey as string;

      if (req.query.metadataValue) {
        filters.metadataValue = req.query.metadataValue;
      }
    }

    return filters;
  }
}

export default new ServiceController();
