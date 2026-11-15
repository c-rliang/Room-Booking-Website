import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { createChatRouter } from "../chatbot/service.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(createChatRouter());

export default router;
