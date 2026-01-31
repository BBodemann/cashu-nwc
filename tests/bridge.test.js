const fs = require('fs');
const path = require('path');

// Mock dependencies BEFORE requiring modules
jest.mock('fs');
jest.mock('../lib/coco.js');
jest.mock('coco-cashu-core', () => ({ initializeCoco: jest.fn() }));
jest.mock('coco-cashu-plugin-npc', () => ({ NPCPlugin: jest.fn() }));
jest.mock('coco-cashu-sqlite3', () => ({ SqliteRepositories: jest.fn() }));
jest.mock('sqlite3', () => ({ Database: jest.fn() }));
jest.mock('@scure/bip39', () => ({ mnemonicToSeed: jest.fn() }));

jest.mock('@cashu/cashu-ts', () => ({
    CashuMint: jest.fn(),
    CashuWallet: jest.fn()
}));
jest.mock('ws');

// Now require the module under test
const { CashuNWCBridge, bankify } = require('../lib/bridge');
const { CocoReceiver } = require('../lib/coco.js');

// Mock bankify (partially)
bankify.state = {
    utxos: [],
    nostr_state: {
        nwc_info: {},
        sockets: {}
    }
};
// Helper to avoid actual network calls in createNWCconnection if triggered
bankify.createNWCconnection = jest.fn().mockResolvedValue("nostr+walletconnect://mock");

describe('CashuNWCBridge', () => {
    let bridge;
    const mockConfig = {
        npub_privkey: "nsec1mock",
        mint_url: "https://mock.mint",
        npub_cash_url: "https://mock.npubx.cash",
        nwc_relay: "wss://mock.relay",
        sweep_interval_ms: 1000,
        min_balance_to_sweep: 100
    };
    const mockDbPath = '/tmp/mock_db.json';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset bankify state
        bankify.state.utxos = [];
        bankify.state.nostr_state.nwc_info = {};
    });

    test('should initialize with provided config', () => {
        bridge = new CashuNWCBridge(mockConfig, mockDbPath);
        expect(bridge.config).toEqual(mockConfig);
        expect(bridge.dbPath).toBe(mockDbPath);
    });

    test('should initialize with default config values', () => {
        const minimalConfig = { npub_privkey: "nsec1test" };
        bridge = new CashuNWCBridge(minimalConfig);

        expect(bridge.config.mint_url).toBe("https://mint.minibits.cash/Bitcoin");
        expect(bridge.config.nwc_relay).toBe("wss://relay.damus.io");
        expect(bridge.config.sweep_interval_ms).toBe(60000);
    });

    test('loadState should read from disk and update bankify state', () => {
        const mockState = {
            utxos: [{ id: 'token1', amount: 10 }],
            nwc_info: { 'pubkey1': { balance: 100 } }
        };

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        bridge = new CashuNWCBridge(mockConfig, mockDbPath);
        bridge.loadState();

        expect(fs.readFileSync).toHaveBeenCalledWith(mockDbPath);
        expect(bankify.state.utxos).toEqual(mockState.utxos);
        expect(bankify.state.nostr_state.nwc_info).toEqual(mockState.nwc_info);
    });

    test('loadState should handle missing file gracefully', () => {
        fs.existsSync.mockReturnValue(false);
        bridge = new CashuNWCBridge(mockConfig, mockDbPath);
        bridge.loadState();
        expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('saveState should write bankify state to disk', () => {
        bridge = new CashuNWCBridge(mockConfig, mockDbPath);

        // Simulate state change
        bankify.state.utxos = [{ id: 'new_token', amount: 50 }];

        bridge.saveState();

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            mockDbPath,
            expect.stringContaining('"id": "new_token"')
        );
    });

    test('getHexKey should decode nsec correctly', () => {
        bridge = new CashuNWCBridge(mockConfig);
        const hex = "5c2d6d098c4713c7723906aa7c2448342743956793e230787479637c2237ec16";
        expect(bridge.getHexKey(hex)).toBe(hex);
    });

    test('start() should initialize CocoReceiver', async () => {
        // Setup mock implementation for this test
        const mockStart = jest.fn();
        CocoReceiver.mockImplementation(() => ({
            start: mockStart
        }));

        bridge = new CashuNWCBridge(mockConfig, mockDbPath);
        bridge.loadState = jest.fn();
        bridge.saveState = jest.fn();

        await bridge.start();

        expect(CocoReceiver).toHaveBeenCalledWith(mockConfig, expect.any(Function));
        expect(mockStart).toHaveBeenCalled();
    });
});
