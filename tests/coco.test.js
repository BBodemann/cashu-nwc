
const { CocoReceiver } = require('../lib/coco.js');

// Mock dependencies
jest.mock('coco-cashu-plugin-npc', () => ({ NPCPlugin: jest.fn() }));
jest.mock('sqlite3', () => ({ Database: jest.fn() }));
jest.mock('@scure/bip39', () => ({ mnemonicToSeed: jest.fn() }));

// Mock SqliteRepositories with init() method
const mockRepoInit = jest.fn().mockResolvedValue();
jest.mock('coco-cashu-sqlite3', () => ({
    SqliteRepositories: jest.fn().mockImplementation(() => ({
        init: mockRepoInit
    }))
}));

// Mock Manager from coco-cashu-core
jest.mock('coco-cashu-core', () => {
    return {
        Manager: jest.fn().mockImplementation(function () {
            this.on = jest.fn();
        })
    };
});

// Retrieve the mocked Manager for assertions
const { Manager } = require('coco-cashu-core');
const mockManager = Manager;
const mockManagerInstance = new Manager(); // This returns the mock instance defined above

describe('CocoReceiver', () => {
    let receiver;
    const mockConfig = {
        npub_privkey: "5c2d6d098c4713c7723906aa7c2448342743956793e230787479637c2237ec16", // Valid hex
        npub_cash_url: "https://mock.npubx.cash"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('start() should initialize Manager directly with correct args', async () => {
        receiver = new CocoReceiver(mockConfig);

        await receiver.start();

        // 1. Verify Repo Init was called
        expect(mockRepoInit).toHaveBeenCalled();

        // 2. Verify Manager was instantiated
        expect(mockManager).toHaveBeenCalledTimes(1);

        // Check arguments passed to Manager constructor
        // expected: new Manager(repo, seedGetter, logger, ws, plugins, ...)
        const args = mockManager.mock.calls[0];

        const repo = args[0];
        const seedGetter = args[1];
        const plugins = args[4];

        expect(repo).toBeDefined(); // should be SqliteRepositories instance
        expect(typeof seedGetter).toBe('function');
        expect(Array.isArray(plugins)).toBe(true);
        expect(plugins.length).toBe(1); // [npcPlugin]

        // 3. Verify event listener attached
        // We need to get the instance that was created during start()
        const instance = mockManager.mock.instances[0];
        expect(instance.on).toHaveBeenCalledWith("mint-quote:redeemed", expect.any(Function));
    });

    test('should skip initialization if privkey is missing', async () => {
        receiver = new CocoReceiver({});
        await receiver.start();
        expect(mockManager).not.toHaveBeenCalled();
    });
});
