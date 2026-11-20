# PokéLift

A personal workout tracker where the weight you lift levels up a team of Gen 1 Pokémon. Log workouts from templates and see last session's numbers on every set. Every pound earns XP, every 10,000-step day finds a wild Pokémon, and your team battles the eight Kanto gyms.

Personal, non-commercial fan project. Pokémon is © Nintendo / Game Freak / The Pokémon Company. Game data and sprites come from [PokéAPI](https://pokeapi.co).

## How XP works

Every 20,000 lb you lift (weight × reps, with bodyweight counted for pull-ups and push-ups) is worth 1 level to your active Pokémon, at any level. Heavier workouts earn proportionally more. The rest of the party gets a share of your pounds. Gym badges and session milestones put whole levels into the XP Bank. The pounds-per-level number is adjustable in Settings.

## Walking

- **Encounters:** every 10,000 steps you walk, counted cumulatively across days, a wild Pokémon appears: 50% common, 30% uncommon, 20% rare. Its level is 70–90% of the average of your three highest-level Pokémon, and it arrives already evolved if it's past its evolution level.
- **Shinies:** 2% (1 in 50) per encounter, plus 0.25% for every PR since your last shiny, up to 25%. Catching one resets it to 2%.
- **iPhone step sync:** a Shortcut reads Apple Health and posts the day's total to `rest/v1/rpc/pokelift_report_steps` with a private per-user sync code. The app shows the setup steps (Home → Today's steps → Set up iPhone sync). Run it from Shortcuts automations through the day and at 11:30 PM. Steps can also be entered by hand.

## Gyms and evolutions

- Beating a trainer the first time gives your team a little XP: easy 0.2 levels, medium 0.3, hard 0.5, leader 0.75 (the party gets half). Rematches are practice and give nothing, so battling can't replace lifting. Leaders also give a badge, which adds levels to the XP Bank.
- Evolutions that need a stone or a trade in the games happen at set levels instead: Eevee 25 (you choose the form), Raichu 28, most other stone evolutions 32–36, Poliwrath 38, Alakazam and Gengar 38, Machamp and Golem 40.

## Accounts and data

Each person signs in with their email and a one-time code. Their workouts, templates, calendar, Pokémon, steps, and badges are stored in Supabase under their account, protected by row-level security so nobody can read anyone else's data. The app also keeps a copy on the device, so it opens instantly, works offline at the gym, and syncs when it's back online.

## Set up (one time)

**1. Create the database (Supabase)**
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. Go to **Authentication → Emails → Templates** and add the code to **both** the **Confirm signup** template (first sign-in) and the **Magic Link** template (every sign-in after), for example the line `Your PokéLift code: {{ .Token }}`. Home-screen apps on iPhone can't receive links from Mail, so people sign in by typing the code.
4. Go to **Authentication → URL Configuration**, set **Site URL** to your Vercel address (e.g. `https://poke-lift.vercel.app`), and add the same address plus `/app/` (e.g. `https://poke-lift.vercel.app/app/`) to **Redirect URLs**. If this is left at the default `http://localhost:3000`, the link in the email sends people to a broken page.
5. Go to **Project Settings → API** and copy the **Project URL** and the **anon / publishable key**.

**2. Deploy (Vercel)**
1. In Vercel: **Add New → Project**, import this repo.
2. Under **Environment Variables**, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the values from step 1.5. (If you connect Vercel's Supabase integration instead, its variable names work too.)
3. Click **Deploy**. Changing environment variables later needs a redeploy to take effect.
4. Open `/app/` in Safari on your iPhone and tap **Share → Add to Home Screen**. (The site root is the marketing homepage; an installed app that opens at `/` is sent on to `/app/`.)

The anon key is meant to be public; row-level security is what keeps each person's data private. Never put the `service_role` key in Vercel for this app.

Without the two environment variables, the app still builds and runs, but in on-device mode: no sign-in, and data stays in that one browser.

## Develop

```sh
npm run build        # writes public/app/index.html from src/ and data/
npx serve public     # preview locally
```

- `public/index.html` – the marketing homepage (static; its buttons go to `/app/`, which shows sign-in when logged out). Images are in `public/img/`.
- `src/logic.js` – XP, leveling, evolution, workout math, PRs, gyms, battle engine (Gen 3 rules)
- `src/store.js` – state, per-user local cache, Supabase sign-in and sync (or Claude account storage when run as a claude.ai artifact)
- `supabase/schema.sql` – tables and row-level security
- `src/ui1.js` – home, calendar, templates, exercises, history, settings
- `src/ui2.js` – workout logger, finish flow, editing past workouts, level-up prompts
- `src/ui3.js` – team, Pokédex, walking and step sync, gyms, battles, app shell
- `data/game-data.json` – 151 species and their moves (FireRed/LeafGreen), generated by `scripts/build-data.py` from PokéAPI's CSV data
