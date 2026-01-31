/**
 * Coco Wrapper modules
 * Handles integration with npubx.cash using Coco library.
 */
const { initializeCoco } = require("coco-cashu-core");
const { NPCPlugin } = require("coco-cashu-plugin-npc");
const { SqliteRepositories } = require("coco-cashu-sqlite3");
const { finalizeEvent, getPublicKey, nip19 } = require("nostr-tools");
const { Database } = require("sqlite3");
const { mnemonicToSeed } = require("@scure/bip39");
const fs = require('fs');

class CocoReceiver {
    constructor(config, onPaymentReceived) {
        this.config = config;
        this.onPaymentReceived = onPaymentReceived;
        this.coco = null;
    }

    async start() {
        console.log("[Coco] Initializing npubx.cash receiver...");

        // Ensure private key is available
        if (!this.config.npub_privkey || this.config.npub_privkey.startsWith("nsec1...")) {
            console.warn("[Coco] Skipped: Invalid Private Key");
            return;
        }

        // Get key for signing
        let privKeyHex = this.config.npub_privkey;
        if (privKeyHex.startsWith('nsec')) {
            const { data } = nip19.decode(privKeyHex);
            privKeyHex = data;
        }

        // We use the privKey as entropy for "seed" to keep it deterministic but stateless regarding mnemonic
        // Note: Coco expects a seed. Usually from BIP39.
        // We will derive a seed from our privKey for compatibility.
        // This effectively binds the Cashu wallet to the Nostr Key.
        // WARNING: This is a hack. Ideally we use a real mnemonic.
        // But for "Agent" use, we rely on the ENV VAR Key.
        const seed = new Uint8Array(Buffer.from(privKeyHex, 'hex')); // Use privKey bytes as seed? 
        // Seed must be compatible with what Coco expects.
        // documentation says: seedGetter: async () => seed

        // Plugin Setup
        const npcPlugin = new NPCPlugin(
            "https://npubx.cash",
            async (event) => finalizeEvent(event, privKeyHex),
            { useWebsocket: true }
        );

        // Database
        // We'll put the DB in the same dir as the app
        const dbPath = 'coco.db';
        const db = new Database(dbPath);
        const repo = new SqliteRepositories({ database: db });

        const seedGetter = async () => seed;

        try {
            this.coco = await initializeCoco({
                repo,
                seedGetter,
                plugins: [npcPlugin]
            });

            // Listen for payments
            this.coco.on("mint-quote:redeemed", async (payment) => {
                const amount = payment.quote.amount;
                console.log(`[Coco] Received Payment: ${amount} sats`);

                // Get the proofs!
                // We need to transfer these proofs to the Main Application (Bankify)
                // Coco manages them in SQLite.
                // We want to "Spend" them in Bankify.

                // Strategy: 
                // 1. Log reception.
                // 2. Invoke callback to sync funds or move them.
                // For now, let's just inspect what `payment` provides.
                // If payment contains proofs, we can pass them.

                if (this.onPaymentReceived) {
                    await this.onPaymentReceived(amount);
                }
            });

            // Log Address
            const pubKey = getPublicKey(privKeyHex);
            const npub = nip19.npubEncode(pubKey);
            console.log(`[Coco] Listening on: ${npub}@npubx.cash`);

        } catch (e) {
            console.error("[Coco] Initialization Failed:", e);
        }
    }
}

module.exports = { CocoReceiver };
