<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

> **Repository status:** This is the PhilSA React 19, TypeScript, and Vite prototype. It currently uses mock/local services; a production backend contract is not implemented. See [frontend architecture](../docs/architecture/FRONTEND-ARCHITECTURE.md). The AI Studio text below reflects the prototype's origin and is not a production deployment guide.

Any `GEMINI_API_KEY` substituted by Vite can be exposed in the browser bundle and must not be treated as secret. Supported Node.js/npm versions are `TBD`.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2d090cdc-2563-4366-a94e-9a7afe078442

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in an ignored `.env.local` file for local prototype use; never commit the value
3. Run the app:
   `npm run dev`

## Backend connection mode

The frontend defaults to local prototype authentication:

```env
VITE_AUTH_SERVICE_MODE="prototype"
```

To call the Django backend auth API boundaries during development, run the backend on port `8000` and set:

```env
VITE_AUTH_SERVICE_MODE="backend"
VITE_BACKEND_API_BASE_URL="http://localhost:8000"
```

Backend mode calls the current implemented auth boundary endpoints. Full backend login is still incomplete until account storage, token issuance, OTP delivery, and session validation are implemented.
