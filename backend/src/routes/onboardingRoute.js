import express from "express";
import { authCheck } from "../middlewares/authCheck.js";
import { path1ProfileController, path2ChatController, path2RecommendController, path2SelectController } from "../controllers/onboarding.controller.js";
import { planRateLimit } from "../middlewares/planRateLimit.js";

const router = express.Router();

router.post("/path1/profile", authCheck, planRateLimit("onboardingSave"), path1ProfileController);
router.post("/path2/chat", authCheck, planRateLimit("onboardingChat"), path2ChatController);
router.post("/path2/recommend", authCheck, planRateLimit("onboardingRecommend"), path2RecommendController);
router.post("/path2/select", authCheck, planRateLimit("onboardingSave"), path2SelectController);

export default router;
