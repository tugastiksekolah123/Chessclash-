# Chess Concepts Arena

A complete, production-ready, single-file HTML chess platform with tournament-grade rules, five AI levels, two visual themes (Pion en Fleur & Kessler Armory), procedural Web Audio music, real-time peer-to-peer multiplayer, and PWA installability.

---

## 🚀 Quick Start / Local Preview

You can run Chess Concepts Arena locally with zero build tools:

```bash
# Python 3
python3 -m http.server 8000

# Or with Node.js
npx serve .
```

Open `http://localhost:8000` in any modern web browser.

---

## 📦 GitHub Deployment

To push this repository to GitHub:

```bash
# Initialize git repository
git init

# Stage all files
git add .

# Create initial commit
git commit -m "feat: initial commit of Chess Concepts Arena"

# Set main branch
git branch -M main

# Add your GitHub remote repository
git remote add origin https://github.com/YOUR_USERNAME/chess-concepts-arena.git

# Push to GitHub
git push -u origin main
```

---

## ⚡ Vercel Deployment

Deploying Chess Concepts Arena to Vercel takes under 60 seconds:

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Import your GitHub repository (`chess-concepts-arena`).
4. In the **Configure Project** screen:
   - **Framework Preset**: `Other`
   - **Build Command**: *(leave empty or override with empty)*
   - **Output Directory**: *(leave empty)*
   - **Install Command**: *(leave empty)*
5. Click **"Deploy"**.
6. Your live site URL will be ready immediately with HTTPS and PWA support enabled!

---

## 📱 PWA Installation

### Android (Chrome)
1. Visit your site URL on Chrome for Android.
2. Tap the in-app **"Install App"** button in the toolbar, or tap Chrome's three-dot menu `⋮` and select **"Add to Home screen"** / **"Install app"**.
3. Chess Concepts Arena installs as a standalone, fullscreen offline app.

### iOS Safari
1. Visit your site URL in Safari.
2. Tap the **Share** button (box with upward arrow) at the bottom.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top right corner.

### Desktop (Chrome / Edge / Brave)
1. Look for the install icon in the URL omnibox or click the **"Install"** button in the app header.
2. Click **Install** to run Chess Concepts Arena in its own desktop window.

---

## 🌐 Custom Domain Setup (Optional)

1. On Vercel, navigate to your project **Settings** → **Domains**.
2. Enter your custom domain (e.g., `chess.example.com`).
3. Add the provided `CNAME` or `A` records to your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.).
4. Vercel automatically issues an SSL certificate for HTTPS.

---

## 🤝 Real-Time Peer-to-Peer (WebRTC) Multiplayer

Chess Concepts Arena includes zero-backend, direct browser-to-browser peer-to-peer multiplayer using native WebRTC DataChannels:

### Manual Signaling Flow (Works Anywhere Without Server or Accounts):
1. **Player 1 (Host)**:
   - Selects "Online (P2P)" on the landing screen and clicks "Host Game".
   - Clicks "Generate Offer" to generate a Base64 SDP connection string.
   - Copies the offer code and sends it to their opponent (via WhatsApp, Discord, Telegram, SMS, or email).
2. **Player 2 (Guest)**:
   - Selects "Online (P2P)" and clicks "Join Game".
   - Pastes Player 1's Offer code and clicks "Generate Answer".
   - Copies the generated Answer code and sends it back to Player 1.
3. **Player 1 (Host)**:
   - Pastes the Answer code and clicks "Connect".
   - The WebRTC data channel opens instantly, clocks sync, and the match begins!

### In-Game Features:
- **Host Authoritative**: Sequence numbers (`seq`) prevent out-of-order execution.
- **Turn Gating**: Only the active player's color can move pieces.
- **Emotes & Chat**: Fast preset emotes (Good game, Nice move, Oops, Thinking, Resign?).
- **Draw / Resign / Takeback**: Structured negotiation protocol.
- **30-Second Reconnection Grace**: Holds board state if a player temporarily drops.

---

## ⚠️ Known Limitations & Notes

- **TURN Server**: Standard STUN (`stun:stun.l.google.com:19302`) is utilized. No proprietary TURN relay is bundled. Symmetric NATs or extremely restrictive corporate firewalls may fail to establish direct P2P connections; standard home/mobile Wi-Fi and 4G/5G connections connect normally.
- **Audio Context**: Modern browsers require a user gesture (first click on the board or toolbar) before Web Audio can output procedural music and sound effects.
- **Offline Play**: Pass & Play and all 5 AI levels run 100% locally and offline.
