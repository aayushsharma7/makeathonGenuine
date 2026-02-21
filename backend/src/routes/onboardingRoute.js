import express from "express";
import { authCheck } from "../middlewares/authCheck.js";
import { path1ProfileController, path2ChatController, path2RecommendController, path2SelectController } from "../controllers/onboarding.controller.js";

const router = express.Router();

router.post("/path1/profile", authCheck, path1ProfileController);
router.post("/path2/chat", authCheck, path2ChatController);
router.post("/path2/recommend", authCheck, path2RecommendController);
router.post("/path2/select", authCheck, path2SelectController);

export default router;
