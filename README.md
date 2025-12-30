# Deployment

A minimal menubar app for tracking your Vercel and Railway deployments.

![Deployment App](https://img.shields.io/badge/platform-macOS-blue)
![Version](https://img.shields.io/badge/version-0.2.0-green)

## Download

### macOS (Apple Silicon)

Download the latest release: [Deployment_0.1.0_aarch64.dmg](https://github.com/yogesharc/deployment/releases/latest/download/Deployment_0.1.0_aarch64.dmg)

1. Download the `.dmg` file
2. Open it and drag `Deployment.app` to your Applications folder
3. On first launch, right-click the app and select "Open" (required for unsigned apps)

## Features

- Lives in your menubar for quick access
- **Multi-provider support**: Track both Vercel and Railway deployments
- **Multi-account**: Add multiple accounts from each provider
- View recent deployments across all your projects
- See deployment status, branch, and commit info
- **Tray status**: Shows "Deploying..." in menubar during active builds
- **Native notifications**: Get notified when deployments succeed or fail
- Click to open deployment in browser (or dashboard for in-progress builds)
- Rename accounts for easier identification

## Usage

1. Click the menubar icon to open the panel
2. Go to Settings to add accounts:
   - **Vercel**: Create a token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - **Railway**: Create a token at [railway.com/account/tokens](https://railway.com/account/tokens)
3. Paste the token in the app
4. **Note**: A password dialog will appear asking for keychain access - this is to securely store your tokens in macOS Keychain
5. Your deployments will appear in the main panel
6. Right-click the menubar icon for options (including Quit)

## Development

### Prerequisites

- Node.js 18+
- Rust
- Xcode Command Line Tools (macOS)

### Setup

```bash
pnpm install
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

Build artifacts are located in `src-tauri/target/release/bundle/`.

## Tech Stack

- [Tauri 2](https://tauri.app/) - Native app framework
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

## License

MIT
