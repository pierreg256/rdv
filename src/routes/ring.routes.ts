import { Router } from "express";
import { ringController } from "../controllers/ring.controller";

const router = Router();

/**
 * Routes pour l'API Ring
 */

// GET /api/ring - Récupérer tous les nœuds du ring
router.get("/", ringController.getRingNodes);

// GET /api/ring/:id - Récupérer un nœud du ring par son ID
router.get("/:id", ringController.getRingNodeById);

export default router;
