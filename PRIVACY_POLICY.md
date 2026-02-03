# Privacy Policy for EtherVault

**Last Updated:** February 3, 2026

EtherVault ("we", "our", or "the App") is an open-source, privacy-first password manager designed to respect and protect your digital privacy. This Privacy Policy explains how EtherVault handles your data.

**In short: We do not collect, store, or sell your personal data. You own your data.**

## 1. Data Collection and Storage

### Local-First Architecture
EtherVault operates on a "Local-First" basis. All your sensitive data (usernames, passwords, notes, tags) is stored securely on your local device (computer or mobile phone). This data is encrypted using military-grade AES-256 encryption.

### No Central Server
We do not operate a central server to store your vault data. We (the developers of EtherVault) have no access to your master password, your stored credentials, or your encryption keys. If you lose your Master Password, we cannot recover your data for you.

## 2. Cloud Synchronization

EtherVault offers an optional feature to synchronize your data across devices using your own personal cloud storage providers (currently **Google Drive**).

*   **Encryption Before Sync**: All data is encrypted locally on your device **before** being uploaded to the cloud. The cloud provider sees only encrypted binary blobs and cannot read your sensitive information.
*   **User Control**: Synchronization is optional and must be explicitly enabled and authenticated by you.
*   **Third-Party Policies**: Data stored on your cloud provider is subject to that provider's privacy policy and terms of service (e.g., [Google Privacy Policy](https://policies.google.com/privacy)).

## 3. Biometric Data

EtherVault supports unlocking the application using biometric authentication (Fingerprint, TouchID, FaceID).

*   **Local Processing**: Biometric verification is handled entirely by your device's operating system (Android, iOS, macOS, Windows).
*   **No Access**: EtherVault receives only a "pass/fail" confirmation from the OS. We do not access, collect, store, or transmit your actual fingerprint or facial data.

## 4. Third-Party Requests

### Website Icons (Favicons)
To improve the user experience, EtherVault may automatically fetch icons (favicons) for the websites you store in your vault.
*   These requests may be sent directly to the target website or via a privacy-respecting favicon service (e.g., Google S2, DuckDuckGo).
*   These requests may technically expose your IP address to the content provider, similar to visiting the website in a browser.

## 5. Device Permissions

The App requests the following permissions for specific functions:

*   **Network/Internet Access**: Required for Cloud Synchronization and fetching website icons.
*   **Biometric Hardware**: Required to enable FaceID/TouchID unlock.
*   **Storage/File System**: Required to store your encrypted vault files locally and for Import/Export functionality.

## 6. Logs & Analytics

*   **Crash Reports**: The App does not automatically send crash reports to us.
*   **Local Logs**: Use logs (`Master Log`) are stored locally on your device for your own auditing and debugging purposes. These logs never leave your device unless you manually export and share them.

## 7. Changes to This Policy

We may update our Privacy Policy from time to time. Since the App is open source and local-first, significant changes to data handling would typically require a software update. We advise you to review this page periodically for any changes.

## 8. Contact Us

If you have any questions or suggestions about our Privacy Policy, you can reach out via our [GitHub](https://github.com/rick-hayek/ethervault) repository or project page.

---
**EtherVault** — Your Code, Your Data, Your Vault.
