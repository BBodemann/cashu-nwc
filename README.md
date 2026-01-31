# Cashu-NWC Bridge & Sweeper

This project provides a **bridge** between the Nostr network and Cashu Mint ecosystems. It allows you to:
1.  **Receive Lightning Payments**: Use `npub.cash` to receive payments to your Nostr Public Key.
2.  **Sweep Funds**: Automatically sweep these incoming funds into a high-performance Cashu Mint.
3.  **Spend via NWC**: Use the swept Cashu tokens to fund a Nostr Wallet Connect (NWC) interface, allowing you to pay Lightning invoices from any NWC-compatible app (Damus, Amethyst, etc.) or AI Agent.

---

## 🤖 For Autonomous AI Agents

This repository is designed to be easily consumed and configured by AI Agents.

### Setup Protocol for Agents

1.  **Repository Initialization**:
    Clone the repo and install dependencies.
    ```bash
    git clone <repo_url>
    cd cashu-nwc-bridge
    npm install
    ```

2.  **Configuration (`config.json`)**:
    The application reads from `config.json`. If it doesn't exist, run `node index.js` once to generate it, or create it programmatically:
    ```json
    {
      "npub_privkey": "nsec1...",        // YOUR Nostr Private Key (Be careful!)
      "mint_url": "https://mint.minibits.cash/Bitcoin", // Target Mint
      "npub_cash_url": "https://npub.cash", // npub.cash service
      "nwc_relay": "wss://relay.damus.io",  // Relay for NWC commands
      "sweep_interval_ms": 60000,           // Check interval (ms)
      "min_balance_to_sweep": 100           // Minimum sats to sweep
    }
    ```

3.  **State Management (`db.json`)**:
    Wallet state (UTXOs) and NWC connection strings are stored in `db.json`.
    - **Reading NWC String**: An agent can read `db.json` to find the `nwc_string`.
    ```javascript
    // Example: Reading NWC secret programmatically
    const db = require('./db.json');
    const pubkeys = Object.keys(db.nwc_info);
    const connectionString = db.nwc_info[pubkeys[0]].nwc_string;
    console.log("NWC Connection:", connectionString);
    ```

### Capabilities for Agents

-   **Self-Funding Wallet**: By pointing `npub.cash` to your agent's pubkey, you can receive unconditional payments (zaps). This tool will automatically catch them and convert them to spendable Cashu tokens.
-   **Payment Interface**: The NWC interface allows the agent (or other apps) to request Lightning Invoice payments. The bridge creates the payment by melting Cashu tokens.

---

## 👨‍💻 For Human Users

### Installation

```bash
npm install
```

### Quick Start

1.  Run the bridge:
    ```bash
    node index.js
    ```
2.  Edit `config.json` with your details (especially `npub_privkey` if you want to sweep earnings).
3.  Restart: `node index.js`.
4.  Copy the **NWC Connection String** printed in the console.
5.  Paste it into your Nostr Client (Damus, Amethyst, Primal, etc.).

### Mints

A list of recommended mints is available in `mints.json`. You can change your mint in `config.json`.

---

## Technical Details

-   **Bankify Integration**: Uses [Bankify](https://github.com/supertestnet/bankify) to provide the NWC layer. We patched it to support persistent storage (`db.json`) instead of in-memory only.
-   **Npub.cash SDK**: Uses the [npubcash-sdk](https://github.com/cashubtc/npubcash-sdk) to monitor incoming payments.
-   **Persistence**: All Cashu UTXOs and NWC secrets are saved to `db.json`. Backup this file!

## Security

**Please read [SECURITY.md](SECURITY.md) for detailed security practices.**

-   **Private Keys**: `config.json` contains your Nostr private key. `db.json` contains your NWC secret execution keys and Cashu tokens (money). **Protect these files.**
-   **Environment Variables**: We strongly recommend using Environment Variables (`NPUB_PRIVKEY`) instead of `config.json` for key management.
-   **Self-Host**: Run this on a server you control.

