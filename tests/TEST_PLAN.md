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

## Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## AuthService (39 tests)

### 1. setupAccount (6)

| Test | Expected |
|------|----------|
| Generate and store salt | Salt stored in metadata |
| Derive key from password and salt | `deriveKey` called with password + salt |
| Store setup_complete flag | `setup_complete = true` in metadata |
| Create and store auth verifier | Encrypted "VALID" stored as verifier |
| Set authenticated state after setup | `checkAuth() = true` |
| Make master key available after setup | `getMasterKey()` returns Uint8Array |

### 2. authenticate (7)

| Test | Expected |
|------|----------|
| Return false when no salt exists | `false`, auth state unchanged |
| Authenticate with valid password and verifier | `true`, masterKey set |
| Return false for invalid password (decrypt fails) | `false`, masterKey null |
| Return false for decrypted value not equal to VALID | `false` |
| Fallback to vault item when verifier fails | Creates new verifier, returns `true` |
| Legacy fallback when no verifier exists | Uses vault item to verify, returns `true` |
| Return false when no verifier AND no vault entries | `false` (security) |

### 3. lock / checkAuth / getMasterKey (7)

| Test | Expected |
|------|----------|
| Clear authentication state on lock | `checkAuth() = false` |
| getMasterKey throws after lock | Throws `'Vault is locked'` |
| checkAuth returns false initially | `false` before auth |
| checkAuth returns true after setup | `true` after `setupAccount` |
| checkAuth returns true after authentication | `true` after `authenticate` |
| getMasterKey throws when not authenticated | Throws error |
| getMasterKey returns key when authenticated | Returns Uint8Array(32) |

### 4. isAccountSetup (2)

| Test | Expected |
|------|----------|
| Return false when setup_complete not set | `false` |
| Return true when setup_complete is set | `true` after setup |

### 5. verifyPassword (2)

| Test | Expected |
|------|----------|
| Return true for correct password when authenticated | `true` via key comparison |
| Fall back to authenticate when not authenticated | Calls `authenticate()` internally |

### 6. changeMasterPassword (5)

| Test | Expected |
|------|----------|
| Throw when account not set up | Throws `'Account not set up'` |
| Return true and re-encrypt vault on success | `true`, `reencryptVault` called |
| Generate new salt for new password | `generateSalt` called |
| Update auth verifier with new key | New verifier stored |
| Update stored salt | New salt stored in metadata |

### 7. importCloudCredentials (5)

| Test | Expected |
|------|----------|
| Throw when verifier is missing | Throws `MISSING_VERIFIER` |
| Throw when verifier is invalid JSON | Throws `INVALID_VERIFIER` |
| Throw when verifier structure is invalid | Throws `INVALID_VERIFIER` |
| Store salt and verifier on valid import | Both stored in metadata |
| Clear auth state after import | `checkAuth() = false` |

### 8. key derivation helpers (5)

| Test | Expected |
|------|----------|
| deriveKeyWithSalt with provided salt | Returns derived key |
| getSaltBase64 when no salt exists | Returns `null` |
| getSaltBase64 when salt exists | Returns base64 string |
| getVerifierJson when no verifier exists | Returns `null` |
| getVerifierJson when verifier exists | Returns JSON string |

---

## CryptoService (24 tests)

### 1. init (1)

| Test | Expected |
|------|----------|
| Initialize libsodium | No error thrown |

### 2. generateSalt (4)

| Test | Expected |
|------|----------|
| Generate a Uint8Array salt | Returns Uint8Array |
| Generate 16-byte salt | `salt.length === 16` |
| Generate different salts each time | `salt1 !== salt2` |
| Throw if not initialized | Throws `'Sodium not initialized'` |

### 3. deriveKey (4)

| Test | Expected |
|------|----------|
| Derive a 32-byte key | `key.length === 32` |
| Produce consistent keys for same inputs | `key1 === key2` |
| Produce different keys for different passwords | `key1 !== key2` |
| Produce different keys for different salts | `key1 !== key2` |

### 4. encrypt (3)

| Test | Expected |
|------|----------|
| Return ciphertext and nonce as base64 | `{ ciphertext: string, nonce: string }` |
| Produce different ciphertexts for same message | Random nonce → different output |
| Throw if not initialized | Throws error |

### 5. decrypt (4)

| Test | Expected |
|------|----------|
| Decrypt encrypted message correctly | Returns original plaintext |
| Decrypt complex JSON objects | Returns parsed JSON |
| Throw for wrong key | Throws decryption error |
| Throw for corrupted ciphertext | Throws error |

### 6. generatePassword (8)

| Test | Expected |
|------|----------|
| Generate default length (20) | `password.length === 20` |
| Generate specified length | `password.length === n` |
| Include lowercase when enabled | Matches `/[a-z]/` |
| Include uppercase when enabled | Matches `/[A-Z]/` |
| Include numbers when enabled | Matches `/[0-9]/` |
| Include symbols when enabled | Contains special chars |
| Return empty when no charset selected | `''` |
| Generate different passwords each time | `pw1 !== pw2` |

---

## StorageService (18 tests)

### 1. init (3)

| Test | Expected |
|------|----------|
| Initialize the database | Returns IDBDatabase |
| Return same database on multiple calls | Same reference |
| Create vault and metadata stores | Both objectStores exist |

### 2. metadata operations (8)

| Test | Expected |
|------|----------|
| Set and get metadata item | Value matches |
| Overwrite existing item | New value returned |
| Return undefined for non-existent key | `undefined` |
| Store and retrieve Uint8Array | Arrays equal |
| Store and retrieve objects | Objects equal |
| Delete metadata item | `undefined` after delete |
| Get all metadata items | Returns all values |
| Clear all metadata | Empty array after clear |

### 3. vault operations (5)

| Test | Expected |
|------|----------|
| Store vault entry with keyPath id | Entry retrievable by id |
| Update vault entry | Updated values returned |
| Get all vault entries | Returns all entries |
| Delete vault entry | `undefined` after delete |
| Clear all vault entries | Empty array after clear |

### 4. store isolation (2)

| Test | Expected |
|------|----------|
| Keep vault and metadata separate | Different values for same key |
| Not affect metadata when clearing vault | Metadata preserved |

---

## VaultService (23 tests)

### 1. addEntry (5)

| Test | Expected |
|------|----------|
| Create entry with generated ID and timestamps | `id`, `createdAt`, `updatedAt` set |
| Encrypt sensitive fields | `encrypt` called with JSON |
| Calculate password strength | `calculateStrength` called |
| Store encrypted entry | `setItem` called with payload |
| Sync to cloud after adding | `uploadEntry` called |

### 2. getEntries (3)

| Test | Expected |
|------|----------|
| Return cached entries if available | No storage call |
| Decrypt entries from storage when empty | `decrypt` called |
| Skip entries that fail to decrypt | Filtered from results |

### 3. updateEntry (4)

| Test | Expected |
|------|----------|
| Update entry with new values | Merged entry returned |
| Throw if entry not found | Throws `'Entry not found'` |
| Recalculate strength on password change | `calculateStrength` called |
| Sync updated entry to cloud | `uploadEntry` called |

### 4. deleteEntry (3)

| Test | Expected |
|------|----------|
| Remove entry from storage | `deleteItem` called |
| Remove entry from cache | Not in `getEntries()` |
| Sync deletion to cloud | `deleteEntry` called |

### 5. reencryptVault (1)

| Test | Expected |
|------|----------|
| Re-encrypt all entries with new key | `encrypt` called for each |

### 6. exportVault / importVault (2)

| Test | Expected |
|------|----------|
| Export vault as encrypted JSON | JSON with ciphertext + nonce |
| Import vault from encrypted JSON | Entries populated from decrypt |

### 7. clearLocalVault (1)

| Test | Expected |
|------|----------|
| Clear storage and cache | `clear` called, entries empty |

### 8. processCloudEntries (2)

| Test | Expected |
|------|----------|
| Decrypt and store valid entries | `setItem` called for valid |
| Skip entries that fail to decrypt | Not saved to storage |

### 9. mergeCloudEntries (2)

| Test | Expected |
|------|----------|
| Merge newer cloud entries | Returns count, entries added |
| Skip if local is newer | Returns 0, unchanged |

---

## Future Tests (TODO)

| Module | Category | Status |
|--------|----------|--------|
| SecurityService | Password strength, audit | ⏳ |
| CloudService | Provider management, sync | ⏳ |
| BiometricService | Platform detection, keychain | ⏳ |
| Components | LoginView, SettingsView | ⏳ |
| Integration | Auth flow, vault CRUD | ⏳ |
