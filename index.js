require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { bankify, super_nostr } = require('./bankify-bridge/bankify.js');
const { NPCClient, JWTAuthProvider, ConsoleLogger } = require("npubcash-sdk");
const { CashuMint, CashuWallet, getEncodedToken } = require("@cashu/cashu-ts");
const WebSocket = require('ws');
const { nip19, getPublicKey } = require('nostr-tools');
const crypto = require('crypto');

// Polyfills
global.WebSocket = WebSocket;
global.crypto = crypto;

// Configuration
const CONFIG_FILE = path.resolve(__dirname, 'config.json');
const DB_FILE = path.resolve(__dirname, 'db.json');
const DEFAULT_MINT = "https://mint.minibits.cash/Bitcoin";
const NPUB_CASH_URL = "https://npub.cash"; // Assumed Mint URL for npub.cash

// Load or Create Config
let config = {};
if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE));
} else {
    console.log("Creating default config.json. Please edit it with your keys.");
    config = {
        npub_privkey: "nsec1...", // User must fill this
        mint_url: DEFAULT_MINT,
        npub_cash_url: NPUB_CASH_URL,
        nwc_relay: "wss://relay.damus.io",
        sweep_interval_ms: 60000,
        min_balance_to_sweep: 100 // sats
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Persistence for Bankify
function loadState() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(DB_FILE));
            if (data.utxos) bankify.state.utxos = data.utxos;
            if (data.nwc_info) bankify.state.nostr_state.nwc_info = data.nwc_info;
            console.log(`[Persistence] Loaded ${bankify.state.utxos.length} UTXOs.`);
        } catch (e) {
            console.error("Error loading state:", e);
        }
    }
}

function saveState() {
    const data = {
        utxos: bankify.state.utxos,
        nwc_info: bankify.state.nostr_state.nwc_info
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helpers
function getHexKey(nsec) {
    if (nsec.startsWith('nsec')) {
        const { data } = nip19.decode(nsec);
        return data;
    }
    return nsec;
}

// Sweeper
async function runSweeper() {
    if (config.npub_privkey === "nsec1...") {
        console.log("[Sweeper] Please set your npub_privkey in config.json");
        return;
    }

    const privKey = getHexKey(config.npub_privkey);
    const pubKey = getPublicKey(privKey);

    // npub.cash Client
    const msgSigner = async (t) => {
        // Simple signer using nostr-tools or similar. 
        // Note: npubcash-sdk expects a signer function.
        // We'll use a mocked signer wrapping super_nostr or nostr-tools.
        // Assuming t follows the interface.
        // Using super_nostr from bankify which has signing tools:
        t.pubkey = pubKey;
        const signed = await super_nostr.getSignedEvent(t, privKey);
        return signed;
    };

    const auth = new JWTAuthProvider(config.npub_cash_url, msgSigner);
    const client = new NPCClient(config.npub_cash_url, auth);

    // Check npub.cash Quotes/Balance
    try {
        // Attempt to connect to npub.cash as a Mint directly to restore/claim?
        // Or use SDK to find paid quotes and try to claim them.

        // Strategy: 
        // 1. Get Paid Quotes
        // 2. Derive deterministic secret (?) or use the Token if present.
        // Since we don't know exact 'claim' method from SDK, we assume npub.cash is a Mint.

        const wallet = new CashuWallet(new CashuMint(config.npub_cash_url));

        // Try to restore funds (blind sweep)
        // We need a seed. Usually derived from privKey.
        // Note: This is speculative. If npub.cash works differently, this needs adjustment.
        // But "Standard" cashu-address uses NUT-13?

        // For now, let's just log what we see.
        const quotes = await client.getAllQuotes();
        const paidQuotes = quotes.filter(q => q.state === 'PAID'); // Check exact state string

        console.log(`[Sweeper] Found ${paidQuotes.length} paid quotes on npub.cash.`);

        // Calculate potential balance from quotes?
        // Actually, if we want to "Sweep" we need to move funds.
        // Let's assume we can "Melt" from npub.cash Wallet to our Target Mint.

        // 1. Get Invoice from Target Mint (Bankify manages Target Mint Wallet)
        // We can use bankify to get an invoice!
        // But bankify stores tokens in memory. We want to ADD to that.

        // We need to know how much we have.
        // If we can't see balance, we can't sweep.
        // Try wallet.checkProofs if we have saved proofs? No.

        // Placeholder for actual Claim logic:
        // "Using npub.cash SDK to sweep"
        // If SDK has no Sweep, we rely on Mint interaction.

        if (paidQuotes.length > 0) {
            // Logic to calculate total amount to sweep
            // const total = paidQuotes.reduce((acc, q) => acc + q.amount, 0);

            // Generate Invoice from Bankify (Target Mint)
            // const invoiceData = await bankify.getLNInvoice(config.mint_url, total);

            // Pay invoice using npub.cash funds...
            // await ...? 

            console.log("[Sweeper] Capability to pay from npub.cash not fully clear from SDK. Assuming npub.cash forwards funds or allows restore.");
        }

    } catch (e) {
        console.warn("[Sweeper] Error:", e.message);
    }
}

// Main Loop
async function main() {
    loadState();

    // Start Bankify NWC
    // Load configured apps or create default?
    const apps = bankify.state.nostr_state.nwc_info;
    const appPubkeys = Object.keys(apps);

    if (appPubkeys.length === 0) {
        console.log("[Bankify] No NWC connection found. Creating one...");
        const relay = config.nwc_relay || "wss://relay.damus.io";
        const nwcStr = await bankify.createNWCconnection(config.mint_url, undefined, relay);
        console.log("\n---------------------------------------------------------");
        console.log("NWC CONNECTION STRING (Put this in your Nostr App):");
        console.log(nwcStr);
        console.log("---------------------------------------------------------\n");
        saveState();
    } else {
        console.log(`[Bankify] Restoring ${appPubkeys.length} NWC connections...`);
        for (const pk of appPubkeys) {
            const info = apps[pk];
            // Reconnect
            await bankify.createNWCconnection(info.mymint, info.permissions, info.relay, pk);
        }
    }

    // Start Saver
    setInterval(saveState, 5000);

    // Start Sweeper
    setInterval(runSweeper, config.sweep_interval_ms);
    runSweeper(); // Run once immediately

    console.log("[System] Running...");
}

main().catch(console.error);
