/**
 * Simple Price Service
 * Fetches ETH/USDC price from a public API or mocks it if fails.
 */
export class PriceService {
    constructor() { }

    async getEthPrice(): Promise<number> {
        try {
            // Trying a public API (Coinbase)
            const response = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
            const data = await response.json();
            return parseFloat(data.data.amount);
        } catch (error) {
            console.warn('[PriceService] Failed to fetch price, using mock generation.');
            return this.generateMockPrice();
        }
    }

    // Deterministic-ish random walk for demo purposes if API fails
    private lastMockPrice = 2500;
    private generateMockPrice(): number {
        const change = (Math.random() - 0.5) * 50; // +/- $25
        this.lastMockPrice += change;
        return this.lastMockPrice;
    }
}
