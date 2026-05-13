import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import outletsRouter from "./outlets";
import staffRouter from "./staff";
import menuRouter from "./menu";
import modifiersRouter from "./modifiers";
import tablesRouter from "./tables";
import ordersRouter from "./orders";
import kitchenRouter from "./kitchen";
import reportsRouter from "./reports";
import customersRouter from "./customers";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(outletsRouter);
router.use(staffRouter);
router.use(menuRouter);
router.use(modifiersRouter);
router.use(tablesRouter);
router.use(ordersRouter);
router.use(kitchenRouter);
router.use(reportsRouter);
router.use(customersRouter);
router.use(storageRouter);

export default router;
