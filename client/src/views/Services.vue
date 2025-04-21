<template>
  <div class="services-view">
    <h1>Services enregistrés</h1>

    <div class="mb-4">
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          placeholder="Rechercher un service..."
          v-model="searchQuery"
        />
        <select
          class="form-select"
          style="max-width: 200px"
          v-model="statusFilter"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="UNREACHABLE">Injoignables</option>
        </select>
        <button class="btn btn-primary" @click="refreshServices">
          <i class="bi bi-arrow-clockwise me-1"></i> Rafraîchir
        </button>
      </div>
    </div>

    <div v-if="loading" class="d-flex justify-content-center my-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <div v-else-if="filteredServices.length === 0" class="alert alert-info">
      Aucun service trouvé.
    </div>

    <div v-else>
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Hostname</th>
              <th>IP</th>
              <th>Port</th>
              <th>Protocole</th>
              <th>Statut</th>
              <th>Dernière MAJ</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in filteredServices" :key="service.id">
              <td>{{ service.name }}</td>
              <td>{{ service.type }}</td>
              <td>{{ service.hostname }}</td>
              <td>{{ service.ipAddress }}</td>
              <td>{{ service.port }}</td>
              <td>{{ service.protocol }}</td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'text-bg-success': service.status === 'ACTIVE',
                    'text-bg-danger': service.status === 'UNREACHABLE',
                  }"
                >
                  {{ service.status }}
                </span>
              </td>
              <td>{{ formatDate(service.lastUpdated) }}</td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button
                    class="btn btn-outline-primary"
                    @click="refreshService(service.id)"
                    :disabled="refreshingService === service.id"
                  >
                    <span
                      v-if="refreshingService === service.id"
                      class="spinner-border spinner-border-sm"
                      role="status"
                    ></span>
                    <span v-else>Rafraîchir</span>
                  </button>
                  <button
                    class="btn btn-outline-danger"
                    @click="unregisterService(service.id)"
                    :disabled="unregisteringService === service.id"
                  >
                    <span
                      v-if="unregisteringService === service.id"
                      class="spinner-border spinner-border-sm"
                      role="status"
                    ></span>
                    <span v-else>Supprimer</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { Service } from "../../../src/models/service.model";

export default defineComponent({
  name: "ServicesView",

  setup() {
    const store = useStore();
    const searchQuery = ref("");
    const statusFilter = ref("");
    const refreshingService = ref<string | null>(null);
    const unregisteringService = ref<string | null>(null);

    onMounted(() => {
      refreshServices();
    });

    const refreshServices = () => {
      store.dispatch("fetchServices");
    };

    const refreshService = async (id: string) => {
      refreshingService.value = id;
      try {
        const response = await fetch(`/api/services/${id}/refresh`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors du rafraîchissement du service: ${response.statusText}`
          );
        }

        await refreshServices();
      } catch (error) {
        console.error("Erreur lors du rafraîchissement du service:", error);
        store.commit(
          "setError",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
      } finally {
        refreshingService.value = null;
      }
    };

    const unregisterService = async (id: string) => {
      if (!confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) {
        return;
      }

      unregisteringService.value = id;
      try {
        const response = await fetch(`/api/services/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la suppression du service: ${response.statusText}`
          );
        }

        await refreshServices();
      } catch (error) {
        console.error("Erreur lors de la suppression du service:", error);
        store.commit(
          "setError",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
      } finally {
        unregisteringService.value = null;
      }
    };

    const services = computed(() => store.getters.getServices);
    const loading = computed(() => store.getters.isLoading);
    const error = computed(() => store.getters.getError);

    const filteredServices = computed(() => {
      return services.value.filter((service: Service) => {
        const matchesSearch = searchQuery.value
          ? service.name
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase()) ||
            service.hostname
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase()) ||
            (service.ipAddress && service.ipAddress.includes(searchQuery.value))
          : true;

        const matchesStatus = statusFilter.value
          ? service.status === statusFilter.value
          : true;

        return matchesSearch && matchesStatus;
      });
    });

    const formatDate = (timestamp: string | number) => {
      return new Date(timestamp).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };

    return {
      searchQuery,
      statusFilter,
      refreshingService,
      unregisteringService,
      services,
      filteredServices,
      loading,
      error,
      refreshServices,
      refreshService,
      unregisterService,
      formatDate,
    };
  },
});
</script>
