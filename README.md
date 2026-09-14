# Thor Guard Translator

A mobile-first Next.js app that translates a golf course's live ThorMobile status into conservative, plain English. Prescott Lakes is the default, but each user can paste a public ThorMobile course URL and save it in their browser.

## Open the app

Double-click **Open Thor Guard Translator.cmd**. It starts the app if needed and opens it in your browser. No terminal commands are required.

For developers, the manual commands are `npm install` followed by `npm run dev`.

Use `npm test` for parser/safety tests and `npm run build` for a production check.

## Architecture

- `app/api/thor/route.ts` fetches the selected course's XML server-side with caching disabled.
- `lib/thorSource.ts` validates a public course URL and discovers its XML feed from the ThorMobile configuration.
- `lib/thorParser.ts` decodes the UTF-16 response and normalizes the live fields.
- `lib/thorDefinitions.ts` is the single editable home for definitions and verified mappings.
- `lib/interpretThor.ts` applies status-first safety wording. It does not infer an All Clear from numbers.
- `components/ThorDashboard.tsx` polls the local API approximately every 10 seconds.

The definitions for LHL, DI, AD, and FCC remain explicitly marked as needing verification. No probabilities, distances, timers, thresholds, or abbreviation meanings are invented.
