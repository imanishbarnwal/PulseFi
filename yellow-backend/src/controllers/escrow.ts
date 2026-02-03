import { Request, Response } from "express";
import { Wallet } from "ethers";

export const getEscrowAddress = (req: Request, res: Response) => {
    try {
        const pk = process.env.ESCROW_PRIVATE_KEY;

        if (!pk) {
            console.error('[EscrowController] ESCROW_PRIVATE_KEY missing');
            return res.status(500).json({ error: "ESCROW_PRIVATE_KEY missing" });
        }

        const contractAddress = process.env.SESSION_ESCROW_ADDRESS || '0x66B72352B6C3F71320F24683f3ee91e84C23667c';
        return res.json({ address: contractAddress });
    } catch (err: any) {
        console.error('[EscrowController] Error deriving address:', err.message);
        return res.status(500).json({ error: err.message });
    }
};
