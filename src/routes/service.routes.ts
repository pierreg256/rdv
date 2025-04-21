import { Router } from "express";
import { body } from "express-validator";
import serviceController from "../controllers/service.controller";
import { ServiceType } from "../models/service.model";

const router = Router();

// Validation pour l'enregistrement d'un service
const registerServiceValidation = [
  body("name").notEmpty().withMessage("Le nom du service est requis"),
  body("type")
    .isIn(Object.values(ServiceType))
    .withMessage("Type de service invalide"),
  body("hostname").notEmpty().withMessage("Le nom d'hôte est requis"),
  body("port").isInt({ min: 1, max: 65535 }).withMessage("Port invalide"),
  body("protocol").notEmpty().withMessage("Le protocole est requis"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Les métadonnées doivent être un objet"),
  body("ttl")
    .optional()
    .isInt({ min: 10 })
    .withMessage("TTL invalide (minimum 10 secondes)"),
];

// Validation pour la mise à jour d'un service
const updateServiceValidation = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Le nom du service ne peut pas être vide"),
  body("hostname")
    .optional()
    .notEmpty()
    .withMessage("Le nom d'hôte ne peut pas être vide"),
  body("port")
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage("Port invalide"),
  body("protocol")
    .optional()
    .notEmpty()
    .withMessage("Le protocole ne peut pas être vide"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Les métadonnées doivent être un objet"),
  body("ttl")
    .optional()
    .isInt({ min: 10 })
    .withMessage("TTL invalide (minimum 10 secondes)"),
];

// Routes pour la découverte de services
router.post(
  "/register",
  registerServiceValidation,
  serviceController.registerService
);
router.put("/:id", updateServiceValidation, serviceController.updateService);
router.post("/:id/refresh", serviceController.refreshService);
router.delete("/:id", serviceController.unregisterService);
router.get("/:id", serviceController.getServiceById);
router.get("/", serviceController.findServices);

// Nouvelles routes
router.get("/stats/overview", serviceController.getServiceStats);
router.get("/types/:type", serviceController.getServicesByType);
router.get("/:id/health", serviceController.checkServiceHealth);

export default router;
