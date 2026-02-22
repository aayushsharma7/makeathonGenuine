import express from "express"
import { loginController, signupController, logoutController, continueController, activitySummaryController, getPlanController, updatePlanController, checkoutTestController, checkoutSandboxController } from "../controllers/auth.controller.js";
import { authCheck } from "../middlewares/authCheck.js";

const router = express.Router()

router.post('/signup', signupController)
router.post('/login', loginController)
router.post('/logout', logoutController);
router.get('/check',authCheck, continueController)
router.get('/activity-summary',authCheck, activitySummaryController)
router.get('/plan',authCheck, getPlanController)
router.post('/plan/update',authCheck, updatePlanController)
router.post('/plan/checkout-test',authCheck, checkoutTestController)
router.post('/plan/checkout-sandbox',authCheck, checkoutSandboxController)

export default router;
