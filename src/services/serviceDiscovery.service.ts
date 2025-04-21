import { v4 as uuidv4 } from "uuid";
import config from "../config";
import inMemoryStore from "./inMemoryStore.service";
import {
  Service,
  CreateServiceDto,
  UpdateServiceDto,
  ServiceStatus,
  ServiceQueryFilters,
  ServiceQueryResult,
} from "../models/service.model";
import serviceEventService from "./serviceEvent.service";
import { ServiceEventType } from "../models/serviceEvent.model";
import { ApiError } from "../middlewares/errorHandler";

// Préfixe pour les clés
const SERVICE_KEY_PREFIX = "service:";
const SERVICE_INDEX_KEY = "service:index";

class ServiceDiscoveryService {
  constructor() {
    // Lancer le nettoyage périodique des services expirés
    this.startCleanupJob();
  }

  /**
   * Recherche un service existant avec les mêmes propriétés clés
   */
  async findDuplicateService(
    serviceData: CreateServiceDto
  ): Promise<Service | null> {
    const filters: ServiceQueryFilters = {
      name: serviceData.name,
      type: serviceData.type,
      hostname: serviceData.hostname,
      port: serviceData.port,
      protocol: serviceData.protocol,
    };

    const result = await this.findServices(filters);

    // Si des services correspondants ont été trouvés, vérifier s'ils correspondent exactement
    if (result.total > 0) {
      for (const service of result.services) {
        // Vérifier si tous les critères correspondent exactement
        if (
          service.name === serviceData.name &&
          service.type === serviceData.type &&
          service.hostname === serviceData.hostname &&
          service.port === serviceData.port &&
          service.protocol === serviceData.protocol &&
          (serviceData.path === undefined ||
            service.path === serviceData.path) &&
          (serviceData.subtype === undefined ||
            service.subtype === serviceData.subtype)
        ) {
          return service;
        }
      }
    }

    return null;
  }

  /**
   * Enregistre un nouveau service
   */
  async registerService(
    serviceData: CreateServiceDto,
    ipAddress?: string
  ): Promise<Service> {
    // Vérifier si un service identique existe déjà
    const existingService = await this.findDuplicateService(serviceData);

    if (existingService) {
      throw new ApiError(
        `Un service identique existe déjà avec l'ID: ${existingService.id}`,
        409, // Code HTTP 409 Conflict
        { existingServiceId: existingService.id }
      );
    }

    const now = Date.now();

    const service: Service = {
      id: uuidv4(),
      name: serviceData.name,
      type: serviceData.type,
      hostname: serviceData.hostname,
      ipAddress: serviceData.ipAddress,
      port: serviceData.port,
      path: serviceData.path,
      protocol: serviceData.protocol,
      subtype: serviceData.subtype,
      metadata: serviceData.metadata || {},
      ttl: serviceData.ttl || config.serviceTtl,
      lastUpdated: now,
      registered: now,
      status: ServiceStatus.ACTIVE,
    };

    // Stocker le service dans le stockage en mémoire
    await inMemoryStore.set(
      SERVICE_KEY_PREFIX + service.id,
      service,
      "EX",
      service.ttl
    );

    // Ajouter l'ID du service à l'index
    await inMemoryStore.sadd(SERVICE_INDEX_KEY, service.id);

    // Enregistrer l'événement d'enregistrement
    await serviceEventService.addEvent(
      service.id,
      service.name,
      ServiceEventType.REGISTERED,
      {
        type: service.type,
        hostname: service.hostname,
        port: service.port,
        protocol: service.protocol,
      },
      ipAddress
    );

    return service;
  }

  /**
   * Met à jour un service existant
   */
  async updateService(
    id: string,
    updateData: UpdateServiceDto,
    ipAddress?: string
  ): Promise<Service | null> {
    const serviceKey = SERVICE_KEY_PREFIX + id;

    // Vérifier si le service existe
    const serviceExists = await inMemoryStore.exists(serviceKey);
    if (!serviceExists) {
      return null;
    }

    // Récupérer le service existant
    const existingService = await this.getServiceById(id);
    if (!existingService) {
      return null;
    }

    // Mettre à jour les champs
    const updatedService: Service = {
      ...existingService,
      ...updateData,
      lastUpdated: Date.now(),
    };

    // Stocker le service mis à jour
    await inMemoryStore.set(
      serviceKey,
      updatedService,
      "EX",
      updatedService.ttl
    );

    // Enregistrer l'événement de mise à jour
    await serviceEventService.addEvent(
      updatedService.id,
      updatedService.name,
      ServiceEventType.UPDATED,
      updateData,
      ipAddress
    );

    // Si le statut a changé, enregistrer un événement de changement de statut
    if (updateData.status && updateData.status !== existingService.status) {
      await serviceEventService.addEvent(
        updatedService.id,
        updatedService.name,
        ServiceEventType.STATUS_CHANGED,
        {
          oldStatus: existingService.status,
          newStatus: updateData.status,
        },
        ipAddress
      );
    }

    return updatedService;
  }

  /**
   * Prolonge la durée de vie d'un service (heartbeat)
   */
  async refreshService(
    id: string,
    ipAddress?: string
  ): Promise<Service | null> {
    const serviceKey = SERVICE_KEY_PREFIX + id;

    // Vérifier si le service existe
    const serviceExists = await inMemoryStore.exists(serviceKey);
    if (!serviceExists) {
      return null;
    }

    // Récupérer le service existant
    const existingService = await this.getServiceById(id);
    if (!existingService) {
      return null;
    }

    // Mettre à jour le timestamp et le statut
    const updatedService: Service = {
      ...existingService,
      lastUpdated: Date.now(),
      status: ServiceStatus.ACTIVE,
    };

    // Prolonger la TTL
    await inMemoryStore.set(
      serviceKey,
      updatedService,
      "EX",
      updatedService.ttl
    );

    // Enregistrer l'événement de rafraîchissement
    await serviceEventService.addEvent(
      updatedService.id,
      updatedService.name,
      ServiceEventType.REFRESHED,
      {
        timestamp: updatedService.lastUpdated,
      },
      ipAddress
    );

    return updatedService;
  }

  /**
   * Supprime un service
   */
  async unregisterService(id: string, ipAddress?: string): Promise<boolean> {
    const serviceKey = SERVICE_KEY_PREFIX + id;

    // Vérifier si le service existe
    const serviceExists = await inMemoryStore.exists(serviceKey);
    if (!serviceExists) {
      return false;
    }

    // Récupérer le service avant de le supprimer pour enregistrer l'événement
    const service = await this.getServiceById(id);

    // Supprimer le service du stockage
    await inMemoryStore.del(serviceKey);

    // Supprimer l'ID du service de l'index
    await inMemoryStore.srem(SERVICE_INDEX_KEY, id);

    // Enregistrer l'événement de désenregistrement si le service existait
    if (service) {
      await serviceEventService.addEvent(
        id,
        service.name,
        ServiceEventType.UNREGISTERED,
        {
          timestamp: Date.now(),
          type: service.type,
          hostname: service.hostname,
          port: service.port,
        },
        ipAddress
      );
    }

    return true;
  }

  /**
   * Récupère un service par son ID
   */
  async getServiceById(id: string): Promise<Service | null> {
    const serviceKey = SERVICE_KEY_PREFIX + id;

    const serviceData = await inMemoryStore.get(serviceKey);
    if (!serviceData) {
      return null;
    }

    return JSON.parse(serviceData) as Service;
  }

  /**
   * Recherche des services en fonction des filtres
   */
  async findServices(
    filters: ServiceQueryFilters = {}
  ): Promise<ServiceQueryResult> {
    const serviceIds = await inMemoryStore.smembers(SERVICE_INDEX_KEY);

    if (serviceIds.length === 0) {
      return { total: 0, services: [] };
    }

    const services: Service[] = [];

    // Récupérer tous les services
    for (const id of serviceIds) {
      const service = await this.getServiceById(id);
      if (service) {
        services.push(service);
      }
    }

    // Filtrer les services
    const filteredServices = services.filter((service) => {
      // Filtrer par type
      if (filters.type && service.type !== filters.type) {
        return false;
      }

      // Filtrer par nom
      if (filters.name && !service.name.includes(filters.name)) {
        return false;
      }

      // Filtrer par nom d'hôte
      if (filters.hostname && !service.hostname.includes(filters.hostname)) {
        return false;
      }

      // Filtrer par port
      if (filters.port && service.port !== filters.port) {
        return false;
      }

      // Filtrer par protocole
      if (filters.protocol && service.protocol !== filters.protocol) {
        return false;
      }

      // Filtrer par sous-type
      if (filters.subtype && service.subtype !== filters.subtype) {
        return false;
      }

      // Filtrer par statut
      if (filters.status && service.status !== filters.status) {
        return false;
      }

      // Filtrer par métadonnées
      if (filters.metadataKey) {
        const value = service.metadata[filters.metadataKey];

        if (value === undefined) {
          return false;
        }

        if (
          filters.metadataValue !== undefined &&
          value !== filters.metadataValue
        ) {
          return false;
        }
      }

      return true;
    });

    return {
      total: filteredServices.length,
      services: filteredServices,
    };
  }

  /**
   * Vérifie la santé d'un service et met à jour son statut
   */
  private async checkServiceHealth(service: Service): Promise<void> {
    const now = Date.now();
    const lastUpdatedDiff = now - service.lastUpdated;

    // Si le service n'a pas été mis à jour depuis plus de ttl/2 secondes, le marquer comme inactif
    if (lastUpdatedDiff > service.ttl * 500) {
      const updatedService: Service = {
        ...service,
        status: ServiceStatus.UNREACHABLE,
      };

      await inMemoryStore.set(
        SERVICE_KEY_PREFIX + service.id,
        updatedService,
        "EX",
        service.ttl
      );

      // Enregistrer l'événement de changement de statut
      if (service.status !== ServiceStatus.UNREACHABLE) {
        await serviceEventService.addEvent(
          service.id,
          service.name,
          ServiceEventType.STATUS_CHANGED,
          {
            oldStatus: service.status,
            newStatus: ServiceStatus.UNREACHABLE,
            reason: "Health check failed - no recent heartbeat",
          }
        );
      }
    }
  }

  /**
   * Démarre le job de nettoyage des services expirés
   */
  private startCleanupJob(): void {
    setInterval(async () => {
      try {
        const serviceIds = await inMemoryStore.smembers(SERVICE_INDEX_KEY);

        for (const id of serviceIds) {
          const service = await this.getServiceById(id);

          if (service) {
            await this.checkServiceHealth(service);
          } else {
            // Si le service n'existe plus, le supprimer de l'index
            await inMemoryStore.srem(SERVICE_INDEX_KEY, id);
          }
        }
      } catch (error) {
        console.error("Error in cleanup job:", error);
      }
    }, config.healthCheckInterval * 1000);
  }

  /**
   * Ferme les connexions
   */
  async close(): Promise<void> {
    // Pas besoin de fermer des connexions avec le stockage en mémoire
    // Cette méthode est conservée pour maintenir la compatibilité de l'API
  }
}

export default new ServiceDiscoveryService();
