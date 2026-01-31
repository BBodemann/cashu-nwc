# Cashu-NWC Bridge & Sweeper

This project provides a **bridge** between the Nostr network and Cashu Mint ecosystems. It allows you to:
1.  **Receive Lightning Payments**: Use `npubx.cash` (via Coco) to receive payments to your Nostr Public Key.
2.  **Sweep Funds**: Automatically receive these incoming funds into a high-performance Cashu Wallet.
3.  **Spend via NWC**: Use the Cashu tokens to fund a Nostr Wallet Connect (NWC) interface, allowing you to pay Lightning invoices from any NWC-compatible app.

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
    # Link binary
    npm link
    ```

2.  **Configuration**:
    Use Environment Variables to configure the agent securely (see `SECURITY.md`).
    ```bash
    export NPUB_PRIVKEY="nsec1..."
    export MINT_URL="https://mint.minibits.cash/Bitcoin"
    export NWC_RELAY="wss://relay.damus.io"
    ```

3.  **Operation**:
    Start the bridge.
    ```bash
    cashu-nwc start &
    ```

4.  **State Inspection**:
    Use the machine-readable `status` command to get the connection string.
    ```bash
    cashu-nwc status
    # Returns JSON.
    ```

### Capabilities for Agents

-   **Self-Funding Wallet**: By pointing `npubx.cash` to your agent's pubkey (`<npub>@npubx.cash`), you can receive unconditional payments (zaps).
-   **Payment Interface**: The NWC interface allows the agent to request Lightning Invoice payments.

---

## 👨‍💻 For Human Users

### Installation

```bash
npm install
npm link
```

### Quick Start

1.  Run the bridge: `cashu-nwc start`.
2.  **Configuration**: On first run, a `config.json` is generated.
3.  **Connection**: Copy the **NWC Connection String** printed in the console.

---

## Technical Details

-   **Bankify Integration**: Uses [Bankify](https://github.com/supertestnet/bankify) for NWC.
-   **Coco Integration**: Uses the **Coco** format (`npubx.cash`) to receive payments.
-   **Persistence**: Uses `coco.db` for incoming funds and `db.json` for NWC state.

## Security

**Please read [SECURITY.md](SECURITY.md).**

