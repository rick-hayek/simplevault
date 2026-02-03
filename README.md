# EtherVault

EtherVault is a modern, cross-platform password manager designed for industrial-grade security and a seamless user experience. It supports Web, Desktop (Electron), and Mobile (Android/iOS) platforms, helping you securely store, manage, and sync your sensitive credentials.


<div style="font-size: 11px; color: grey"> 
我开发这个小工具的初衷是自己的各种密码挺多了，维护起来比较麻烦，就想有个跨平台的工具保存密码。现有的密码类软件各种商店都有很多，但主要密码比较敏感，用别人的不太放心，就想着自己写一个。再开源出来，别人想用可以从这里下载工具，也可以下载代码自己build，安全性自己把控，也比较放心。
</div>


## 📖 Project Overview

EtherVault is built using a Monorepo architecture, with core business logic separated from the UI layer to ensure high code reusability and consistency across platforms. The project features built-in robust local encryption (AES-256), supports end-to-end encrypted synchronization with major cloud storage services (like Google Drive), and integrates advanced features such as biometric unlock and password health analysis. It is dedicated to creating the most secure digital vault for users.

## 🚀 Features

### 🔐 Core Vault
- **Credential Management**: Securely store usernames, passwords, URLs, and notes.
- **Efficient Retrieval**: Supports fuzzy search, category filtering (All, Personal, Work, Others), and multi-dimensional tag management.
- **Smart Icons**: Automatically fetches and displays website icons for a better visual experience.

### 🛡️ Security Dashboard
- **Security Score**: Real-time assessment of vault health based on password complexity algorithms.
- **Risk Detection**: Automatically scans for weak or reused passwords and provides optimization suggestions.
- **Data Visualization**: Visualizes password security distribution through intuitive charts.

### 🎲 Password Generator
- **High Entropy**: Generates strong, uncrackable passwords.
- **Highly Customizable**: Supports custom length (up to 128 characters) and character sets (uppercase, lowercase, numbers, symbols).
- **One-Click Copy**: Automatically calculates entropy and allows one-click copying after generation.

### ⚙️ Settings & Ecosystem
- **Cloud Sync**: Supports encrypted data synchronization with cloud providers like Google Drive, ensuring consistency across devices.
- **Appearance**: Supports Dark Mode, Light Mode, and System Default.
- **Internationalization**: Built-in multi-language support (English/Chinese).
- **Data Mobility**: Supports standard CSV/JSON import and export for easy data migration.
- **Security Protection**: Supports Biometric Unlock (FaceID/TouchID), auto-lock, and local operation log auditing.

## 🛠️ Tech Stack

This project is built on a modern frontend technology stack:

- **Core Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Cross-Platform Runtime**:
  - **Desktop**: [Electron](https://www.electronjs.org/)
  - **Mobile**: [Capacitor 8](https://capacitorjs.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **State Management**: Custom Hooks & Context API
- **Package Management**: NPM Workspaces

## 💻 Development Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- NPM

### 1. Google Console Setup (For Cloud Sync)
Before running the app, you need to set up a project in Google Cloud Console to enable Google Drive synchronization:

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., `ethervault-dev`).
3.  **Enable API**:
    *   Navigate to **APIs & Services > Library**.
    *   Search for **Google Drive API** and enable it.
4.  **Configure OAuth Consent Screen**:
    *   Go to **APIs & Services > OAuth consent screen**.
    *   Select **External** (unless you are a G-Suite user).
    *   Fill in required app information.
    *   Add your email as a **Test User**.
5.  **Create Credentials (Web Client)**:
    *   Go to **APIs & Services > Credentials**.
    *   Click **Create Credentials > OAuth Client ID**.
    *   Application type: **Web application**.
    *   Add Authorized JavaScript origins: `http://localhost:3000` (and `http://localhost:5173` if needed).
    *   Add Authorized redirect URIs: `http://localhost:3000` (and `http://localhost:5173` if needed).
    *   Copy the **Client ID**.
6.  **Create Credentials (iOS Client)**:
    *   Go to **APIs & Services > Credentials**.
    *   Click **Create Credentials > OAuth Client ID**.
    *   Application type: **iOS**.
    *   Add Bundle ID: `com.ethervault.app`.
    *   Copy the **Client ID**.
7.  **Configure Environment Variables**:
    *   Create a `.env` file in `packages/app/.env` (copy from `.env.example` if available).
    *   Add your credentials:
        ```bash
        # This is for local development
        VITE_GOOGLE_CLIENT_ID=your_client_id_here
        # This is for native application on iOS, Android, and Desktop
        VITE_GOOGLE_CLIENT_ID_IOS=your_client_id_here
        ```

### 2. Install Dependencies
Run in the project root:
```bash
npm install
```

### 3. Start Development Environment

**Web Mode (Browser):**
```bash
npm run dev
```

**Desktop Mode (Electron):**
```bash
npm run dev:desktop
```

**Mobile Sync (Capacitor):**
```bash
npm run mobile:sync
```

### 4. Build & Package

**Build Web Assets:**
```bash
npm run build
```

**Build Desktop App:**
```bash
npm run dist:desktop
```

**Build iOS/Android:**
```bash
# iOS
npm run build:ios

# Android
npm run build:android
```

### 5. Other Commands

**Clean Project:**
```bash
npm run clean
```

**Type Check:**
```bash
npm run type-check
```

## 📄 License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute the code of this project unless otherwise specified.

## 🤝 Contribution

Contributions are welcome! If you have suggestions or find bugs, please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---
**EtherVault** — Secure locally, Sync globally.
