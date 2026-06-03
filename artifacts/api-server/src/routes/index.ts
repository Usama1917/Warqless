import { Router, type IRouter } from "express";
import authPhoneRouter from "./authPhone";
import adminSettingsRouter from "./adminSettings";
import adminSecurityRouter from "./adminSecurity";
import catalogRouter from "./catalog";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authPhoneRouter);
router.use(adminSettingsRouter);
router.use(adminSecurityRouter);
router.use(catalogRouter);

export default router;
