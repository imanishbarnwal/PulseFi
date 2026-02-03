import { Request, Response } from "express";
import { Wallet } from "ethers";

export const getEscrowAddress = (req: Request, res: Response) => {
    try {
        const pk = process.env.ESCROW_PRIVATE_KEY;

        if (!pk) {
            console.error('[EscrowController] ESCROW_PRIVATE_KEY missing');
            return res.status(500).json({ error: "ESCROW_PRIVATE_KEY missing" });
        }

        const wallet = new Wallet(pk);
        return res.json({ address: wallet.address });
    } catch (err: any) {
        console.error('[EscrowController] Error deriving address:', err.message);
        return res.status(500).json({ error: err.message });
    }
};
