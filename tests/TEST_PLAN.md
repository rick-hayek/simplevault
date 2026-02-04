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
│   ├── AuthService.test.ts     ← ✅ COMPLETE (39 tests, 83% coverage)
│   ├── CryptoService.test.ts   ← ⏳ TODO
│   ├── VaultService.test.ts    ← ⏳ TODO
│   ├── StorageService.test.ts  ← ⏳ TODO
│   └── SecurityService.test.ts ← ⏳ TODO
│
├── services/                   ← Cloud & external service tests
│   ├── CloudService.test.ts    ← ⏳ TODO
│   ├── GoogleDriveProvider.test.ts ← ⏳ TODO
│   └── BiometricService.test.ts    ← ⏳ TODO
│
├── components/                 ← React component tests
│   ├── LoginView.test.tsx      ← ⏳ TODO
│   ├── VaultView.test.tsx      ← ⏳ TODO
│   ├── SettingsView.test.tsx   ← ⏳ TODO
│   └── GeneratorView.test.tsx  ← ⏳ TODO
│
└── integration/                ← End-to-end flows
    ├── auth-flow.test.ts       ← ⏳ TODO
    ├── vault-crud.test.ts      ← ⏳ TODO
    └── cloud-sync.test.ts      ← ⏳ TODO
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

| Module | Status | Tests | Coverage |
|--------|--------|-------|----------|
| **AuthService** | ✅ Complete | 39 | 83.33% |
| CryptoService | ⏳ TODO | - | - |
| VaultService | ⏳ TODO | - | - |
| StorageService | ⏳ TODO | - | - |
| SecurityService | ⏳ TODO | - | - |
| CloudService | ⏳ TODO | - | - |
| BiometricService | ⏳ TODO | - | - |
| Components | ⏳ TODO | - | - |
| Integration | ⏳ TODO | - | - |

---

## Module Test Plans

### ✅ Core: AuthService (COMPLETE)

**File:** `tests/core/AuthService.test.ts`  
**Status:** 39 tests passing, 83.33% coverage

| Category | Tests | Status |
|----------|-------|--------|
| setupAccount | 6 | ✅ |
| authenticate | 7 | ✅ |
| lock / checkAuth / getMasterKey | 7 | ✅ |
| isAccountSetup | 2 | ✅ |
| verifyPassword | 2 | ✅ |
| changeMasterPassword | 5 | ✅ |
| importCloudCredentials | 5 | ✅ |
| deriveKeyWithSalt / getSaltBase64 / getVerifierJson | 5 | ✅ |

---

### ⏳ Core: CryptoService

**File:** `tests/core/CryptoService.test.ts`

| Category | Description |
|----------|-------------|
| Key Derivation | Argon2id produces consistent keys |
| Encryption | AES-256-GCM round-trip |
| Salt Generation | Random 16-byte salt |
| Password Generation | Meets length & charset requirements |

---

### ⏳ Core: VaultService

**File:** `tests/core/VaultService.test.ts`

| Category | Description |
|----------|-------------|
| Add Entry | Encrypts and stores |
| Update Entry | Merges and re-encrypts |
| Delete Entry | Removes from storage |
| Get Entries | Decrypts all entries |
| Re-encrypt Vault | Changes encryption key |
| Cloud Merge | Handles conflict resolution |

---

### ⏳ Core: StorageService

**File:** `tests/core/StorageService.test.ts`

| Category | Description |
|----------|-------------|
| CRUD Operations | IndexedDB read/write |
| Store Isolation | metadata vs vault stores |

---

### ⏳ Core: SecurityService

**File:** `tests/core/SecurityService.test.ts`

| Category | Description |
|----------|-------------|
| Password Strength | Score calculation |
| Breach Check | HIBP API integration |

---

### ⏳ Services: CloudService

**File:** `tests/services/CloudService.test.ts`

| Category | Description |
|----------|-------------|
| Provider Registration | Add/switch providers |
| Sync Flow | Upload/download vault |
| Salt Conflict | Detection and resolution |

---

### ⏳ Services: GoogleDriveProvider

**File:** `tests/services/GoogleDriveProvider.test.ts`

| Category | Description |
|----------|-------------|
| OAuth Flow | Token exchange |
| File Operations | Create/read/update vault.json |
| Token Refresh | Mutex prevents race |

---

### ⏳ Services: BiometricService

**File:** `tests/services/BiometricService.test.ts`

| Category | Description |
|----------|-------------|
| Availability Check | Platform detection |
| Save/Retrieve Secret | Keychain integration |

---

### ⏳ Components

| File | Categories |
|------|------------|
| LoginView.test.tsx | Render, Submit, Biometric Button |
| VaultView.test.tsx | Entry list, Search, CRUD |
| SettingsView.test.tsx | Password Change, Cloud Sync, Biometric Toggle |
| GeneratorView.test.tsx | Length slider, Charset toggles, Copy |

---

### ⏳ Integration

| File | Scenarios |
|------|-----------|
| auth-flow.test.ts | First-time setup → Login, Lock → Unlock |
| vault-crud.test.ts | Add/Edit/Delete entries |
| cloud-sync.test.ts | Enable sync, Conflict resolution |

---

## Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| AuthService | 90% | **83.33%** |
| CryptoService | 85% | 0% |
| VaultService | 85% | 0% |
| StorageService | 80% | 0% |
| Components | 70% | 0% |
| **Overall** | **80%** | ~3% |
