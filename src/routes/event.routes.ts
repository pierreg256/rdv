import { Router } from "express";
import eventController from "../controllers/event.controller";
import { validateId } from "../middlewares/validation";

const router = Router();

// Routes pour les événements
router.get("/", eventController.getAllEvents);
router.get("/service/:serviceId", validateId, eventController.getServiceEvents);
router.get("/type/:type", eventController.getEventsByType);
router.get("/:id", validateId, eventController.getEventById);
router.delete("/prune", eventController.pruneEvents);

export default router;
