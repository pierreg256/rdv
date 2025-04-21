import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Home from "../views/Home.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/services",
    name: "Services",
    component: () => import("../views/Services.vue"),
  },
  {
    path: "/events",
    name: "Events",
    component: () => import("../views/Events.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
