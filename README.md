# Deployment

A minimal menubar app for tracking your Vercel deployments.

![Deployment App](https://img.shields.io/badge/platform-macOS-blue)
![Version](https://img.shields.io/badge/version-0.1.0-green)

## Download

### macOS (Apple Silicon)

Download the latest release: [Deployment_0.1.0_aarch64.dmg](https://github.com/yogesharc/deployment/releases/latest/download/Deployment_0.1.0_aarch64.dmg)

1. Download the `.dmg` file
2. Open it and drag `Deployment.app` to your Applications folder
3. On first launch, right-click the app and select "Open" (required for unsigned apps)

## Features

- Lives in your menubar for quick access
- View recent deployments across all your Vercel projects
- Filter by team/account
- See deployment status, branch, and commit info
- Click to open deployment in browser
- Native macOS notifications for deployment status changes

## Usage

1. Click the menubar icon to open the panel
2. Create a Vercel API token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
3. Paste the token in the app
4. Select a team/account and project to view deployments
5. Right-click the menubar icon for options (including Quit)

## Development

### Prerequisites

- Node.js 18+
- Rust
- Xcode Command Line Tools (macOS)

### Setup

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Build artifacts are located in `src-tauri/target/release/bundle/`.

## Tech Stack

- [Tauri 2](https://tauri.app/) - Native app framework
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

## License

MIT
