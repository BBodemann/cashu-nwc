# Cashu NWC Bridge with Auto-Sweep

This project allows you to:
1.  Receive Lightning payments via `npub.cash` (using your Nostr Pubkey).
2.  Periodically sweep those payments into a self-custodial Cashu Mint of your choice.
3.  Use the resulting Cashu tokens to power a Nostr Wallet Connect (NWC) interface, allowing you to pay Lightning invoices from NWC-enabled apps (like Damus, Amethyst, Zapple Pay) using your Cashu balance.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configuration**:
    The first time you run the app, it creates `config.json`.
    ```bash
    node index.js
    ```
    (It effectively exits or fails if keys are missing).

    Edit `config.json`:
    - `npub_privkey`: Your Nostr Private Key (`nsec...`). This is used to authenticate with `npub.cash` to sweep funds.
    - `mint_url`: The Cashu Mint URL you want to use for your wallet (e.g. `https://mint.minibits.cash/Bitcoin`). See `mints.json` for suggestions.
    - `npub_cash_url`: URL of the npub.cash service (default `https://npub.cash`).
    - `sweep_interval_ms`: How often to check for new funds (default 60000ms).

3.  **Run**:
    ```bash
    node index.js
    ```

4.  **Connect NWC**:
    Address the output "NWC CONNECTION STRING" in your terminal. Copy this string (starting with `nostr+walletconnect://...`) connection string to your NWC-enabled app.

## How it works

- **Sweeper**: Checks `npub.cash` for paid quotes (incoming payments). If found, it "swaps" the tokens from `npub.cash` to your chosen `mint_url`.
- **Bankify**: Acts as an NWC Provider. It listens for payment requests from your NWC apps. When a request comes in, it pays the Lightning invoice using the Cashu tokens stored in your local DB (`db.json`).

## Mints

See `mints.json` for a list of Cashu mints with API support.

## Security Note

- Your Nostr Private Key (`nsec`) is stored in `config.json`. Ensure this file is secure.
- Your Cashu tokens are stored in `db.json` and `config.json`.
- The `npub.cash` sweep logic assumes specific behavior from the `npub.cash` service (acting as a mint).
