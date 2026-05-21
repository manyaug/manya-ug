# MANYA APP — Android Backend Developer Handoff

## Executive Summary

This document tells you exactly what to build, why, and how it connects to the Manya web app running inside your Android WebView.

**Your job:** Replace the web app's Supabase + IndexedDB backend with native Android SQLite, while keeping the same function contract so the web app never needs to change its internal code.

---

## How Big Apps Do This (The Industry Standard)

Apps like **Duolingo**, **Khan Academy**, and **Notion** all follow the same pattern for offline-first mobile:

```
┌────────────────────────────────────────────────────────┐
│  1. AUTH (Online)                                       │
│     → Verify credentials against cloud server          │
│     → Get JWT token → store in Android Keystore        │
│     → Pull all user data → seed local SQLite           │
│     → App is now offline-ready                         │
├────────────────────────────────────────────────────────┤
│  2. ALL OPERATIONS (Offline-First)                     │
│     → Read/Write goes to LOCAL SQLite instantly         │
│     → UI updates immediately (Optimistic UI)           │
│     → Background WorkManager syncs to cloud            │
├────────────────────────────────────────────────────────┤
│  3. SYNC ENGINE (Background)                           │
│     → Reads "sync_queue" table (the outbox)            │
│     → When online: replays pending writes to Supabase  │
│     → Marks items as synced=1 when done                │
└────────────────────────────────────────────────────────┘
```

**Key insight:** The UI should never wait for the network. Everything reads from local SQLite. The cloud just receives a copy later.

---

## The JavaScript Bridge Contract

The web app checks for `window.ManyaBackend` at startup. If it exists, all data calls go to Android instead of Supabase. If it doesn't exist, the web app falls back to Supabase (for web browser use).

You implement this object in your `WebAppInterface` Kotlin class, annotate methods with `@JavascriptInterface`, and register it with:

```kotlin
webView.addJavascriptInterface(ManyaBackendBridge(this, db), "ManyaBackend")
```

### Full Contract Signature

```javascript
window.ManyaBackend = {

  // ── AUTH ──────────────────────────────────────────────────────────────────
  auth: {
    // Sign up a new user (ONLINE ONLY — calls Supabase Auth)
    signUp(email, password, metadata)  → Promise<{ uid: string, email: string }>

    // Sign in (ONLINE ONLY — calls Supabase Auth)
    // On success: store JWT + uid, then call seedFromCloud
    signIn(email, password)            → Promise<{ uid: string, email: string }>

    // Sign out — clear JWT from Keystore, clear uid from SharedPreferences
    signOut()                          → Promise<void>

    // Return active session or null (no network call — reads from Keystore/SharedPreferences)
    getSession()                       → Promise<{ uid: string, email: string } | null>

    // Update password (ONLINE ONLY — calls Supabase Auth)
    updatePassword(newPassword)        → Promise<void>

    // Send reset email (ONLINE ONLY — calls Supabase Auth)
    resetPasswordForEmail(email)       → Promise<void>
  },

  // ── DATABASE ──────────────────────────────────────────────────────────────
  db: {
    // SELECT * FROM table WHERE [query.filters] LIMIT [query.limit] ORDER BY [query.orderBy]
    // Returns: array of rows | single row (if query.single=true) | null (if query.single='maybe')
    get(table, query)                  → Promise<row[] | row | null>

    // INSERT INTO table (payload columns) VALUES (payload values)
    // Returns: inserted row with its new id
    insert(table, payload)             → Promise<row>

    // INSERT OR REPLACE (upsert based on conflictCol or primary key)
    // Returns: array of affected rows
    upsert(table, payload, options)    → Promise<row[]>

    // UPDATE table SET [patchObj] WHERE id = id
    // Returns: updated row
    patch(table, id, patchObj)         → Promise<row>

    // DELETE FROM table WHERE id = id
    delete(table, id)                  → Promise<void>

    // DELETE all rows from table (used for question cache clearing)
    deleteAll(table)                   → Promise<void>

    // INSERT many rows at once (bulk caching of questions)
    bulkUpsert(table, rows, options)   → Promise<void>
  },

  // ── FILES / ASSETS ────────────────────────────────────────────────────────
  files: {
    // Read and parse a JSON file from internal storage / assets
    // path examples: "curriculum-master.json", "content/math/algebra/questions.json"
    readJson(path)                     → Promise<object>

    // Read a text file (HTML story content)
    readText(path)                     → Promise<string>

    // Return a usable URL/URI for the WebView to load (images, audio, HTML)
    // Example return: "file:///android_asset/content/audio/sfx/tap.mp3"
    getAssetUrl(path)                  → string

    // Write JSON to internal storage (used for curriculum updates)
    writeJson(path, data)              → Promise<void>
  },

  // ── KEY-VALUE STORE ───────────────────────────────────────────────────────
  kv: {
    // Backed by SharedPreferences or a kv_store SQLite table
    get(key)                           → string | null
    set(key, value)                    → void
    remove(key)                        → void
    clear()                            → void
  }
}
```

### Critical Keys in KV Store

| Key | Value | Purpose |
|---|---|---|
| `manya_session_id` | `"user-uuid-here"` | Current logged-in user's UID |
| `manya_audio_settings` | `'{"volume":0.5,"isMuted":false}'` | Audio preferences |
| `manya_quest_progress_math` | JSON string | Math quest node completion map |
| `manya_quest_progress_science` | JSON string | Science quest node completion map |
| `manya_quest_progress_english` | JSON string | English quest node completion map |
| `manya_quest_progress_sst` | JSON string | SST quest node completion map |
| `manya_wrong_qs_math` | JSON string | Wrong answer tracking for retry logic |
| `manya_just_finished` | JSON string | Triggers completion animations |

---

## SQLite Database Schema

Create all these tables in your Room database. Field types in SQLite syntax.

### `users` — The active student profile

```sql
CREATE TABLE users (
  uid TEXT PRIMARY KEY,
  email TEXT,
  nickname TEXT,
  full_name TEXT,
  avatar_seed TEXT DEFAULT 'Manya',
  diamonds INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  math_gems INTEGER DEFAULT 0,
  science_gems INTEGER DEFAULT 0,
  english_gems INTEGER DEFAULT 0,
  sst_gems INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_at TEXT,
  onboarded INTEGER DEFAULT 0,
  unlocked_badges TEXT DEFAULT '["gen_01"]',  -- JSON array of badge IDs
  vault_artifacts TEXT DEFAULT '[]',           -- JSON array of artifact objects
  pending_badge_celebrations TEXT DEFAULT '[]',
  is_pro INTEGER DEFAULT 0,
  learning_type TEXT DEFAULT 'ADAPTIVE',
  stats_quests_completed INTEGER DEFAULT 0,
  stats_perfect_answers INTEGER DEFAULT 0,
  stats_hints_used INTEGER DEFAULT 0,
  stats_explanations_viewed INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'dark',
  preferences TEXT DEFAULT '{"likes":[],"hates":[]}',  -- JSON
  parent TEXT DEFAULT '{"name":"","whatsapp":""}',      -- JSON
  created_at TEXT,
  -- Correct answer counters (for badge logic)
  math_correct INTEGER DEFAULT 0,
  science_correct INTEGER DEFAULT 0,
  english_correct INTEGER DEFAULT 0,
  sst_correct INTEGER DEFAULT 0
);
```

### `questions` — Cached question bank (offline MCQs)

```sql
CREATE TABLE questions (
  qid TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT,
  subtopic TEXT,
  data TEXT  -- full question JSON blob
);
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_subject_topic ON questions(subject, topic);
```

### `sync_logs` — Outbox queue (writes to flush when online)

```sql
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,       -- 'ANSWER' | 'PROFILE' | 'PROGRESS' | 'MASTERY' | 'VAULT' | etc.
  data TEXT NOT NULL,       -- JSON payload to replay to Supabase
  timestamp TEXT NOT NULL,
  synced INTEGER DEFAULT 0  -- 0=pending, 1=synced
);
```

### `answers` — Local answer history (analytics)

```sql
CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  question_id TEXT,
  is_correct INTEGER,
  selected_answer TEXT,
  correct_answer TEXT,
  time_spent_ms INTEGER,
  hint_used INTEGER DEFAULT 0,
  answered_at TEXT
);
CREATE INDEX idx_answers_subject ON answers(subject);
```

### `concept_mastery` — Per-concept spaced repetition state

```sql
CREATE TABLE concept_mastery (
  id TEXT PRIMARY KEY,                        -- format: "subject::baseId"
  subject TEXT NOT NULL,
  base_id TEXT NOT NULL,
  mastery_level TEXT DEFAULT 'new',           -- 'new'|'learning'|'ready_for_v2'|'ready_for_v3'|'mastered'|'struggling_v1'|'struggling_v2'|'struggling_v3'
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  correct_streak INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX idx_concept_mastery_subject ON concept_mastery(subject);
```

### `achievements` — Unlocked badges

```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_id TEXT NOT NULL,
  earned_at TEXT
);
```

### `badges` — Same as achievements, keyed by badge string ID

```sql
CREATE TABLE badges (
  id TEXT PRIMARY KEY,   -- badge_type e.g. 'gen_01', 'math_hero'
  badge_name TEXT,
  earned_at TEXT,
  user_id TEXT
);
```

### `user_chests` — Loot chest inventory

```sql
CREATE TABLE user_chests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  chest_type TEXT,        -- 'bronze'|'silver'|'gold'|'diamond'|'wood'
  opened INTEGER DEFAULT 0,
  opened_at TEXT,
  created_at TEXT
);
CREATE INDEX idx_chests_user ON user_chests(user_id, opened);
```

### `daily_challenges` — Challenge definitions (seeded from Supabase on install)

```sql
CREATE TABLE daily_challenges (
  id TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  challenge_type TEXT,    -- 'CORRECT_ANSWERS' | 'MATH_CORRECT' | 'SCIENCE_CORRECT' | 'STREAK_DAYS' | etc.
  target_value INTEGER,
  description TEXT,
  reward_value INTEGER,
  subject TEXT DEFAULT 'all'
);
CREATE INDEX idx_challenges_day ON daily_challenges(day_number);
```

### `user_challenges` — Per-user challenge progress

```sql
CREATE TABLE user_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  last_updated_at TEXT
);
CREATE INDEX idx_user_challenges_user ON user_challenges(user_id, challenge_id);
```

### `power_ups` — Power-up inventory

```sql
CREATE TABLE power_ups (
  id TEXT PRIMARY KEY,
  type TEXT,
  count INTEGER DEFAULT 0
);
```

### Supabase-only tables (NO local SQLite copy needed)

These only exist in Supabase. They are written locally then synced — NOT read back:

| Table | What it stores |
|---|---|
| `user_answers` | Full answer telemetry (write-only from app) |
| `user_sessions` | Session metadata (write-only) |
| `emotional_metrics` | Frustration/focus scores (write-only) |
| `user_transactions` | Currency ledger (write-only) |
| `concept_error_tracking` | Error count per subtopic (write-only) |

For these, on Android: **write to SQLite `sync_logs` outbox → sync to Supabase when online**.

### Supabase-only (CLOUD — read from cloud, mirror to SQLite)

| Table | SQLite equivalent | When to sync |
|---|---|---|
| `profiles` | `users` table | On login, on profile update |
| `quest_progress` | Use KV store (manya_quest_progress_*) | On login |
| `user_vault` | Part of `users.vault_artifacts` JSON | On login |
| `user_balances` | Part of `users` (diamonds/coins/gems) | On login, on purchase |
| `badges` | `badges` table | On login |
| `user_chests` | `user_chests` table | On login |
| `concept_mastery` | `concept_mastery` table | On login, after each answer |

---

## File / Content System

The web app requests content files using these path patterns through `ManyaBackend.files.readJson(path)`:

| Path | What it contains | When requested |
|---|---|---|
| `curriculum-master.json` | Full curriculum tree (subjects → units → quests) | App startup |
| `content/math/.../questions.json` | MCQ question pool for a topic | Before each quest |
| `content/english/.../story.html` | Story HTML for a quest lesson | During EXPLORE node |
| `content/science/.../sim.html` | Interactive simulation HTML | During EXPLORE/PRACTICE |
| `content/audio/sfx/tap.mp3` | Sound effects | On UI interaction |

### Content Delivery Options (Pick one):

**Option A — Bundled in APK Assets (Recommended for v1)**
- Bundle all content files in `app/src/main/assets/content/`
- `ManyaBackend.files.readJson(path)` reads from `assets/content/{path}`
- Updates require a new APK release, but app works 100% offline
- Good for controlled school environments

**Option B — Downloadable Content Packs**
- On first run: download content from CDN into internal storage
- `ManyaBackend.files.readJson(path)` reads from `getFilesDir()/content/{path}`
- Curriculum can update without an app release
- Requires download management and progress UI

**Option C — Hybrid (Best for production)**
- Bundle core curriculum in assets
- Check for content updates on launch (if online)
- Download updated files into internal storage
- Fall back to bundled assets if update fails

---

## The Login Flow (Step-by-Step)

```
User opens app
      │
      ▼
ManyaBackend.auth.getSession()
      │
  ┌───┴───────────────────────────────────┐
  │ Session exists?                        │
  │   YES → go to app (offline-ready)     │
  │   NO  → show login screen             │
  └───────────────────────────────────────┘
      │ (User taps Login)
      ▼
ManyaBackend.auth.signIn(email, password)
  → Calls Supabase Auth REST API (online)
  → On success:
      ├─ Store JWT in Android Keystore
      ├─ Store uid in SharedPreferences  
      ├─ Store uid in KV: kv.set('manya_session_id', uid)
      └─ Call seedFromCloud(uid)
            ├─ Pull profile → save to users SQLite table
            ├─ Pull quest_progress → save to KV store
            ├─ Pull vault → save to users.vault_artifacts
            ├─ Pull badges → save to badges SQLite table
            ├─ Pull chests → save to user_chests SQLite table
            ├─ Pull balances → update users table
            └─ Pull concept_mastery → save to concept_mastery table
      ▼
  App loads. All data is in SQLite. Device can go offline.
```

---

## The Background Sync Flow

Implement using Android **WorkManager** with a `PeriodicWorkRequest` (every 15 minutes when charging, or on any network state change):

```kotlin
// Pseudocode — implement in Kotlin
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        if (!isOnline()) return Result.retry()
        
        val pendingItems = db.syncLogsDao().getPending()  // synced = 0
        
        for (item in pendingItems) {
            try {
                when (item.type) {
                    "ANSWER"   -> supabase.from("user_answers").insert(item.data)
                    "PROFILE"  -> supabase.from("profiles").upsert(item.data)
                    "PROGRESS" -> supabase.from("quest_progress").upsert(item.data)
                    "VAULT"    -> supabase.from("user_vault").upsert(item.data)
                    "BADGE"    -> supabase.from("badges").upsert(item.data)
                    "MASTERY"  -> supabase.from("concept_mastery").upsert(item.data)
                    "SESSION"  -> supabase.from("user_sessions").insert(item.data)
                    "EMOTION"  -> supabase.from("emotional_metrics").insert(item.data)
                    "BALANCE"  -> /* update user_balances and user_transactions */
                }
                db.syncLogsDao().markSynced(item.id)
            } catch (e: Exception) {
                // Leave as pending — will retry next cycle
            }
        }
        return Result.success()
    }
}
```

---

## What the Web App Does vs What Android Does

| Responsibility | Web App (JavaScript) | Android (Kotlin) |
|---|---|---|
| UI / screens / animations | ✅ Handles everything | ❌ Does not touch |
| Game logic (scoring, mastery) | ✅ Runs in WebView | ❌ Does not touch |
| Adaptive engine | ✅ Runs in WebView | ❌ Does not touch |
| Read/write data | ✅ Calls `window.ManyaBackend.*` | ✅ Implements `window.ManyaBackend.*` |
| SQLite database | ❌ Does not touch | ✅ Owns and manages |
| Auth (login/signup) | ✅ Calls `ManyaBackend.auth.*` | ✅ Calls Supabase Auth API |
| Sync to cloud | ✅ Queues via sync_logs | ✅ Replays from sync_logs to Supabase |
| File content serving | ✅ Calls `ManyaBackend.files.*` | ✅ Reads from assets/internal storage |
| Audio playback | ✅ Uses WebView Audio API | ✅ Serves file URLs via `getAssetUrl()` |

---

## Files in `src/backend/` — The Ones You Replace

This folder is the boundary between the web frontend and your Android backend.

```
src/backend/
├── index.js                    ← Barrel export (do not modify)
│
├── auth/
│   └── authService.js          ← Reads ManyaBackend.auth.* | Replace auth calls
│
├── db/
│   └── manyaDB.js              ← IndexedDB impl | Android: ignore, use SQLite via bridge
│
├── storage/
│   ├── storageFacade.js        ← THE CENTRAL ROUTER ← do not modify, it auto-detects Android
│   ├── storageService.js       ← KV store | Android: reads ManyaBackend.kv.*
│   └── errorMapper.js          ← Error normalization (no changes needed)
│
├── sync/
│   └── syncService.js          ← All push/pull → routes through storageFacade automatically
│
├── services/
│   ├── rewardService.js        ← Chest operations → routes through storageFacade
│   └── telemetryService.js     ← Brain data → routes through storageFacade
│
├── audio/
│   └── audioService.js         ← Audio loading → uses ManyaBackend.files.getAssetUrl()
│
└── remote/
    └── supabaseClient.js       ← Supabase SDK (auth only) | Android: implement via Kotlin SDK
```

### Files You DO NOT Touch

Everything outside `src/backend/` is pure frontend:
- `src/components/` — UI components
- `src/views/` — Screens and pages
- `src/engines/` — Game/learning engines
- `src/domain/` — Business logic (scoring, mastery, rewards)
- `src/store/` — Redux state
- `src/services/adaptiveEngine.js` — AI question selection

---

## Rankings / Leaderboard

The `syncService.pullRankings()` function calls a Supabase RPC (`get_manya_rankings`). This requires an internet connection.

**Android recommendation:**
- Show rankings only when online
- Display "Leaderboard requires internet" when offline
- Cache the last-fetched rankings for display (store as JSON in KV or a `rankings_cache` SQLite table)

---

## Quick Implementation Checklist

```
□ Create WebView Activity / Fragment
□ Enable JavaScript in WebView settings
□ Create ManyaBackendBridge Kotlin class with @JavascriptInterface methods
□ Register bridge: webView.addJavascriptInterface(bridge, "ManyaBackend")
□ Implement auth.* → Supabase Kotlin SDK (GoTrue client)
□ Create Room database with all tables from schema above
□ Implement db.get() with query parsing (filters, limit, orderBy, single)
□ Implement db.insert(), db.upsert(), db.patch(), db.delete()
□ Implement kv.get/set/remove/clear → SharedPreferences
□ Implement files.readJson/readText → AssetManager or FileInputStream
□ Implement files.getAssetUrl() → return "file:///android_asset/..." URLs
□ Bundle content files in assets/content/ directory
□ Implement seedFromCloud(uid) → pull from Supabase → write to SQLite
□ Implement SyncWorker with WorkManager → replay sync_logs to Supabase
□ Store JWT in Android Keystore (not SharedPreferences — security!)
□ Handle network state changes → trigger sync
□ Test: Login online → airplane mode → all features work
```

---

## Important Notes

1. **All `db.*` methods must return Promises** — the web app uses `await` on everything. In your Kotlin `@JavascriptInterface` method, use `evaluateJavascript()` to resolve the Promise once your async operation completes.

2. **JSON serialization** — All data crossing the bridge must be serialized as JSON strings. Parse on the Kotlin side with `Gson` or `kotlinx.serialization`.

3. **Thread safety** — `@JavascriptInterface` methods are called on a background thread by default. All your Room DAO calls should use coroutines. Use `GlobalScope.launch` or return callbacks carefully.

4. **The `single` query param** — When `query.single = true`, return a single object (not array). When `query.single = 'maybe'`, return a single object or `null` (never throw if not found).

5. **The `uid` filter** — When query filters contain `uid`, map it to `user_id` in your SQL: `WHERE user_id = ?`.

6. **Operator filters** — Filters like `"subject:ilike"` mean `WHERE subject LIKE ? COLLATE NOCASE`. The `ilike` prefix means case-insensitive match.

---

*Built by the Manya Engineering Team — Backend contract version 1.0*
*Web app can be updated freely without changing this contract.*
