# EtherVault Test Plan

**Last Updated:** 2026-02-04

## Overview

Comprehensive test plan for the EtherVault cross-platform password manager. Tests are organized at the **project root** with subdirectories for different modules.

---

## Test Directory Structure

```
tests/
├── TEST_PLAN.md                ← This file
├── setup.ts                    ← Global test setup
├── mocks/                      ← Shared mock implementations
│   ├── MockCryptoService.ts
│   ├── MockStorageService.ts
│   └── MockVaultService.ts
│
├── core/                       ← Core package tests
│   ├── AuthService.test.ts     ← ✅ COMPLETE (39 tests)
│   ├── CryptoService.test.ts   ← ✅ COMPLETE (24 tests)
│   ├── StorageService.test.ts  ← ✅ COMPLETE (18 tests)
│   ├── VaultService.test.ts    ← ⏳ TODO
│   └── SecurityService.test.ts ← ⏳ TODO
│
├── services/                   ← Cloud & external service tests
│   ├── CloudService.test.ts    ← ⏳ TODO
│   ├── GoogleDriveProvider.test.ts ← ⏳ TODO
│   └── BiometricService.test.ts    ← ⏳ TODO
│
├── components/                 ← React component tests
│   └── ...                     ← ⏳ TODO
│
└── integration/                ← End-to-end flows
    └── ...                     ← ⏳ TODO
```

---

## Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Current Status

| Module | Status | Tests |
|--------|--------|-------|
| **AuthService** | ✅ Complete | 39 |
| **CryptoService** | ✅ Complete | 24 |
| **StorageService** | ✅ Complete | 18 |
| VaultService | ⏳ TODO | - |
| SecurityService | ⏳ TODO | - |
| CloudService | ⏳ TODO | - |
| BiometricService | ⏳ TODO | - |
| Components | ⏳ TODO | - |
| Integration | ⏳ TODO | - |
| **Total** | | **81** |

---

## Module Details

### ✅ AuthService (39 tests)

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

---

### ✅ CryptoService (24 tests)

| Category | Tests |
|----------|-------|
| init | 1 |
| generateSalt | 4 |
| deriveKey | 4 |
| encrypt | 3 |
| decrypt | 4 |
| generatePassword | 8 |

---

### ✅ StorageService (18 tests)

| Category | Tests |
|----------|-------|
| init | 3 |
| metadata operations | 8 |
| vault operations | 5 |
| store isolation | 2 |

---

### ⏳ VaultService (TODO)

| Category | Description |
|----------|-------------|
| Add Entry | Encrypts and stores |
| Update Entry | Merges and re-encrypts |
| Delete Entry | Removes from storage |
| Get Entries | Decrypts all entries |
| Re-encrypt Vault | Changes encryption key |
| Cloud Merge | Handles conflict resolution |

---

## Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| AuthService | 90% | 83.33% |
| CryptoService | 85% | TBD |
| StorageService | 80% | TBD |
| VaultService | 85% | 0% |
| **Overall** | **80%** | ~10% |
