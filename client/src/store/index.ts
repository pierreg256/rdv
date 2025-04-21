import { createStore } from "vuex";
import { Service } from "../../../src/models/service.model";
import { ServiceEvent } from "../../../src/models/serviceEvent.model";

interface State {
  services: Service[];
  events: ServiceEvent[];
  loading: boolean;
  error: string | null;
}

export default createStore({
  state: {
    services: [],
    events: [],
    loading: false,
    error: null,
  } as State,

  mutations: {
    setServices(state, services: Service[]) {
      state.services = services;
    },
    setEvents(state, events: ServiceEvent[]) {
      state.events = events;
    },
    setLoading(state, loading: boolean) {
      state.loading = loading;
    },
    setError(state, error: string | null) {
      state.error = error;
    },
  },

  actions: {
    async fetchServices({ commit }) {
      commit("setLoading", true);
      commit("setError", null);

      try {
        const response = await fetch("/api/services");
        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération des services: ${response.statusText}`
          );
        }

        const data = await response.json();
        commit("setServices", data.data || []);
      } catch (error) {
        commit(
          "setError",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
        console.error("Erreur lors de la récupération des services:", error);
      } finally {
        commit("setLoading", false);
      }
    },

    async fetchEvents({ commit }) {
      console.log("Fetching events...");
      commit("setLoading", true);
      commit("setError", null);

      try {
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération des événements: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Events fetched:", data);
        commit("setEvents", data.data || []);
      } catch (error) {
        commit(
          "setError",
          error instanceof Error ? error.message : "Erreur inconnue"
        );
        console.error("Erreur lors de la récupération des événements:", error);
      } finally {
        commit("setLoading", false);
      }
    },
  },

  getters: {
    getServices: (state) => state.services,
    getEvents: (state) => state.events,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
  },
});
