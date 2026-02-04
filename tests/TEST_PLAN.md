# EtherVault Test Plan

**Last Updated:** 2026-02-04

## Test Summary

| Module | Tests | Status |
|--------|-------|--------|
| AuthService | 39 | ✅ |
| CryptoService | 24 | ✅ |
| StorageService | 18 | ✅ |
| VaultService | 23 | ✅ |
| **Total** | **104** | ✅ |

---

## Directory Structure

```
tests/
├── TEST_PLAN.md
├── setup.ts                    ← Global setup (jest-dom, fake-indexeddb)
├── mocks/
│   ├── MockCryptoService.ts
│   ├── MockStorageService.ts
│   └── MockVaultService.ts
│
├── core/
│   ├── AuthService.test.ts     ← 39 tests
│   ├── CryptoService.test.ts   ← 24 tests
│   ├── StorageService.test.ts  ← 18 tests
│   └── VaultService.test.ts    ← 23 tests
│
├── services/                   ← TODO
├── components/                 ← TODO
└── integration/                ← TODO
```

---

## Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Module Details

### AuthService (39 tests)

| Category | Tests |
|----------|-------|
| setupAccount | 6 |
| authenticate | 7 |
| lock / checkAuth / getMasterKey | 7 |
| isAccountSetup | 2 |
| verifyPassword | 2 |
| changeMasterPassword | 5 |
| importCloudCredentials | 5 |
| key derivation helpers | 5 |

### CryptoService (24 tests)

| Category | Tests |
|----------|-------|
| init | 1 |
| generateSalt | 4 |
| deriveKey | 4 |
| encrypt | 3 |
| decrypt | 4 |
| generatePassword | 8 |

### StorageService (18 tests)

| Category | Tests |
|----------|-------|
| init | 3 |
| metadata operations | 8 |
| vault operations | 5 |
| store isolation | 2 |

### VaultService (23 tests)

| Category | Tests |
|----------|-------|
| addEntry | 5 |
| getEntries | 3 |
| updateEntry | 4 |
| deleteEntry | 3 |
| reencryptVault | 1 |
| exportVault / importVault | 2 |
| clearLocalVault | 1 |
| processCloudEntries | 2 |
| mergeCloudEntries | 2 |
