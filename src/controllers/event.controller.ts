import { Request, Response, NextFunction } from "express";
import serviceEventService from "../services/serviceEvent.service";
import { ServiceEventType } from "../models/serviceEvent.model";
import { successResponse, errorResponse } from "../utils/apiUtils";

export class EventController {
  /**
   * Récupère tous les événements avec pagination
   */
  async getAllEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 100;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;

      const result = await serviceEventService.getAllEvents(limit, offset);

      res
        .status(200)
        .json(
          successResponse(result.events, "Liste des événements", result.total)
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère un événement par son ID
   */
  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await serviceEventService.getEventById(id);

      if (!event) {
        const { statusCode, response } = errorResponse(
          `Événement avec l'ID ${id} non trouvé`,
          404
        );
        return res.status(statusCode).json(response);
      }

      res.status(200).json(successResponse(event));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère les événements d'un service spécifique
   */
  async getServiceEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 100;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;

      const result = await serviceEventService.getEventsByServiceId(
        serviceId,
        limit,
        offset
      );

      res
        .status(200)
        .json(
          successResponse(
            result.events,
            `Événements pour le service ${serviceId}`,
            result.total
          )
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère les événements par type
   */
  async getEventsByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 100;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;

      // Vérifier si le type est valide
      if (!Object.values(ServiceEventType).includes(type as ServiceEventType)) {
        const { statusCode, response } = errorResponse(
          `Type d'événement '${type}' invalide`,
          400
        );
        return res.status(statusCode).json(response);
      }

      const result = await serviceEventService.getEventsByType(
        type as ServiceEventType,
        limit,
        offset
      );

      res
        .status(200)
        .json(
          successResponse(
            result.events,
            `Événements de type '${type}'`,
            result.total
          )
        );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprime les événements anciens
   */
  async pruneEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { olderThan } = req.query;

      if (!olderThan) {
        const { statusCode, response } = errorResponse(
          "Paramètre 'olderThan' requis (en jours)",
          400
        );
        return res.status(statusCode).json(response);
      }

      const days = parseInt(olderThan as string, 10);
      if (isNaN(days) || days <= 0) {
        const { statusCode, response } = errorResponse(
          "Le paramètre 'olderThan' doit être un nombre positif",
          400
        );
        return res.status(statusCode).json(response);
      }

      const now = Date.now();
      const cutoffTimestamp = now - days * 24 * 60 * 60 * 1000;

      const deletedCount = await serviceEventService.pruneEvents(
        cutoffTimestamp
      );

      res
        .status(200)
        .json(
          successResponse(
            { deletedCount, olderThan: days },
            `${deletedCount} événements supprimés avec succès`
          )
        );
    } catch (error) {
      next(error);
    }
  }
}

export default new EventController();
