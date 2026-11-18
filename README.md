# onMyWay

A social travel app: share trips, moments and travel questions, follow other travelers' routes with an in-app map
that records your GPS track, earn badges and levels, and ask a local AI assistant where to go and when.

The repository has three parts:

| Folder | What it is | Stack |
| --- | --- | --- |
| [`onMyWay/`](onMyWay) | Mobile app (Android / iOS) | Expo SDK 58, React Native 0.88, Expo Router, Uniwind (Tailwind v4), Reanimated 4 |
| [`Backend/`](Backend) | REST API | Node.js, Express 5, PostgreSQL 16 (Docker) |
| [`AI_bot/`](AI_bot) | Travel assistant service | Node.js + [Ollama](https://ollama.com) running `qwen2.5:3b` locally |

`Docs/` holds the architecture diagram and the brand book (PDF).

## Features

- **Feed**: trips (multi-stop routes with photos), moments (one live photo pinned by the device GPS) and questions.
  Likes, comments with threaded replies, "Want to go" saves, follows. Category and destination filters,
  infinite scroll.
- **On the road now**: moments from the last 24 hours, grouped per traveler like stories.
- **Trip mode**: an in-app map (Leaflet + OSRM routes) that guides you stop by stop and records your GPS track,
  including in the background. Distance and visited stops feed your stats.
- **Verified posts**: a pin is verified only when it comes from the photo's own GPS.
- **Rewards**: 100 badges, 20 levels, unlockable avatar frames, a badge showcase on the profile.
- **Community**: traveler search (name or country), suggestions, leaderboards (km / countries / trips,
  per week / month / all time), other travelers' profiles, followers / following lists.
- **AI assistant "Way"**: answers travel questions in Vietnamese or English from the app's own data
  (curated destinations + everything travelers have posted). Runs fully locally, with no cloud API key.
- **Notifications**: likes, comments, replies, answers, follows.

## Architecture

```
 Mobile app (Expo)  ──HTTP/JSON──▶  Backend API :3000  ──SQL──▶  PostgreSQL :5433 (Docker)
                                        │
                                        └──HTTP──▶  AI_bot :3100  ──▶  Ollama :11434 (qwen2.5:3b, GPU)
```

The app talks only to the Backend. Uploaded photos are stored on the Backend's disk (`Backend/uploads`) in
development and served from `/uploads`.

### Loading performance

- **Stale-while-revalidate cache** (`onMyWay/src/lib/cache.ts`): screens show their last data at once and refresh
  in the background. Identical requests made at the same time share one network call. The feed, my profile,
  trips and the country list are also kept on disk, so the app opens with content before the network answers.
  The cache is scoped to the signed-in user and wiped on sign-out.
- **Lazy rendering**: windowed feed list, carousels that load only the visible photo and the next one, and map
  WebViews that mount after the screen transition.
- **Right-sized images** (`onMyWay/src/lib/image.ts`): CDN photos are requested at the size they are shown, kept in
  memory and on disk, and the next feed page's photos are prefetched.
- **gzip** on all API responses.

## Getting started

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)
- Android Studio with an emulator, or an Android phone with USB debugging
- Optional, for the assistant: [Ollama](https://ollama.com) (`winget install Ollama.Ollama`), then
  `ollama pull qwen2.5:3b`

### 1. Database and API

```bash
cd Backend
cp .env.example .env        # fill in JWT_SECRET and DATABASE_URL (see below)
npm install
npm run db:up               # starts the onmyway-db container (Postgres on port 5433)
npm run db:migrate
npm run db:seed             # reference data (destinations)
npm run db:seed:demo        # optional: 10 demo travelers with posts, comments, likes, follows
npm run dev                 # API on http://localhost:3000/api
```

With the default `docker-compose.yml` the connection string is:

```
DATABASE_URL=postgres://onmyway:onmyway_dev@localhost:5433/onmyway
```

Demo accounts: `test1@gmail.com` ... `test10@gmail.com`, password `Test@1234`.

`npm run db:seed:official` adds the official onMyWay account's posts. That account has to be registered in the
app first (`OFFICIAL_EMAIL`, defaults to `onmyway.app.contact@gmail.com`).

### 2. AI assistant (optional)

```bash
cd AI_bot
cp .env.example .env
npm install
npm start                   # http://127.0.0.1:3100, Ollama must be running
npm test                    # unit tests
npm run eval                # answer-quality evaluation
npm run ask -- "Where should I go for a beach trip in December?"
```

See [`AI_bot/README.md`](AI_bot/README.md) for how it works. When the service is down, the app's assistant
screen shows an error and the rest of the app keeps working.

### 3. Mobile app

```bash
cd onMyWay
npm install
```

Create `onMyWay/.env.local`:

```
# The Backend on your computer's LAN IP, so both an emulator and a phone on the same Wi-Fi can reach it
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
# Google sign-in (OAuth client IDs, not secrets)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

The app uses native modules (background location, Google sign-in), so it runs in a **development build**, not
Expo Go:

```bash
npx expo run:android        # first time: builds and installs the app
npx expo start              # afterwards: just start Metro
```

On an emulator or a USB-connected phone, forward Metro's port:

```bash
adb reverse tcp:8081 tcp:8081
```

To simulate movement while testing trip mode: `adb emu geo fix <longitude> <latitude>`. The server rejects jumps
faster than 250 km/h, so move in short steps.

## Project layout

```
onMyWay/src/
  app/              Screens (Expo Router, file-based routes)
    (auth)/         Login, register
    (tabs)/         Home feed, Trips, Community, Profile
    post/ trip/ user/ follows/   Post detail, trip mode map, traveler profile, follower lists
  components/       Shared UI (components/ui = design-system primitives)
  lib/              API clients, stores, cache, trip recorder, rewards logic
  i18n/             Strings
Backend/src/
  routes/ controllers/ services/ models/   Express layers
  db/migrations/    SQL migrations (run in order)
  db/seeds/ db/demo/  Reference and demo data
AI_bot/src/         understand → retrieve → answer pipeline
```

## API overview

All routes are under `/api` and need a `Bearer` access token, except sign-in.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `GET/DELETE /auth/me` |
| Posts | `GET/POST /posts` (`?limit`, `?before`, `?author`), `GET /posts/saved`, `GET/DELETE /posts/:id`, like / save (`POST/DELETE /posts/:id/like`, `/save`), `GET/POST /posts/:id/comments` |
| Media | `POST /media` (raw image body or multipart) |
| Users | `GET /users/:id/profile`, `PATCH /users/me`, `PATCH /users/me/rewards`, `GET /users/:id/followers`, `/following`, `POST/DELETE /users/:id/follow` |
| Community | `GET /travelers?q=`, `GET /travelers/suggested`, `GET /leaderboard?metric=&period=`, `GET /countries` |
| Trips | `GET /route`, `POST/GET /trip-runs`, `GET /trip-runs/active`, `POST /trip-runs/:id/points`, `POST /trip-runs/:id/end`, `GET /trip-runs/:id/track` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read` |
| Assistant | `POST /ai/chat`, `GET /ai/conversations`, `GET/DELETE /ai/conversations/:id` |

## Checks

```bash
cd onMyWay && npx tsc --noEmit      # typecheck the app
cd AI_bot && npm test && npm run eval
```

## Notes

- Map tiles come from OpenStreetMap, which is fine for development. Switch to a hosted tile provider before
  production (see OSM's tile usage policy).
- Photos uploaded from the app are stored at full size. Server-side resizing is not done yet.
- Re-running `db:seed:demo` recreates the demo posts with new ids, so trips that non-demo users took on old demo
  posts show as "Removed trip".
