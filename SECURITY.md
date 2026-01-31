# Security Policy & Audit

## 1. Secure Key Handling

### For AI Agents
**Recommendation**: **Do not** write sensitive keys to `config.json` on disk if possible. Instead, pass them via Environment Variables.

Supported Environment Variables:
- `NPUB_PRIVKEY`: Your Nostr private key (nsec or hex).
- `DEFAULT_MINT`: URL of the Cashu Mint.
- `NWC_RELAY`: Relay for NWC.

**Example**:
```bash
export NPUB_PRIVKEY="nsec1..."
export MINT_URL="https://mint..."
cashu-nwc
```

### Files
- `db.json`: Contains your **Cashu Tokens** (which are bearer assets like cash) and your **NWC Secret Keys**.
- `config.json`: May contain your **Nost Private Key** if not using Env Vars.

**WARNING**: Anyone with read access to `db.json` can steal your funds.
**WARNING**: Anyone with read access to `config.json` can impersonate your Nostr identity.

## 2. Best Practices

1.  **Isolation**: Run this bridge in a sandboxed environment or a dedicated container.
2.  **Permissions**: Ensure the user running the process has restricted filesystem permissions. `db.json` permissions should be `600` (read/write only by owner).
3.  **Backups**: Periodically backup `db.json` to a secure location (encrypted) to prevent loss of funds.
4.  **Updates**: Keep dependencies up to date (`npm update`) as cryptography libraries evolve.

## 3. Threat Model

-   **Compromised Process**: If the process is compromised, the attacker can spend funds and use the Nostr key.
-   **NWC Access**: If the NWC connection string is leaked, an attacker can spend funds via Lightning payments. Rotate keys by deleting `db.json` (after moving funds!) if leakage is suspected.

## 4. Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately to the repository maintainer.
