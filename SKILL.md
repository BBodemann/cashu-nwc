---
name: Cashu NWC Bridge
description: A tool to create a Lightning Network wallet using Cashu and expose it via Nostr Wallet Connect (NWC). Use this to receive zaps or pay invoices.
---

# Cashu NWC Bridge Skill

This skill allows you to operate a self-custodial Lightning Wallet powered by Cashu eCash.

## Capabilities
1.  **Receive Payments**: Funds sent to your Nostr Pubkey (via `npubx.cash`) are automatically received by the embedded `Coco` wallet.
2.  **Pay Invoices**: Use the generated NWC connection string to pay Lightning invoices.
3.  **Check Status**: Programmatically verify wallet balance and connection status.

## Installation

```bash
git clone https://github.com/BBodemann/cashu-nwc.git
cd cashu-nwc
npm install
npm link
# Now you can run `cashu-nwc` directly
```

## Configuration

You MUST provide configuration via Environment Variables to avoid saving sensitive keys to disk.

| Variable | Description | Required |
| :--- | :--- | :--- |
| `NPUB_PRIVKEY` | Your Nostr Private Key (`nsec` or hex). Used to authenticate. | Yes |
| `MINT_URL` | Cashu Mint URL (see `mints.json`). | No (Default: Minibits) |
| `NWC_RELAY` | Relay for NWC commands. | No (Default: Damus) |
| `NPUB_CASH_URL` | payment gateway URL. | No (Default: npubx.cash) |

## Agent Protocols

### 1. Mint Selection Strategy
The agent should parse `mints.json` to select a mint.
-   **Mainnet**: Choose a mint with `"recommended": true` and `"risk_tier": "low"`.
-   **Testing**: Choose a mint with `"risk_tier": "test"`.

**Recommendation**: Default to `https://mint.minibits.cash/Bitcoin` if no specific preference.

### 2. Wallet Creation & Initialization
A "Wallet" in this bridge is defined by the `db.json` file and the configured `MINT_URL`.
1.  **Select Mint**: Set `MINT_URL` in environment.
2.  **Initialize**: Run the bridge (`start`). It will automatically create `db.json` if missing.
3.  **Verify**: Run `status`. If `connected: true` and `balance_utxos: 0`, the wallet is ready.

### 3. Secure Storage (Critical)
**WARNING**: This bridge uses **randomly generated secrets** for Cashu tokens. It does **NOT** use a BIP-39 seed phrase.
-   **The "Private Key" is the `db.json` file itself.**
-   **Backup**: You must backup `db.json` to preserve funds.
-   **Encryption**: If storing `db.json` in a cloud environment (S3, etc.), ENCRYPT it first.
-   **Migration**: To move the wallet, simply move the `db.json` file to the new location.

## Usage

### 1. Start the Bridge
Run the bridge in the background. It needs to stay running to listen for NWC commands and sweep funds.

```bash
export NPUB_PRIVKEY="nsec1..."
./bin/cashu-nwc.js start &
```

### 2. Get Connection Info (JSON)
To get your NWC Connection String (to use in other apps) or check your balance, run the `status` command.

```bash
./bin/cashu-nwc.js status
```

**Output Example:**
```json
{
  "connected": true,
  "nwc_connection_string": "nostr+walletconnect://...?relay=...&secret=...",
  "mint_url": "https://mint.minibits.cash/Bitcoin",
  "balance_utxos": 5,
  "apps_connected": 1
}
```

### 3. Workflow for Agents

1.  **Init**: Install and `start` the bridge.
2.  **Connect**: Run `status` to get the `nwc_connection_string`.
3.  **Fund**: Send Lightning/Zaps to your npubx.cash address (`<your_npub>@npubx.cash`).
4.  **Wait**: The `Coco` receiver will detect the payment and log it (funds held in `coco.db`).
5.  **Spend**: Use a NWC client (or library) with the `nwc_connection_string` to pay invoices (funds drawn from `db.json` via Bankify).

## Framework & Libraries
This bridge composes two powerful libraries:
-   **Coco (`coco-cashu-core`)**: Handles the **Receiving** side. It uses the `npubx.cash` protocol to turn your Nostr Pubkey into a Lightning Address.
-   **Bankify (`supertestnet/bankify`)**: Handles the **Spending** side. It turns a Cashu Mint connection into a NWC-compatible wallet.

**Note**: Currently, `Coco` and `Bankify` maintain separate database files (`coco.db` and `db.json`). Future versions may unify these. For now, ensure *both* files are backed up.

## Troubleshooting

-   **"Database not found"**: The bridge hasn't started or hasn't created `db.json` yet. Run `start` first.
-   **"No NWC connection"**: Wait for the bridge to initialize (check `status` loop until `connected` is true).
