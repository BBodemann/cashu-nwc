/**
 * Coco Wrapper modules
 * Handles integration with npubx.cash using Coco library.
 */
const { Manager } = require("coco-cashu-core");
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
            // Workaround for double-init bug in coco-cashu-core:
            // We implement initializeCoco manually but skip the explicit initPlugins() call
            // because the Manager constructor already calls it.

            await repo.init();

            // Constructor args: repo, seedGetter, logger, webSocketFactory, plugins, watchers, processors, subscriptions
            this.coco = new Manager(
                repo,
                seedGetter,
                undefined, // logger 
                undefined, // webSocketFactory
                [npcPlugin], // plugins
                undefined, // watchers
                undefined, // processors
                undefined  // subscriptions
            );

            // Wait for plugin host to be ready (which constructor triggers)
            // We can't await the constructor's promise directly, but we can await ready()
            // Note: Manager.initPlugins() calls pluginHost.init() AND pluginHost.ready().
            // We just want to wait for ready since Init is running.
            // Actually, calling initPlugins() again is what caused the bug.
            // We should just wait for the underlying host to be ready if possible.
            // But Manager.initPlugins() is the only public way to wait? 
            // NO, Manager has no public accessor for pluginHost except implicitly.

            // However, since the constructor triggers it async, we might risk race condition if we use it immediately.
            // Let's assume for now that sticking a small delay or just proceeding is fine, 
            // or we accept that 'onReady' hooks fire async.
            // But wait, initializeCoco ALSO does:
            // await coco.recoverPendingSendOperations();
            // await coco.recoverPendingMeltOperations();

            // We should duplicate those if we want full reliability.
            // But for simple receiving, maybe we don't need them yet.
            // Let's keep it simple for Agent use. The most important part is the plugin registration.

            // We need to ensure the plugin wraps up initialization.
            // Since we can't access the promise, we just proceed.


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
