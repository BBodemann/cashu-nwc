#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { CashuNWCBridge } = require('../lib/bridge');

// CLI Constants
const CONFIG_FILE = path.resolve(process.cwd(), 'config.json');
const DEFAULT_MINT = "https://mint.minibits.cash/Bitcoin";
const NPUB_CASH_URL = "https://npubx.cash";

async function main() {
    console.log("Starting Cashu-NWC Bridge CLI...");

    // Config Loading
    let config = {};
    if (fs.existsSync(CONFIG_FILE)) {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    } else {
        // Only create default config if ENV vars are not present to avoid unnecessary file creation in ephemeral envs
        if (!process.env.NPUB_PRIVKEY) {
            console.log(`Creating default config.json in ${process.cwd()}`);
            config = {
                npub_privkey: "nsec1...",
                mint_url: DEFAULT_MINT,
                npub_cash_url: NPUB_CASH_URL,
                nwc_relay: "wss://relay.damus.io",
                sweep_interval_ms: 60000,
                min_balance_to_sweep: 100
            };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log("Please edit config.json with your details and restart.");
            if (!process.env.NPUB_PRIVKEY) process.exit(0);
        } else {
            // Environment variables are present, proceed with partial/empty file config
            config = {};
        }
    }

    // Override config with Environment Variables
    if (process.env.NPUB_PRIVKEY) config.npub_privkey = process.env.NPUB_PRIVKEY;
    if (process.env.MINT_URL) config.mint_url = process.env.MINT_URL;
    if (process.env.NPUB_CASH_URL) config.npub_cash_url = process.env.NPUB_CASH_URL;
    if (process.env.NWC_RELAY) config.nwc_relay = process.env.NWC_RELAY;
    if (process.env.SWEEP_INTERVAL_MS) config.sweep_interval_ms = parseInt(process.env.SWEEP_INTERVAL_MS);

    // Argument Parsing
    const args = process.argv.slice(2);
    const command = args[0] || 'start';

    if (command === 'status') {
        const dbPath = path.resolve(process.cwd(), 'db.json');
        if (!fs.existsSync(dbPath)) {
            console.log(JSON.stringify({ connected: false, error: "Database not found" }));
            process.exit(0);
        }
        try {
            const db = JSON.parse(fs.readFileSync(dbPath));
            const utxos = db.utxos || [];
            const nwcInfo = db.nwc_info || {};
            const pubkeys = Object.keys(nwcInfo);
            const nwcString = pubkeys.length > 0 ? nwcInfo[pubkeys[0]].nwc_string : null;

            console.log(JSON.stringify({
                connected: true,
                nwc_connection_string: nwcString,
                mint_url: config.mint_url || DEFAULT_MINT,
                balance_utxos: utxos.length,
                apps_connected: pubkeys.length
            }, null, 2));
        } catch (e) {
            console.log(JSON.stringify({ connected: false, error: e.message }));
        }
        process.exit(0);
    }

    // Initialize Bridge for Start Command
    const bridge = new CashuNWCBridge(config, path.resolve(process.cwd(), 'db.json'));

    // Handle specific signals
    process.on('SIGINT', () => {
        bridge.stop();
        process.exit(0);
    });

    await bridge.start();
}

main().catch(console.error);
