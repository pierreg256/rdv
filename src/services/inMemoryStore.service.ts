/**
 * Service de stockage en mémoire pour remplacer Redis
 */

export class InMemoryStore {
  private data: Map<string, { value: any; expiry?: number }> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  /**
   * Définit une valeur dans le stockage
   */
  async set(
    key: string,
    value: any,
    expiryMode?: string,
    expirySeconds?: number
  ): Promise<"OK"> {
    let expiry: number | undefined;

    if (expiryMode === "EX" && expirySeconds) {
      expiry = Date.now() + expirySeconds * 1000;
    }

    this.data.set(key, { value, expiry });
    return "OK";
  }

  /**
   * Récupère une valeur du stockage
   */
  async get(key: string): Promise<string | null> {
    const item = this.data.get(key);

    if (!item) {
      return null;
    }

    // Vérifier si l'élément a expiré
    if (item.expiry && item.expiry < Date.now()) {
      this.data.delete(key);
      return null;
    }

    return JSON.stringify(item.value);
  }

  /**
   * Vérifie si une clé existe
   */
  async exists(key: string): Promise<number> {
    const item = this.data.get(key);

    if (!item) {
      return 0;
    }

    // Vérifier si l'élément a expiré
    if (item.expiry && item.expiry < Date.now()) {
      this.data.delete(key);
      return 0;
    }

    return 1;
  }

  /**
   * Supprime une clé
   */
  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Ajoute une valeur à un ensemble
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }

    const set = this.sets.get(key)!;
    let addedCount = 0;

    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        addedCount++;
      }
    }

    return addedCount;
  }

  /**
   * Supprime une valeur d'un ensemble
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      return 0;
    }

    const set = this.sets.get(key)!;
    let removedCount = 0;

    for (const member of members) {
      if (set.has(member)) {
        set.delete(member);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Récupère tous les membres d'un ensemble
   */
  async smembers(key: string): Promise<string[]> {
    if (!this.sets.has(key)) {
      return [];
    }

    return Array.from(this.sets.get(key)!);
  }

  /**
   * Simule la fermeture de la connexion Redis
   */
  async quit(): Promise<string> {
    return "OK";
  }

  /**
   * Nettoie les données expirées
   */
  cleanup(): void {
    const now = Date.now();

    // Nettoyer les éléments expirés
    for (const [key, item] of this.data.entries()) {
      if (item.expiry && item.expiry < now) {
        this.data.delete(key);
      }
    }
  }

  /**
   * Démarre un job de nettoyage
   */
  startCleanupJob(intervalMs: number = 60000): void {
    setInterval(() => this.cleanup(), intervalMs);
  }
}

// Singleton pour le stockage partagé
export const inMemoryStore = new InMemoryStore();
inMemoryStore.startCleanupJob();

export default inMemoryStore;
