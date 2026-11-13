# Kvízy pro partu

Česká webová aplikace: katalog online kvízů, ve kterém parta rychle najde kvíz podle nálady. Next.js 16 + TypeScript + Tailwind + shadcn/ui, sdílená databáze Postgres (na Vercelu Neon, lokálně PGlite v paměti).

```bash
npm install
npx playwright install chromium firefox
npm run dev        # http://localhost:4387
npm run check      # lint, typecheck, unit testy, E2E testy
```

Podrobnosti pro agenty i lidi jsou v [`../AGENTS.md`](../AGENTS.md). Plán je v [`docs/plan.md`](docs/plan.md), protokol ověření počátečního katalogu v [`docs/catalog-verification.md`](docs/catalog-verification.md).

## Nasazení na Vercel (Hobby) s databází Neon

Repozitář je připravený: `vercel.json` (region Frankfurt, build jen při změně v `kvizy/`), migrace a 63 kvízů se do databáze nahrají samy při buildu. Jediná ruční proměnná je volitelný `KVIZY_ADMIN_TOKEN` pro správu hlášení (viz níže).

1. **Import projektu**
   1. Přihlas se na [vercel.com](https://vercel.com) přes GitHub (plán Hobby).
   2. **Add New… → Project**. V seznamu **Import Git Repository** najdi `Atannn0/CI` a klikni **Import**. Pokud tam není, klikni **Adjust GitHub App Permissions** (nebo **Install**), povol Vercelu přístup k repozitáři `CI` a vrať se.
   3. Na obrazovce **Configure Project** u **Root Directory** klikni **Edit**, vyber složku `kvizy` a potvrď **Continue**. **Framework Preset** se přepne na **Next.js**.
   4. **Build and Output Settings** ani **Environment Variables** neměň. Klikni **Deploy**.
   5. První build doběhne (v logu `migrate: nothing to do (no DATABASE_URL)`), ale web zatím ukáže „Katalog se teď nepodařilo načíst“, protože chybí databáze. To je v pořádku.
2. **Databáze Neon přes Storage**
   1. V projektu otevři záložku **Storage** → **Create Database** (nebo **Connect Database**) → v sekci **Marketplace Database Providers** vyber **Neon** → **Continue**.
   2. Při instalaci zvol **Create New Neon Account** (pokud se Vercel zeptá), region **Europe (Frankfurt) – aws-eu-central-1**, plán **Free**, jméno databáze třeba `kvizy`. Volitelné služby (Auth, Realtime) nech vypnuté. Potvrď **Create** / **Continue**.
   3. V dialogu **Connect Project** vyber projekt `kvizy`, nech zaškrtnutá prostředí **Development, Preview, Production**, **Create database branch for deployment** nech nezaškrtnuté, **Custom Prefix** nech prázdný. Klikni **Connect**.
   4. Kontrola: **Settings → Environment Variables** teď obsahuje `DATABASE_URL` a `DATABASE_URL_UNPOOLED` (a další `PG*`/`POSTGRES_*`). Nic dalšího nepřidávej.
3. **Redeploy**
   1. Záložka **Deployments** → u posledního nasazení menu **⋯** → **Redeploy** → **Redeploy**. (Skript ignorovaného buildu redeploy stejného commitu vždy postaví; zaškrtávátko **Use project's Ignore Build Step** může zůstat.)
   2. V **Build Logs** musí být `migrate: applied 001_create_quizzes.sql` … `migrate: applied 004_seed_requested_tests.sql` (u existující databáze jen migrace, které ještě neproběhly).

### Ověření živého webu
- Otevři produkční adresu z **Domains** (např. `https://kvizy-….vercel.app`): domovská stránka ukáže „Všechny kvízy 63 kvízů“.
- `https://<doména>/api/quizzes` vrátí JSON s 63 kvízy (31 `cs`, 32 `en`).
- Přidej testovací kvíz (**Přidat kvíz**), obnov stránku a otevři web v jiném prohlížeči nebo na mobilu: kvíz najdeš hledáním.
- Klikni na **Otevřít kvíz**: otevře se nová záložka a po obnovení je kvíz v sekci **Populární kvízy**.
- Zkus přidat stejný odkaz znovu: formulář ho odmítne.
- Po dalším automatickém commitu vaultu se v **Deployments** objeví nasazení ve stavu **Canceled** s hláškou `No changes in kvizy/ …: skipping the build.`
- Data v Neonu: **Storage → kvizy → Open in Neon** → **SQL Editor** → `select count(*) from quizzes;`

### Správa hlášení (jen pro správce)
Návštěvníci mohou na kartě kliknout na **Nahlásit kvíz**. Hlášení (ID kvízu, důvod, poznámka, čas) se uloží do tabulky `quiz_reports`; kvíz se tím neskryje ani nesmaže. Obsah hlášení vidí jen správce:

1. Vygeneruj tajný klíč (aspoň 24 znaků), např. `openssl rand -base64 32`.
2. Ve Vercelu **Settings → Environment Variables → Add**: Key `KVIZY_ADMIN_TOKEN`, Value = klíč, prostředí **Production** (případně i **Preview**), **Sensitive** zapnuté → **Save**.
3. **Deployments → ⋯ → Redeploy** (proměnná se projeví až v novém nasazení).
4. Otevři `https://<doména>/spravce`, vlož klíč a klikni **Zobrazit hlášení**. Nebo: `curl -H "Authorization: Bearer <klíč>" https://<doména>/api/admin/reports`.

Bez proměnné (nebo s klíčem kratším než 24 znaků) je `/api/admin/reports` zavřený a vrací 404; se špatným klíčem 401. Pokusy jsou omezené na 20 za minutu z jedné IP.

### Poznámky
- Plán Hobby má limit 100 nasazení denně a zrušené (ignorované) buildy se do něj počítají. Pokud Obsidian Git pushuje velmi často, nastav v Obsidianu **Settings → Obsidian Git → Auto commit-and-sync interval** aspoň na 15 minut.
- Preview nasazení (větve z pull requestů) používají stejnou databázi jako produkce a jsou chráněná přihlášením do Vercelu. Migrace jsou jen aditivní, takže to produkci nerozbije.
- Bez `DATABASE_URL` na Vercelu aplikace záměrně selže s chybovou stránkou, místo aby tiše ukládala data do dočasné paměti.

## Import jednotlivých kvízů

- `npm run import:quizzes` spouští import z `data/individual-quizzes.json` do lokálního PGlite v adresáři `.quiz-import-db`. Každé spuštění vypíše podle zdroje a jazyka počty vložených a již existujících kvízů.
- Pro lokální prohlídku importu spusťte `npm run dev` s proměnnou `QUIZ_LOCAL_DB_PATH=.quiz-import-db` a bez nastavené `DATABASE_URL` i `POSTGRES_URL`. Zastavte vývojový server před dalším importem do stejného adresáře. Bez `QUIZ_LOCAL_DB_PATH` používá vývojový server původní databázi v paměti.
- Pro import do sdíleného testovacího Postgresu nastavte `QUIZ_IMPORT_DATABASE_URL` na jeho připojení. Import tuto proměnnou čte výslovně. Web pak čte stejnou databázi přes své běžné `DATABASE_URL`.
- Import pracuje s přímými odkazy v manifestu. Při opakování zachová identifikátory, kliknutí a hlášení. Po importu testů IDRlabs se jeho rozcestník skryje v katalogu a zůstane dostupný ve správě existujících hlášení.
