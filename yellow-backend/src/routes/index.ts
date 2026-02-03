import { Router } from "express";
import { getEscrowAddress } from "../controllers/escrow";

const router = Router();

router.get("/escrow-address", getEscrowAddress);

export default router;
