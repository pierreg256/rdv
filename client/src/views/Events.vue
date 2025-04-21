<template>
  <div class="events-view">
    <h1>Historique des événements</h1>

    <div class="mb-4">
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          placeholder="Rechercher un événement..."
          v-model="searchQuery"
        />
        <select
          class="form-select"
          style="max-width: 200px"
          v-model="typeFilter"
        >
          <option value="">Tous les types</option>
          <option value="REGISTERED">Enregistrement</option>
          <option value="UPDATED">Mise à jour</option>
          <option value="REFRESHED">Rafraîchissement</option>
          <option value="UNREGISTERED">Désenregistrement</option>
          <option value="STATUS_CHANGED">Changement de statut</option>
        </select>
        <button class="btn btn-primary" @click="refreshEvents">
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

    <div v-else-if="filteredEvents.length === 0" class="alert alert-info">
      Aucun événement trouvé.
    </div>

    <div v-else>
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Service</th>
              <th>Service ID</th>
              <th>IP Source</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in filteredEvents" :key="event.id">
              <td>{{ formatDate(event.timestamp) }}</td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'text-bg-success': event.type === 'REGISTERED',
                    'text-bg-info':
                      event.type === 'UPDATED' || event.type === 'REFRESHED',
                    'text-bg-warning': event.type === 'STATUS_CHANGED',
                    'text-bg-danger': event.type === 'UNREGISTERED',
                  }"
                >
                  {{ event.type }}
                </span>
              </td>
              <td>{{ event.serviceName }}</td>
              <td>{{ event.serviceId }}</td>
              <td>{{ event.sourceIp || "N/A" }}</td>
              <td>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="selectedEvent = event"
                  data-bs-toggle="modal"
                  data-bs-target="#eventDetailsModal"
                >
                  Voir détails
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal pour afficher les détails d'un événement -->
      <div
        class="modal fade"
        id="eventDetailsModal"
        tabindex="-1"
        aria-labelledby="eventDetailsModalLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="eventDetailsModalLabel">
                Détails de l'événement
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body" v-if="selectedEvent">
              <div class="mb-3">
                <strong>ID:</strong> {{ selectedEvent.id }}
              </div>
              <div class="mb-3">
                <strong>Date:</strong> {{ formatDate(selectedEvent.timestamp) }}
              </div>
              <div class="mb-3">
                <strong>Type:</strong> {{ selectedEvent.type }}
              </div>
              <div class="mb-3">
                <strong>Service:</strong> {{ selectedEvent.serviceName }}
              </div>
              <div class="mb-3">
                <strong>Service ID:</strong> {{ selectedEvent.serviceId }}
              </div>
              <div class="mb-3">
                <strong>IP Source:</strong>
                {{ selectedEvent.sourceIp || "N/A" }}
              </div>
              <div class="mb-3">
                <strong>Données:</strong>
                <pre class="mt-2 bg-light p-2 rounded">{{
                  JSON.stringify(selectedEvent.data, null, 2)
                }}</pre>
              </div>
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { ServiceEvent } from "../../../src/models/serviceEvent.model";

export default defineComponent({
  name: "EventsView",

  setup() {
    const store = useStore();
    const searchQuery = ref("");
    const typeFilter = ref("");
    const selectedEvent = ref<ServiceEvent | null>(null);

    onMounted(() => {
      refreshEvents();

      // Charger Bootstrap JS pour les modals
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js";
      document.body.appendChild(script);
    });

    const refreshEvents = () => {
      store.dispatch("fetchEvents");
    };

    const events = computed(() => store.getters.getEvents);
    const loading = computed(() => store.getters.isLoading);
    const error = computed(() => store.getters.getError);

    const filteredEvents = computed(() => {
      let result = [...events.value].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
          (event) =>
            event.serviceName.toLowerCase().includes(query) ||
            event.serviceId.toLowerCase().includes(query) ||
            (event.sourceIp && event.sourceIp.includes(query))
        );
      }

      if (typeFilter.value) {
        result = result.filter((event) => event.type === typeFilter.value);
      }

      return result;
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
      typeFilter,
      selectedEvent,
      events,
      filteredEvents,
      loading,
      error,
      refreshEvents,
      formatDate,
    };
  },
});
</script>
