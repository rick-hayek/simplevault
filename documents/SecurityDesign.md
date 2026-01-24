# Security Design Document: Premium Password Manager

## 1. Core Security Requirements
To ensure the integrity, confidentiality, and availability of user data, the following core requirements are mandatory:
*   **Zero-Knowledge Architecture**: The server (if sync is enabled) must never have access to the user's Master Password or the unencrypted data.
*   **End-to-End Encryption (E2EE)**: All encryption/decryption happens locally on the client device.
*   **Forward Secrecy**: Compromise of a backup or old data should not compromise current keys if rotated.
*   **Secure Memory Handling**: Minimizing the time sensitive data stays in RAM and clearing buffers after use.

## 2. Threat Model

| Threat | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Server Compromise** | Attacker gains access to the cloud storage bucket. | Data is encrypted with AES-256 before leaving the client. The attacker only sees random blobs. |
| **Brute Force Attack** | Attacker obtains the encrypted vault and tries to guess the password. | Use **Argon2id** (memory-hard function) for key derivation to make brute-forcing computationally expensive. |
| **Malware/Keyloggers** | Malicious software on the user's device captures keystrokes. | **Virtual Keyboard** option for master password entry; Integration with OS-level secure entry (Windows Hello/TouchID) to bypass keystrokes. |
| **Man-in-the-Middle (MITM)** | Attacker intercepts network traffic. | TLS 1.3 for all transport; Certificate Pinning (if connecting to a custom server). |
| **XSS (Cross-Site Scripting)** | Malicious script injection in the web/electron view. | Strict **Content Security Policy (CSP)**; Sanitize all user inputs; React's auto-escaping. Electron `contextIsolation: true`. |

## 3. Recommended Cryptographic Scheme

### 3.1 Algorithms
*   **Symmetric Encryption**: **AES-256-GCM** (Galois/Counter Mode). GCM provides both confidentiality and data integrity (authentication).
*   **Key Derivation Function (KDF)**: **Argon2id**.
    *   *Parameters*: Minimum 64MB memory cost, 4 iterations, 2 parallelism (tunable based on device performance).
    *   *Salt*: 16-byte random salt, unique per user.
*   **Random Number Generation**: `window.crypto.getRandomValues` (Web Crypto API) or `crypto.randomBytes` (Node.js) for high-entropy key/IV generation.

### 3.2 Libraries & Frameworks
*   **Libsodium** (via `libsodium-wrappers`): The gold standard for modern cryptography. Highly recommended for its "safe by default" APIs.
    *   *Usage*: `crypto_secretbox_easy` for encryption.
*   **Web Crypto API**: Native browser standard, adequate for basic operations, but Libsodium is preferred for uniform cross-platform behavior and advanced KDFs like Argon2id (if not natively supported).

## 4. Key Management & Architecture

### 4.1 Master Key Derivation
The "Master Key" (used to encrypt the "Data Encryption Key") is never stored. It is derived on-the-fly:
`Master_Key = Argon2id(User_Password, Salt)`

### 4.2 The Key Hierarchy
1.  **User Password**: Known only to the user.
2.  **Master Key**: Derived from User Password. Used ONLY to unwrap the Data Encryption Key.
3.  **Data Encryption Key (DEK)**: A random 256-bit key generated once. This key actually encrypts the vault data.
    *   *Storage*: The DEK is stored in the vault, encrypted by the Master Key.
    *   *Benefit*: Allows changing the User Password without re-encrypting the entire vault (only re-encrypt the DEK).

### 4.3 Secure Storage (At Rest)
*   **Desktop**: Use **node-keytar** to store the encrypted DEK or authentication tokens in the OS Keychain (macOS Keychain, Windows Credential Vault, Linux Secret Service).
*   **Mobile**: **iOS Keychain** and **Android Keystore** system via React Native/Capacitor plugins.
*   **Web**: Encrypted `IndexedDB` storage. **Warning**: Web LocalStorage is NOT secure for sensitive keys (susceptible to XSS).

### 5. Audit & Compliance
*   **Open Source**: The crypto core should be open-source to allow community audit.
*   **Compliance**: Adhere to NIST SP 800-63 Digital Identity Guidelines.
