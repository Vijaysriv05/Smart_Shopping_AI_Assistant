import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import cartRouter from "./cart";
import wishlistRouter from "./wishlist";
import recommendationsRouter from "./recommendations";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import autonomousRouter from "./autonomous";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(cartRouter);
router.use(wishlistRouter);
router.use(recommendationsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(autonomousRouter);

export default router;
