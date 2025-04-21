import { Request, Response } from "express";
import serviceDiscoveryService from "../services/serviceDiscovery.service";
import { ServiceType, ServiceStatus } from "../models/service.model";
import { successResponse, errorResponse } from "../utils/apiUtils";

/**
 * Contrôleur pour l'API Ring
 */
export const ringController = {
  /**
   * Récupère la liste des nœuds du ring (services de type RING_NODE)
   */
  async getRingNodes(req: Request, res: Response) {
    try {
      // Rechercher tous les services de type RING_NODE actifs
      const result = await serviceDiscoveryService.findServices({
        type: ServiceType.RING_NODE,
        status: ServiceStatus.ACTIVE,
      });

      // Formater les nœuds pour la réponse API
      const ringNodes = result.services.map((service) => ({
        id: service.id,
        name: service.name,
        hostname: service.hostname,
        ipAddress: service.ipAddress,
        port: service.port,
        protocol: service.protocol,
        path: service.path,
        metadata: service.metadata,
        lastUpdated: service.lastUpdated,
        status: service.status,
      }));

      const response = successResponse(
        { total: result.total, nodes: ringNodes },
        "Liste des nœuds du ring récupérée avec succès"
      );

      return res.json(response);
    } catch (error) {
      console.error("Erreur lors de la récupération des nœuds du ring:", error);
      const errResponse = errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
      return res.status(errResponse.statusCode).json(errResponse.response);
    }
  },

  /**
   * Récupère les informations d'un nœud spécifique du ring
   */
  async getRingNodeById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Récupérer le service
      const service = await serviceDiscoveryService.getServiceById(id);

      // Vérifier si le service existe et est de type RING_NODE
      if (!service || service.type !== ServiceType.RING_NODE) {
        const errResponse = errorResponse("Nœud du ring non trouvé", 404);
        return res.status(errResponse.statusCode).json(errResponse.response);
      }

      // Formater le nœud pour la réponse API
      const ringNode = {
        id: service.id,
        name: service.name,
        hostname: service.hostname,
        ipAddress: service.ipAddress,
        port: service.port,
        protocol: service.protocol,
        path: service.path,
        metadata: service.metadata,
        lastUpdated: service.lastUpdated,
        status: service.status,
      };

      const response = successResponse(
        ringNode,
        "Nœud du ring récupéré avec succès"
      );

      return res.json(response);
    } catch (error) {
      console.error("Erreur lors de la récupération du nœud du ring:", error);
      const errResponse = errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
      return res.status(errResponse.statusCode).json(errResponse.response);
    }
  },
};
