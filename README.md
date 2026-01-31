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
    Start the bridge and assume a background process.
    ```bash
    cashu-nwc start &
    ```

4.  **State Inspection**:
    Use the machine-readable `status` command to get the connection string.
    ```bash
    cashu-nwc status
    # Returns JSON: { "nwc_connection_string": "..." }
    ```

### Capabilities for Agents

-   **Self-Funding Wallet**: By pointing `npub.cash` to your agent's pubkey, you can receive unconditional payments (zaps). This tool will automatically catch them and convert them to spendable Cashu tokens.
-   **Payment Interface**: The NWC interface allows the agent (or other apps) to request Lightning Invoice payments. The bridge creates the payment by melting Cashu tokens.

---

## 👨‍💻 For Human Users

### Installation

```bash
npm install
npm link # Optional: makes 'cashu-nwc' command available globally
```

### Quick Start

1.  Run the bridge:
    ```bash
    cashu-nwc start
    ```
    *(Or `node bin/cashu-nwc.js start` if you didn't link)*
    
2.  **Configuration**: On first run, a `config.json` is generated. Edit it with your `npub_privkey` if you want to sweep earnings.
3.  **Connection**: Copy the **NWC Connection String** printed in the console.
4.  **Usage**: Paste it into your Nostr Client (Damus, Amethyst, Primal, etc.) to pay invoices using your Cashu balance.

---

## ☁️ Deployment & Hosting

This bridge is a **client-side application**. It connects *outbound* to Nostr Relays and Cashu Mints.

### Hosting Requirements
-   **No Open Ports**: You do **NOT** need to open any ports (port forwarding) or have a static IP. It works behind NATs, firewalls, and on home internet.
-   **Always-On**: The bridge must be running to receive NWC commands (pay invoices) and sweep funds. A VPS is recommended for reliability.
-   **Resources**: Very low resource usage (< 256MB RAM). Can run on a free-tier VPS (AWS t2.micro, Oracle Cloud, etc.) or a Raspberry Pi.

### VPS Setup Guide (Ubuntu/Debian)

1.  **Install Node.js (v18+)**:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

2.  **Install Process Manager (PM2)**:
    We use PM2 to keep the bridge running in the background and restart it if it crashes or the server reboots.
    ```bash
    sudo npm install -g pm2
    ```

3.  **Setup Bridge**:
    ```bash
    git clone <repo_url>
    cd cashu-nwc-bridge
    npm install
    
    # Set your keys (RECOMMENDED: Add to ~/.bashrc for persistence)
    export NPUB_PRIVKEY="nsec1..."
    
    # Start with PM2
    pm2 start bin/cashu-nwc.js --name "cashu-bridge" -- start
    
    # Save PM2 list to respawn on reboot
    pm2 save
    pm2 startup
    ```

4.  **Monitor**:
    ```bash
    pm2 logs cashu-bridge
    pm2 status
    ```

---

## 🏗️ Architecture & Services

The bridge relies on the following external services. You do not need to host these yourself, but you rely on their availability.

1.  **Nostr Relays** (`wss://relay.damus.io`, etc.):
    -   **Usage**: Used for Non-Custodial Wallet Connect (NWC) communication. The bridge listens for ephemeral events (commands) from your wallet app.
    -   **Config**: `nwc_relay` in `config.json`.
    
2.  **Cashu Mint** (e.g., Minibits, Nutstash):
    -   **Usage**: The actual custodian of funds (blinded). The bridge "melts" tokens here to pay Lightning invoices.
    -   **Config**: `mint_url` in `config.json`.
    
3.  **npub.cash**:
    -   **Usage**: A 3rd-party service that allows anyone to pay a generic Lightning Address (`<pubkey>@npub.cash`) and holds the funds for you to claim.
    -   **Role**: The bridge "Sweeps" funds from here into your separate Cashu Mint.

---

## Security

**Please read [SECURITY.md](SECURITY.md) for detailed security practices.**

-   **Private Keys**: `db.json` contains your NWC secret execution keys and Cashu tokens (money). **Protect these files.**
-   **Environment Variables**: We strongly recommend using Environment Variables (`NPUB_PRIVKEY`) instead of `config.json` for key management.
-   **Self-Host**: Run this on a server you control.
