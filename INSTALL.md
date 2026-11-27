# Installing Family Calendar without the app stores

## Android: install the APK directly (free)

GitHub builds an installable `.apk` automatically (see `.github/workflows/android-apk.yml`).

1. **Get the APK**
   - After this is merged to `main`: open the repository's **Releases** page and download
     `family-calendar.apk` from **"Family Calendar for Android (latest)"**. You can do this
     right on the phone.
   - Or from any build: **Actions** tab → **Build Android APK** → open a run →
     **Artifacts** → `family-calendar-apk` (download it on a computer; it comes as a .zip
     with the APK inside).
   - To build on demand: **Actions** → **Build Android APK** → **Run workflow**.
2. **Install it:** open the file on the phone. Android will ask you to allow installs from
   your browser or file manager ("Install unknown apps"). Allow it, then tap **Install**.
   Google Play Protect may warn that the app is from an unknown developer. Choose
   **Install anyway**.
3. **Updates:** download the newer APK and install it over the old one. Your settings are kept.

Optional: set the repository variable `API_URL` (Settings → Secrets and variables →
Actions → **Variables**) to your server's address. Builds then come with it pre-filled,
so family members don't have to type it into Settings.

> The APK is signed with the standard development key that every Expo project uses.
> That's fine for sharing inside the family. Before a wider rollout or a Play Store
> release, create your own signing key.

## iPhone

Apple doesn't allow installing app files from the internet the way Android does. These
are the options, from easiest to hardest:

| Option | Cost | What you need | Notes |
| --- | --- | --- | --- |
| **TestFlight** (recommended) | Apple Developer Program, $99/yr | An Expo account (free) | Not listed in the App Store. Invite up to 100 family members by email. They install with Apple's TestFlight app. Each build lasts 90 days. |
| **Ad hoc / internal build** | Apple Developer Program, $99/yr | An Expo account (free) | Register each iPhone once, then everyone installs from a link. Up to 100 devices. |
| **Free Apple ID + Xcode** | Free | A Mac with Xcode, phone plugged in by cable | The app stops opening after **7 days** and has to be reinstalled from the Mac. |
| **Expo Go** | Free | Your computer running `npx expo start` | Good for trying the app, not for everyday use. |

### TestFlight (cloud build, no Mac needed)

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```

EAS walks you through signing in with your Apple account and creates the certificates.
Then, in [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**,
add family members as testers by email. Nothing gets published to the public App Store.

### Ad hoc install link

```bash
cd mobile
npx eas-cli@latest device:create     # send the link to each family iPhone to register it
npx eas-cli@latest build --platform ios --profile preview
```

When the build finishes, EAS gives you a link or QR code. Open it on a registered iPhone
to install. If you add a new phone later, register it and build again.

### Free, with a Mac

```bash
cd mobile
npm install
npx expo run:ios --device --configuration Release
```

Sign in with your Apple ID in Xcode → Settings → Accounts. On the iPhone, trust the
developer under Settings → General → VPN & Device Management.

## Connecting to the server

Whichever way you install, open **Settings** in the app and enter the server URL and
family key. For a server running at home, use the computer's local IP, for example
`http://192.168.1.20:4000`. For family members away from home, the server must be
hosted online with HTTPS (see `server/README.md`).
