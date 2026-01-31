---
name: Cashu NWC Bridge
description: A tool to create a Lightning Network wallet using Cashu and expose it via Nostr Wallet Connect (NWC). Use this to receive zaps or pay invoices.
---

# Cashu NWC Bridge Skill

This skill allows you to operate a self-custodial Lightning Wallet powered by Cashu eCash.

## Capabilities
1.  **Receive Payments**: Funds sent to your Nostr Pubkey (via npub.cash) are automatically swept into your wallet.
2.  **Pay Invoices**: Use the generated NWC connection string to pay Lightning invoices.
3.  **Check Status**: Programmatically verify wallet balance and connection status.

## Installation

```bash
git clone https://github.com/your-repo/cashu-nwc-bridge.git
cd cashu-nwc-bridge
npm install
chmod +x bin/cashu-nwc.js
```

## Configuration

You MUST provide configuration via Environment Variables to avoid saving sensitive keys to disk.

| Variable | Description | Required |
| :--- | :--- | :--- |
| `NPUB_PRIVKEY` | Your Nostr Private Key (`nsec` or hex). Used to authenticate. | Yes |
| `MINT_URL` | Cashu Mint URL (see `mints.json`). | No (Default: Minibits) |
| `NWC_RELAY` | Relay for NWC commands. | No (Default: Damus) |

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
3.  **Fund**: Send Lightning/Zaps to your npub.cash address (`<your_npub>@npub.cash`).
4.  **Wait**: The bridge will sweep funds (default every 60s).
5.  **Spend**: Use a NWC client (or library) with the `nwc_connection_string` to pay invoices.

## Troubleshooting

-   **"Database not found"**: The bridge hasn't started or hasn't created `db.json` yet. Run `start` first.
-   **"No NWC connection"**: Wait for the bridge to initialize (check `status` loop until `connected` is true).
