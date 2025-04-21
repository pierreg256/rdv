import { v4 as uuidv4 } from "uuid";
import config from "../config";
import inMemoryStore from "./inMemoryStore.service";
import {
  ServiceEvent,
  ServiceEventType,
  EventQueryResult,
} from "../models/serviceEvent.model";

// Préfixe pour les clés
const EVENT_KEY_PREFIX = "event:";
const EVENT_INDEX_KEY = "event:index";
const SERVICE_EVENTS_KEY_PREFIX = "service:events:";

class ServiceEventService {
  constructor() {
    // Rien à initialiser avec le stockage en mémoire
  }

  /**
   * Ajoute un nouvel événement pour un service
   */
  async addEvent(
    serviceId: string,
    serviceName: string,
    eventType: ServiceEventType,
    metadata?: Record<string, any>,
    ipAddress?: string
  ): Promise<ServiceEvent> {
    const now = Date.now();

    const event: ServiceEvent = {
      id: uuidv4(),
      timestamp: now,
      serviceId,
      serviceName,
      eventType,
      metadata,
      ipAddress,
    };

    // Stocker l'événement dans le stockage en mémoire
    await inMemoryStore.set(EVENT_KEY_PREFIX + event.id, event);

    // Ajouter l'ID de l'événement à l'index global
    await inMemoryStore.sadd(EVENT_INDEX_KEY, event.id);

    // Ajouter l'ID de l'événement à l'index spécifique au service
    await inMemoryStore.sadd(SERVICE_EVENTS_KEY_PREFIX + serviceId, event.id);

    return event;
  }

  /**
   * Récupère un événement par son ID
   */
  async getEventById(id: string): Promise<ServiceEvent | null> {
    const eventData = await inMemoryStore.get(EVENT_KEY_PREFIX + id);

    if (!eventData) {
      return null;
    }

    return JSON.parse(eventData) as ServiceEvent;
  }

  /**
   * Récupère tous les événements
   */
  async getAllEvents(
    limit: number = 100,
    offset: number = 0
  ): Promise<EventQueryResult> {
    const eventIds = await inMemoryStore.smembers(EVENT_INDEX_KEY);
    const total = eventIds.length;

    // Récupérer les événements
    const events: ServiceEvent[] = [];
    const sortedEventIds = eventIds.slice(offset, offset + limit);

    for (const id of sortedEventIds) {
      const event = await this.getEventById(id);
      if (event) {
        events.push(event);
      }
    }

    // Trier par timestamp décroissant
    events.sort((a, b) => b.timestamp - a.timestamp);

    return {
      total,
      events,
    };
  }

  /**
   * Récupère tous les événements pour un service spécifique
   */
  async getEventsByServiceId(
    serviceId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<EventQueryResult> {
    const eventIds = await inMemoryStore.smembers(
      SERVICE_EVENTS_KEY_PREFIX + serviceId
    );
    const total = eventIds.length;

    const events: ServiceEvent[] = [];
    const sortedEventIds = eventIds.slice(offset, offset + limit);

    for (const id of sortedEventIds) {
      const event = await this.getEventById(id);
      if (event) {
        events.push(event);
      }
    }

    // Trier par timestamp décroissant
    events.sort((a, b) => b.timestamp - a.timestamp);

    return {
      total,
      events,
    };
  }

  /**
   * Récupère les événements par type
   */
  async getEventsByType(
    eventType: ServiceEventType,
    limit: number = 100,
    offset: number = 0
  ): Promise<EventQueryResult> {
    const allEvents = await this.getAllEvents(1000, 0); // Récupérer un nombre raisonnable d'événements

    const filteredEvents = allEvents.events.filter(
      (event) => event.eventType === eventType
    );
    const total = filteredEvents.length;

    return {
      total,
      events: filteredEvents.slice(offset, offset + limit),
    };
  }

  /**
   * Supprime les événements plus anciens qu'une certaine date
   */
  async pruneEvents(olderThanTimestamp: number): Promise<number> {
    const allEvents = await this.getAllEvents(10000, 0); // Récupérer un grand nombre d'événements
    let deletedCount = 0;

    for (const event of allEvents.events) {
      if (event.timestamp < olderThanTimestamp) {
        // Supprimer l'événement
        await inMemoryStore.del(EVENT_KEY_PREFIX + event.id);

        // Supprimer l'ID de l'événement des index
        await inMemoryStore.srem(EVENT_INDEX_KEY, event.id);
        await inMemoryStore.srem(
          SERVICE_EVENTS_KEY_PREFIX + event.serviceId,
          event.id
        );

        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Ferme les connexions
   */
  async close(): Promise<void> {
    // Pas besoin de fermer des connexions avec le stockage en mémoire
    // Cette méthode est conservée pour maintenir la compatibilité de l'API
  }
}

export default new ServiceEventService();
