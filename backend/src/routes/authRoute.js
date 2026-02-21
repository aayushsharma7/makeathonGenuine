import express from "express"
import { loginController, signupController, logoutController, continueController, activitySummaryController } from "../controllers/auth.controller.js";
import { authCheck } from "../middlewares/authCheck.js";

const router = express.Router()

router.post('/signup', signupController)
router.post('/login', loginController)
router.post('/logout', logoutController);
router.get('/check',authCheck, continueController)
router.get('/activity-summary',authCheck, activitySummaryController)

export default router;
