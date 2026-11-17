# onMyWay AI travel assistant

Answers travel questions ("Where should I go for a beach trip in December?", "Phú Quốc tháng 7 có nên đi không?")
from onMyWay's own data, using a local model served by [Ollama](https://ollama.com). No cloud API, no key.

## How it works

1. **Understand** (`src/understand.js`): keyword rules pull the months, kind of place, countries and tags out of
   the question, in Vietnamese or English. Follow-ups reuse what earlier questions said.
2. **Retrieve** (`src/retrieve.js`): ranks the destinations in the `places` table and finds popular community trips.
   A country is a hard filter; months, kind and tags only rank.
   It also knows every **traveler spot**: each trip stop and moment travelers posted (Eiffel Tower, Colosseum...),
   with the travelers' own notes. A spot is placed in the curated destination within 40 km (Colosseum -> Rome), and
   "is the Eiffel Tower good in December?" is answered with that destination's season data. New posts show up
   within a minute (60 s cache).
3. **Answer** (`src/assistant.js` + `src/llm.js`): the model writes the reply from those results only and returns
   JSON `{ reply, place_ids, post_ids }`. Timing verdicts ("good time to go" / "better in November to April") are
   computed beforehand, so the small model only explains them.
4. **Guard rails**: ids the model did not receive are dropped, cards follow the places the reply actually names,
   countries with no data get a fixed honest answer (no model), and if Ollama is down the answer is built from the
   search results.

The Backend calls this service (`POST /ai/chat` → `AI_BOT_URL`) and stores conversations in `ai_conversations` /
`ai_messages`; the app talks only to the Backend.

## Run it

```bash
# once
winget install Ollama.Ollama        # or https://ollama.com/download
ollama pull qwen2.5:3b              # ~1.9 GB, fits a 6 GB GPU
cd AI_bot && npm install

# Backend seeds include the destinations the bot recommends from
cd ../Backend && npm run db:seed

# start (port 3100, localhost only)
cd ../AI_bot && npm start
```

Configuration (`.env`, see `.env.example`): `OLLAMA_URL`, `OLLAMA_MODEL`, `AI_BOT_PORT`. `DATABASE_URL` is read from
`Backend/.env` when not set here.

## Quality and speed

`npm run eval` asks 20 fixed questions (Vietnamese and English) and checks the language, the places, the timing
verdict and that nothing is invented. Current result with `qwen2.5:3b`: **20/20, ~1.4 s per answer** (2 runs in a row).

What keeps a 3B model accurate:
- Only the season notes and seasonal sights for the months asked are sent ("autumn leaves" is dropped for April).
- Off-season places are left out when the question gives a time and enough in-season places fit.
- Each place says why it matches ("known for cherry-blossom; in season then").
- "Is X good in month Y?" opens with a verdict sentence written by code from the data.

What keeps it fast:
- The model is loaded when the service starts and stays in GPU memory while it runs (unloaded on exit).
- Replies are capped at 320 tokens.
- First questions are cached for 10 minutes (the suggestion chips answer instantly).

## Try it

```bash
npm run ask -- "Tháng 12 nên đi biển ở Việt Nam chỗ nào đẹp?"
npm test                         # 19 unit tests: parsing, timing verdicts, reply cleanup
npm run eval                     # end-to-end quality and speed on 20 questions
curl localhost:3100/health
```

## Limits

- A 3B model is fast (~1.2 s on an RTX 4050); questions outside the eval set can still get small mix-ups.
  A bigger model (`OLLAMA_MODEL=qwen2.5:7b`, ~4.7 GB) answers better but slower.
- Season advice exists only for the destinations in `places` (44 seeded). Traveler spots without a destination
  nearby get no timing advice, only what travelers wrote.
