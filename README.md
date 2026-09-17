# Thor Guard Translator for Golf

Thor Guard Translator turns a golf course’s live ThorMobile readings into clear, safety-first language that golfers and course staff can understand quickly.

**Live app:** [thor-guard-translator-golf.savelaven.chatgpt.site](https://thor-guard-translator-golf.savelaven.chatgpt.site)

**Project page:** [navypa56.github.io/thor-guard-translator-golf](https://navypa56.github.io/thor-guard-translator-golf/)

Prescott Lakes is the default course. Users can also enter another course’s public ThorMobile URL, making the app useful beyond a single location.

## What it does

- Retrieves the selected course’s live ThorMobile status server-side.
- Refreshes frequently while keeping the last successful reading visible during an update or temporary connection problem.
- Treats the official Thor Guard alert state as the final authority.
- Explains LHL, DI, AD, and FCC readings in plain language.
- Shows clear visual states for All Clear, caution, and Red Alert.
- Includes a training mode with simulated Red Alert data.
- Displays a course-centered weather radar with a color legend.
- Provides a weather-based waiting estimate during caution or Red Alert while clearly separating that estimate from Thor Guard’s official status.
- Works on desktop, iPhone, and Android-sized screens.
- Links directly to the official Thor Guard source so users can verify the current alert.

## Safety

This application is an informational translator, not an independent lightning-warning system.

If the app’s interpretation ever conflicts with the selected course’s official Thor Guard status, **the official Thor Guard status wins**. The app never declares an All Clear based only on numerical readings. During a Red Alert, remain sheltered until the official system reports the All Clear and follow all golf course instructions.

## Official sources

- [Thor Guard Support Documents](https://thorguard.com/download-category/support-documents/)
- [How Thor Guard Works](https://thorguard.com/lightning-101/)
- [Live Prescott Lakes ThorMobile](http://prescottlakes.thormobile14.net/mobile/)

Live course conditions come from the selected ThorMobile page. Thor Guard’s official documentation is used separately to explain what the readings mean; documentation examples are never substituted for live readings.

## Run it on Windows

Double-click **Open Thor Guard Translator.cmd**. It starts the app if necessary and opens it in your browser—no PowerShell commands are required.

## Developer setup

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run build
```

## Project structure

- `app/api/thor/route.ts` fetches a selected course’s ThorMobile data server-side with caching disabled.
- `app/api/radar/route.ts` supports the radar display.
- `app/api/outlook/route.ts` provides weather context for the waiting estimate.
- `lib/thorSource.ts` validates a public ThorMobile course URL and discovers its data feed.
- `lib/thorParser.ts` decodes and normalizes the live fields.
- `lib/thorDefinitions.ts` is the single editable home for definitions and source notes.
- `lib/interpretThor.ts` applies status-first safety language without inventing an All Clear.
- `components/ThorDashboard.tsx` provides the responsive live dashboard and refresh behavior.
- `components/ThorRadarMap.tsx` renders the course-centered radar map.

Definitions and interpretation rules are deliberately isolated so official Thor Guard guidance can be updated without rewriting the rest of the application.

## Feedback

Use the **Email the author** button in the app, or email [savelaven@gmail.com](mailto:savelaven@gmail.com?subject=Thor%20Guard%20Translator%20%E2%80%94%20bug%20or%20enhancement), to report a bug or suggest an enhancement.

## Version

Current release: **v1.0.0**
