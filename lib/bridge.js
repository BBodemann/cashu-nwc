/**
 * Cashu-NWC Bridge Library
 * 
 * @module CashuNWCBridge
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Adjust path to bankify since we moved it to lib/
const { bankify, super_nostr } = require('./bankify.js');
const { CocoReceiver } = require('./coco.js');
const { CashuMint, CashuWallet } = require("@cashu/cashu-ts");
const WebSocket = require('ws');
const { nip19, getPublicKey } = require('nostr-tools');
const crypto = require('crypto');

// Polyfills
global.WebSocket = WebSocket;
global.crypto = crypto;

class CashuNWCBridge {
    /**
     * Create a new Bridge instance.
     * @param {Object} config - Configuration object
     * @param {string} [dbPath] - Path to db.json (persistence). Defaults to ./db.json
     */
    constructor(config, dbPath) {
        this.config = config;
        this.dbPath = dbPath || path.resolve(process.cwd(), 'db.json');

        // Defaults
        if (!this.config.mint_url) this.config.mint_url = "https://mint.minibits.cash/Bitcoin";
        // Default to npubx.cash for Coco
        if (!this.config.npub_cash_url) this.config.npub_cash_url = "https://npubx.cash";
        if (!this.config.nwc_relay) this.config.nwc_relay = "wss://relay.damus.io";
        if (!this.config.sweep_interval_ms) this.config.sweep_interval_ms = 60000;

        this.sweeperInterval = null;
        this.persistenceInterval = null;
    }

    /**
     * Load state from disk
     */
    loadState() {
        if (fs.existsSync(this.dbPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.dbPath));
                if (data.utxos) bankify.state.utxos = data.utxos;
                if (data.nwc_info) bankify.state.nostr_state.nwc_info = data.nwc_info;
                console.log(`[Persistence] Loaded ${bankify.state.utxos.length} UTXOs from ${this.dbPath}`);
            } catch (e) {
                console.error("Error loading state:", e);
            }
        }
    }

    /**
     * Save state to disk
     */
    saveState() {
        const data = {
            utxos: bankify.state.utxos,
            nwc_info: bankify.state.nostr_state.nwc_info
        };
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    }

    // Helper to get hex key
    getHexKey(nsec) {
        if (nsec.startsWith('nsec')) {
            const { data } = nip19.decode(nsec);
            return data;
        }
        return nsec;
    }

    /**
     * Run the sweeper logic once
     * DEPRECATED: Replaced by CocoReceiver
     */
    async runSweeper() {
        // Deprecated
    }

    /**
     * Start the Bridge
     */
    async start() {
        this.loadState();

        // Initialize Bankify
        const apps = bankify.state.nostr_state.nwc_info;
        const appPubkeys = Object.keys(apps);

        if (appPubkeys.length === 0) {
            console.log("[Bankify] No NWC connection found. Creating one...");
            const nwcStr = await bankify.createNWCconnection(
                this.config.mint_url,
                undefined,
                this.config.nwc_relay
            );
            console.log("\n---------------------------------------------------------");
            console.log("NWC CONNECTION STRING (Put this in your Nostr App):");
            console.log(nwcStr);
            console.log("---------------------------------------------------------\n");
            this.saveState();
        } else {
            console.log(`[Bankify] Restoring ${appPubkeys.length} NWC connections...`);
            for (const pk of appPubkeys) {
                const info = apps[pk];
                await bankify.createNWCconnection(info.mymint, info.permissions, info.relay, pk);
            }
        }

        // Initialize Coco (Receiver)
        this.cocoReceiver = new CocoReceiver(this.config, async (amount) => {
            console.log(`[Bridge] Syncing ${amount} sats from Coco...`);
        });
        await this.cocoReceiver.start();

        // Start Intervals
        this.persistenceInterval = setInterval(() => this.saveState(), 5000);
        // this.sweeperInterval = setInterval(() => this.runSweeper(), this.config.sweep_interval_ms);

        // await this.runSweeper();
        console.log("[System] Bridge is running.");
    }

    /**
     * Stop the Bridge
     */
    stop() {
        if (this.persistenceInterval) clearInterval(this.persistenceInterval);
        if (this.sweeperInterval) clearInterval(this.sweeperInterval);
        this.saveState();
        console.log("[System] Bridge stopped.");
    }
}

module.exports = { CashuNWCBridge, bankify };
