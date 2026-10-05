# NEHAN Game Specification

> Development-facing specification for AI-assisted implementation.
> Last updated: 2026-10-04
> Status labels used in this document:
> - **CONFIRMED**: User-approved current specification. Implement as written unless a newer explicit instruction overrides it.
> - **UNRESOLVED**: Not yet decided. Do not invent behavior. Add `TODO(要確認)` or isolate behind configurable data.
> - **PROPOSAL**: Design candidate only. Never treat as canonical without approval.

---

## 0. Purpose of this document

This file is the implementation-oriented source document for the game **NEHAN**.

When an AI or developer works from this file:

1. Preserve all **CONFIRMED** behavior.
2. Do not silently decide **UNRESOLVED** items.
3. Prefer data-driven definitions over hard-coded per-item logic.
4. Separate gameplay-spec changes from refactors.
5. When code behavior and this specification conflict, report the mismatch before changing unrelated systems.
6. Use the exact terminology in this document. In particular, use **Module / モジュール**, not the old term 「チップ」.

Reference planning sheet:
https://docs.google.com/spreadsheets/d/109Q_KxYdV34u6QKEwuKKaAsLVUtmP3Oj-kri_1hE4E4/edit

---

# 1. Game overview

## 1.1 Core concept — CONFIRMED

**NEHAN** is a Japanese cyberpunk roguelike centered on exploration of **中央街 NEHAN**.

The player creates a character, chooses branching routes through the city/labyrinth, resolves combat and events, acquires equipment and combat Memories, strengthens them with Modules, and attempts to descend farther before the character dies.

The game is **not a deckbuilder**.

The central combat identity is:

- one weapon
- exactly four equipped Memories
- reusable Memory actions controlled by CT
- Memory corruption/breakage through repeated use
- route planning with limited future visibility
- character loss on death, while selected Memory assets can be inherited

## 1.2 Design pillars — CONFIRMED

- The player should make meaningful decisions from a very small combat loadout.
- Memories are persistent executable techniques/data, not shuffled cards.
- Repeated Memory use creates cumulative wear through repeated use.
- Death removes the current character.
- Some progress survives through recovered Memories and persistent rewards.
- There is no character level system.
- Stat growth should matter because stats directly influence Memory performance.

---

# 2. Home / meta-game structure

## 2.1 Main home menu — CONFIRMED

The home screen contains:

1. **PLAY**
2. **INVENTORY**
3. **SHOP**
4. **ARCHIVE**
5. **LOST LOG**
6. **SETTINGS**

## 2.2 PLAY — CONFIRMED

- The player can maintain up to **3 character slots**.
- A slot may contain an active character or be empty.
- From PLAY, the user can:
  - continue with an existing character
  - create a new character in an empty slot

### UNRESOLVED

- Whether all 3 slots are unlocked from the start.
- Exact deletion/abandonment rules for a living character.
- Additional creation options beyond the confirmed initial loadout below.

## 2.3 INVENTORY — CONFIRMED AT HIGH LEVEL

Inventory is the persistent asset-management screen.

Primary managed asset types:

- Memories
- Modules
- recovered/persistent items related to those systems

Character selection itself belongs under PLAY, not INVENTORY.

### UNRESOLVED

- Exact storage capacity.
- Sorting/filtering rules.
- Unequipped weapons are stored in character inventory.weapons (see confirmed MAP node addendum).
- Whether a recovered Memory must be assigned immediately to a new character or may remain in persistent storage.

## 2.4 SHOP — CONFIRMED AS MENU / UNRESOLVED IN DETAIL

The SHOP exists as a home-level menu.

### UNRESOLVED

- Currency name.
- What the shop sells.
- Whether it sells Memories, Modules, rerolls, repair services, unlocks, character-slot upgrades, or other content.

## 2.5 ARCHIVE — CONFIRMED AS MENU

ARCHIVE exists as a home-level menu.

### UNRESOLVED

Exact archive categories are not yet locked. Potential contents may include discovered Memories, Modules, weapons, enemies, events, lore, and terminology, but these are not yet canonical.

## 2.6 LOST LOG — CONFIRMED AS MENU

LOST LOG exists as a home-level menu for records related to lost/dead characters.

### UNRESOLVED

Exact saved fields are not yet locked.

Potential fields include:

- character name
- occupation
- deepest point reached
- death cause
- weapon
- recovered Memory

Treat these as proposal-level until explicitly confirmed.

## 2.7 SETTINGS — CONFIRMED AS MENU

A normal settings entry exists. Exact options are implementation-level and may include audio, display, controls, data, and language.

---

# 3. Character system

## 3.1 Character lifecycle — CONFIRMED

- A character is created at the start of that character's run/lifecycle.
- A character has **no level**.
- When the character dies, that character is **lost/removed**.
- The next attempt uses a newly created character.

## 3.2 Core stats — CONFIRMED

The four character stats are:

| Japanese | Internal abbreviation | Meaning / primary design role |
|---|---:|---|
| 体力 | VIT | durability / survivability |
| 腕力 | STR | physical power |
| 器用さ | DEX | precision / handling / speed-related scaling |
| 頭脳 | INT | computation / hacking / Memory-related scaling |

Only the stat names are fully confirmed. Exact derived-stat formulas are still unresolved unless separately specified below.

## 3.3 Equipment slots — CONFIRMED

Each character has:

- **Weapon ×1**
- **Memory ×4**

## 3.4 Occupation / class — CONFIRMED

The initial occupation is **賞金稼ぎ** (`JOB_BOUNTY_HUNTER`), a balanced class.

| Stat | Starting value |
|---|---:|
| VIT | 6 |
| STR | 8 |
| DEX | 7 |
| INT | 5 |

- Primary ability: **STR**.
- Secondary ability: **DEX**.
- Unique ability: **武器習熟** (`WEAPON_MASTERY`).
- Ability effect: **すべての武器種を装備できる。**
- Occupations are static JobDefinitions with structured weapon-access rules. `canEquipWeapon()` is the single access check; do not branch on display names.
- Additional occupations and their balance are **UNRESOLVED**.

## 3.4.1 Creation and initial loadout — CONFIRMED

A single garage screen contains four equal selection rows: **名前 / 職業 / 武器 / メモリ**. Each opens an independent editor; creation is not a sequential wizard. No large title is shown. Frames, icons, values and arrows are HTML/CSS UI over a background-only garage asset.

- Name: maximum 16 characters; a blank value becomes **名無し**.
- Select one occupation, exactly **Weapon ×1**, and exactly **Memory ×4**.
- A `createDraft` stores the selected values for its empty slot. Editing and returning to PLAY retain that draft; they do not create a CharacterState in `slots`.
- Only the lower-right creation button validates and commits the character, then starts `newRun()` and opens MAP. The button is disabled until the selected occupation, compatible weapon and four distinct valid Memory IDs are present.
- Initial Memory definitions are M001 破砕, M002 速断, M003 応急修復, M004 防壁展開. They default to all four selected. Selecting a Memory already in another slot swaps the two positions without creating duplicates.
- Each selected Memory generates an independent `{definitionId,currentCT:0,breakageRate:0,broken:false,modules:[]}` instance. Static definitions never store those mutable fields. Each instance also has a unique `instanceId`, canonical rarity, and rarity-based `moduleSlots`.
- Current duplicate policy: duplicates are prohibited. The final duplicate-equipment rule remains **UNRESOLVED** (`TODO(要確認)`).
- New CharacterState stores `jobId`, a copy of the occupation's `stats`, and independent `weapon` / `memories` instances. Existing `c.stats`, `c.weapon`, `c.memories` access remains compatible with MAP, Combat and Inventory.
- **Current implementation HP remains 42/42.** A derived VIT-to-HP formula is **UNRESOLVED**; do not invent one.
- WeaponDefinition is separate from character creation and carries `id`, `name`, `weaponType`, `basePower`, `mainStat`, `hit`, `hitCount`, `rarity`. The current selectable catalog uses the existing 鉄管ブレード (W001, base power 9, hit 90%, STR, 1 HIT). Its `BLADE` type is an implementation category, not a finalized taxonomy. Its rarity is COMMON (1 Module slot). The example 打刀 does not establish a new production weapon.
- Weapon scaling reads `weapon.mainStat` (fallback STR) through the existing `calcScaled()` formula. Current selectable weapons use one hit; per-hit multi-hit resolution remains **UNRESOLVED**.
- The draft and completed characters use the existing `nehan_alpha_v1` storage key. Legacy characters preserve HP, stats, weapon performance, Memory CT/breakage/broken state and installed Modules. Missing `jobId` becomes LEGACY (職業未設定), missing weapon `mainStat` becomes STR, `hitCount` becomes 1, and `weaponType` becomes LEGACY. Do not clear storage or replace legacy stats with the new occupation stats.
- Mobile screen has no page scrolling, respects safe areas and 44px minimum action targets. The name editor fits the existing visualViewport handling while the software keyboard is shown.

## 3.5 Character stat growth — PARTIALLY CONFIRMED

- There is **no level-up system**.
- Stat growth is intended to be important during progression.
- **Modules are a major source of stat growth/customization.**

### UNRESOLVED

Whether there will be additional formal stat-growth systems beyond Modules.

A previously discussed idea was temporary/run-specific body modification, but it is **not yet confirmed** and must not be implemented as canonical without approval.

---

# 4. Map / exploration

## 4.1 Branching structure — CONFIRMED

At each progression point, the player selects between **left or right** routes.

Moving to the selected node triggers that node's event/content.

## 4.2 Foresight — CONFIRMED

The player can see **2 steps ahead**.

From the current position:

- first step: 2 possible nodes
- second step: each of those may branch again
- maximum visible future nodes: **4**

The intent is to allow route planning and risk/reward decisions.

## 4.3 Node categories — PARTIALLY CONFIRMED

Battle, Garage and Scrap are implemented and confirmed in the 2026-10-05 addendum below. Other candidate node types remain proposals:

- 戦闘
- 強敵
- 探索
- 闇市
- 休息
- 改造
- 不明
- ボス

These are not all formally confirmed yet. Keep node type definitions data-driven.

## 4.4 Run structure — UNRESOLVED

Not yet decided:

- number of nodes per area
- number of areas per run
- boss cadence
- map generation rules
- whether backtracking is allowed
- exact node appearance probabilities
- whether the map is regenerated per character/run

---

# 5. Combat system

## 5.1 Turn order — CONFIRMED

- Combat begins with the **player turn**.
- The enemy's **next intended action is displayed** to the player.

## 5.2 Player action set — CONFIRMED

During the player's turn, the actionable combat set is built from:

- Weapon normal attack
- Memory slot 1
- Memory slot 2
- Memory slot 3
- Memory slot 4

A Memory is usable only when its current CT allows use (normally CT = 0).

## 5.3 Execution types — CONFIRMED

There are exactly two Memory/action execution types:

### 標準実行 (Standard Execution)

- Resolve the action.
- The player's turn ends after the action.

### 即時実行 (Immediate Execution)

- Resolve the action.
- The player's turn does **not** end.
- The player may continue using other available Immediate Execution actions.
- There is no separate fixed chain-count limit.
- The practical limit comes from action availability and CT.

## 5.4 Turn end — CONFIRMED WITH ONE OPEN EDGE CASE

The player's turn ends when:

- a **標準実行** action is used, or
- there are no remaining usable actions because relevant actions are unavailable / in CT.

### UNRESOLVED

The weapon normal attack is confirmed as a selectable action, but whether the weapon attack is formally classified as **標準実行** has not yet been explicitly locked.

Do not hard-code this relationship unless approved. Prefer a data/config field such as `executionType` for weapon actions as well.

## 5.5 Enemy intent — CONFIRMED

Before the enemy acts, show the action the enemy intends to perform next.

### UNRESOLVED

- UI format of intent.
- Whether exact damage numbers are shown or only action type/icon.
- Whether some enemies can hide/change intent.

---

# 6. Memory system

## 6.1 Core identity — CONFIRMED

A Memory is a reusable combat technique/programmed memory.

It is not a consumable card and is not part of a shuffled deck.

A character equips exactly **4 Memories**.

## 6.2 Memory categories — CONFIRMED BASELINE

Primary categories:

- 攻撃
- 回復
- 防御
- 回避
- バフ
- デバフ

Additional categories may be added later but are not yet confirmed.

## 6.3 Memory rarity — CONFIRMED

Five rarity levels:

1. コモン
2. アンコモン
3. レア
4. エピック
5. レジェンダリー

Recommended internal enum:

```ts
COMMON
UNCOMMON
RARE
EPIC
LEGENDARY
```

Display labels must use the Japanese terms above unless localization is introduced.

## 6.4 CT — CONFIRMED

Every Memory has a CT value.

When a Memory is used, it enters its CT state according to that Memory's CT definition.

At the **start of the player's turn**, reduce the current CT of **all equipped Memories by 1**, to a minimum of 0.

Example for CT 3:

```text
use -> 3
next player turn -> 2
next player turn -> 1
next player turn -> 0 (usable)
```

## 6.5 Breakage / corruption model — CONFIRMED (2026-10-05)

`breakageRate` is cumulative wear from 0 to 100, not a failure probability.
There is no Memory-specific fixed deterioration value.

On each valid Memory use:

1. resolve the effect normally (including the existing hit check for attacks)
2. set the existing CT
3. add a random **0.0 to 3.0 percentage points** to `breakageRate`, capped at 100
4. if the result is 100, set `broken=true`; future uses are prohibited

There is no random breakage check. The use that reaches 100 still resolves before
wear is applied. A miss is still a use and accumulates wear. Attempts while cooling,
broken, or while an action is pending do not accumulate wear or consume a turn.
Both Standard and Immediate Execution use the same wear range. Stored wear uses
precision matching the UI (two decimal places).

## 6.6 Broken Memory behavior — CONFIRMED

- A broken Memory remains as an item with its installed Modules and instance data.
- It cannot be executed. Long-press inspection and Storage movement remain available.
- Loading preserves legacy wear and already-broken states; it does not repair them.
- A saved Memory at 100% is marked broken even if an old save omitted the flag.
- Repair availability/cost and future wear-reduction effects remain unresolved.

## 6.7 Memory effect display — CONFIRMED

For offensive Memories, display at least:

1. formula
2. currently calculated result/damage
3. hit rate

Example display:

```text
【10 × (1 + √STR × 0.12) + DEX補正】
敵に【XX】ダメージを与える。
命中率 100%
```

## 6.8 Damage scaling baseline — CONFIRMED AS THE CURRENT BASE SHAPE

Current baseline formula shape:

```text
Damage = BasePower × (1 + √MainStat × 0.12) + SubStatCorrection
```

Example:

```text
10 × (1 + √STR × 0.12) + DEX補正
```

Design intent:

- the main stat increases output
- main-stat scaling is nonlinear due to square root
- increasing the main stat has diminishing marginal returns
- this allows stats to rise aggressively without damage growing linearly at the same rate

### UNRESOLVED

The exact form of `SubStatCorrection` is not decided.

Do **not** assume it is simply `+DEX` or `DEX × fixedCoefficient`.

Potential uses for the secondary stat may eventually include:

- additive damage correction
- threshold bonuses
- hit rate correction
- CT-related correction
- other Memory-specific behavior

These are design options, not confirmed defaults.

## 6.9 Hit rate — CONFIRMED AS A DISPLAYED PROPERTY / FORMULA UNRESOLVED

A Memory may have hit rate lower than 100%.

Hit rate must be displayed to the player.

### UNRESOLVED

There is no single universal hit-rate formula yet.

For example, a high-power STR Memory could have damage based only on STR while DEX affects hit rate, but this is not yet a globally confirmed formula.

Implementation recommendation:

```ts
memory.baseHitRate
memory.hitScaling
memory.damageScaling
```

should be separable data rather than forcing damage and accuracy to share the same formula.

---

# 7. Module system

## 7.1 Terminology — CONFIRMED

The correct name is **モジュール / Module**.

Do not use the previous term 「チップ」 in new implementation, UI, data, comments, or documentation except when migrating old data.

## 7.2 Role — CONFIRMED AT HIGH LEVEL

Modules are a major customization and stat-growth system.

Because characters do not have levels, Modules are intended to be an important way to increase or modify stats and build performance.

Examples previously discussed include very small numerical adjustments such as attack/stat bonuses, but final value ranges are not locked.

## 7.3 Installation relationship — CONFIRMED

Modules can be installed into/associated with a Memory such that the installed Module state is part of that Memory's persistent instance data.

When that Memory is recovered after character death, its installed Modules are inherited with it.

## 7.4 Module details — PARTIALLY CONFIRMED

Rarity-based slots (1–5), weapon/Memory installation, destructive overwrite without removal, generated instance effects, VIT/STR/DEX/INT/MAX_HP and item-local BASE_POWER flat/percent effects are confirmed in the 2026-10-04 addenda below.

Not yet decided:
- whether duplicate Modules can be installed
- Module rarity structure
- exact stat value ranges
- whether Modules can modify CT
- whether Modules can modify cumulative-wear increase
- whether Modules can alter execution type

Do not hard-code assumptions here.

---

# 8. Weapon system

## 8.1 Confirmed

- One weapon slot per character.
- The weapon provides a **normal attack** selectable during combat.

## 8.2 Unresolved

- weapon categories
- weapon damage formulas
- weapon stat scaling
- whether weapon attacks use hit rate
- whether weapon attacks have CT
- whether normal attack is formally Standard Execution
- durability/breakage
- additional weapon modifications beyond the confirmed Module system
- rarity distribution for additional weapons

Keep the weapon action system compatible with the same generic action-resolution pipeline when possible.

---

# 9. Death, loss, and inheritance

## 9.1 Character loss — CONFIRMED

When a character dies:

- the character is lost/removed
- progression with that character ends
- the player starts again with a new character when using an empty/new character slot

## 9.2 Progress-based death reward — PARTIALLY CONFIRMED

On death, the player receives a persistent reward based on how far the character progressed.

### UNRESOLVED

- reward currency name
- formula
- exact reward sources

Previously considered names include coin/token/junk/scrap-like concepts, but none is canonical yet.

## 9.3 Memory recovery — CONFIRMED

After death, the player can recover Memory data from the dead character and make it available to a later/new character.

## 9.4 Memory instance persistence — CONFIRMED

A recovered Memory keeps its instance state.

The recovered Memory carries forward:

- Memory identity
- current cumulative breakage rate
- installed Modules

Recovery does **not** reset cumulative breakage rate.

Conceptually, treat this as one persistent Memory instance object rather than generating a fresh copy from the base Memory definition.

Recommended structure:

```ts
type MemoryInstance = {
  instanceId: string;
  definitionId: string;
  breakageRate: number;
  installedModules: ModuleInstance[];
  brokenState?: unknown;
};
```

The exact schema above is an implementation recommendation, not a required language/API shape.

## 9.5 Recovery rules — UNRESOLVED

Not yet decided:

- how many Memories can be recovered from a dead character
- whether recovery is player-selected or random
- whether already-broken Memories can always be recovered
- whether recovery has a cost
- whether unrecovered Memories are permanently deleted

---

# 10. Events

## 10.1 Event role — CONFIRMED AT HIGH LEVEL

Exploration nodes can trigger non-combat events and choices.

Character stats may be used for event checks.

Examples of stat fantasy:

- STR: force / breaking / physical intervention
- DEX: precision / delicate operations / traversal
- INT: hacking / terminal interaction / analysis

## 10.2 Event examples — PROPOSAL ONLY

Current planning examples include:

- 壊れた自販機
- 違法メモリ屋
- 電脳鳥居
- 記憶の死体

Do not treat these examples as locked release content.

## 10.3 Event check system — UNRESOLVED

- check formula
- visible success probability
- critical success/failure
- event flags
- long-term consequences

---

# 11. Status effects

Status-effect infrastructure is planned, but the actual status system is currently **UNRESOLVED**.

Do not invent official status effects yet.

The system should be data-driven enough to support future effects on:

- actor stats
- damage
- hit rate
- action availability
- CT
- breakage interaction

without requiring per-status combat-loop rewrites.

---

# 12. Persistent data model expectations

## 12.1 Important distinction: definition vs instance

Use separate concepts for static definitions and mutable player-owned instances.

### Static definition examples

```ts
JobDefinition
MemoryDefinition
ModuleDefinition
WeaponDefinition
EnemyDefinition
EventDefinition
```

### Runtime / persistent instance examples

```ts
CharacterState
MemoryInstance
ModuleInstance
WeaponInstance
RunState
ProfileState
```

This distinction is especially important because a Memory's cumulative breakage rate and installed Modules survive across characters when recovered.

## 12.2 Suggested Memory definition fields

The planning sheet currently tracks these conceptual fields:

```text
ID
Name
Category
CT
ExecutionType
BreakageRate / initial-state handling
Formula
EffectText
HitRate
BrokenEffect
ReferencedStats
Rarity
ImplementationStatus
Notes
```

Some of these fields may eventually be split into structured objects rather than stored as display text.

## 12.3 Recommended formula representation

Do not make display strings the authoritative combat logic.

Prefer structured formula/config data, with display text generated from it.

Example concept:

```ts
{
  basePower: 10,
  damageScaling: {
    mainStat: "STR",
    mainMode: "sqrt",
    mainCoefficient: 0.12,
    subStat: "DEX",
    subMode: "TBD"
  },
  hit: {
    baseRate: 100,
    scaling: null
  }
}
```

This allows the game to display:

```text
【10 × (1 + √STR × 0.12) + DEX補正】
敵に【24】ダメージを与える。
命中率 100%
```

while resolving the actual number from character state.

---

# 13. Core combat pseudocode

The following pseudocode expresses the currently confirmed flow while keeping unresolved details explicit.

```ts
function startCombat(player, enemy) {
  enemy.intent = enemy.chooseNextIntent();
  beginPlayerTurn();
}

function beginPlayerTurn() {
  for (const memory of player.equippedMemories) {
    memory.currentCT = Math.max(0, memory.currentCT - 1);
  }

  refreshAvailableActions();
}

function useMemory(memory) {
  if (memory.currentCT > 0 || memory.broken || memory.breakageRate >= 100) return invalidAction();

  resolveMemoryEffect(memory);

  memory.currentCT = memory.definition.ct;

  memory.breakageRate = Math.min(100, memory.breakageRate + randomRange(0.0, 3.0));
  if (memory.breakageRate >= 100) memory.broken = true;

  if (memory.definition.executionType === "STANDARD") {
    endPlayerTurn();
    return;
  }

  // IMMEDIATE: player retains control.
  refreshAvailableActions();

  if (!hasAnyUsableAction()) {
    endPlayerTurn();
  }
}

function endPlayerTurn() {
  resolveEnemyIntent(enemy.intent);
  if (combatEnded()) return;

  enemy.intent = enemy.chooseNextIntent();
  beginPlayerTurn();
}
```

### Implementation warning

The `randomRange(0.0, 3.0)` statement means a **0.0 to 3.0 percentage-point** increase to cumulative breakage rate per use, not multiplication by 0.0–3.0.

Choose and document numerical representation consistently, e.g.:

- `5.3` meaning 5.3%, or
- `0.053` meaning 5.3%

Do not mix the two.

---

# 14. Current user flow

```text
HOME
 |
 +-- PLAY
 |    |
 |    +-- Character Slot 1
 |    +-- Character Slot 2
 |    +-- Character Slot 3
 |          |
 |          +-- Continue OR Create
 |                  |
 |                  v
 |              Explore NEHAN
 |                  |
 |              Choose L/R route
 |                  |
 |          Combat / Event / Other Node
 |                  |
 |          Acquire/modify build assets
 |                  |
 |          Continue deeper OR die
 |                  |
 |               [DEATH]
 |                  |
 |          Character is deleted/lost
 |          Progress reward granted
 |          Memory recovery occurs
 |          recovered Memory retains:
 |            - cumulative breakage rate
 |            - installed Modules
 |
 +-- INVENTORY
 +-- SHOP
 +-- ARCHIVE
 +-- LOST LOG
 +-- SETTINGS
```

---

# 15. Explicit invariants for development AI

The following rules must not be changed incidentally during implementation:

1. **No character level system.**
2. **Exactly 4 equipped Memory slots.**
3. **Exactly 1 weapon slot.**
4. **Memory CT decreases by 1 at the start of the player's turn.**
5. **Execution types are 標準実行 and 即時実行.**
6. **標準実行 ends the player's turn.**
7. **即時実行 does not end the turn and can chain without a separate fixed count cap.**
8. **Combat begins with the player.**
9. **Enemy next action is displayed.**
10. **Memory tracks cumulative breakage rate from 0 to 100, not a failure probability.**
11. **No Memory-specific fixed deterioration value.**
12. **Each Memory use increases cumulative breakage rate by a random 0.0–3.0 percentage points.**
13. **Resolve the effect, then accumulate wear; reaching 100 makes future uses unavailable.**
14. **Broken Memories remain but cannot be executed.**
15. **A dead character is lost.**
16. **Recovered Memory retains cumulative breakage rate.**
17. **Recovered Memory retains installed Modules.**
18. **Use the term Module / モジュール, not チップ.**
19. **The game is not a shuffle/deck-draw card game.**
20. **Do not promote proposal/TODO content to confirmed behavior without an explicit spec update.**

---

# 16. Open decisions / TODO(要確認)

These should remain visible in issues/code comments/spec tasks rather than being silently resolved:

## Combat

- Is weapon normal attack always 標準実行?
- Exact weapon damage formula.
- Defense/evasion resolution.
- Enemy damage formula.
- Hit-rate global conventions.

## Memory

- Secondary-stat correction formula.
- Repair system.
- Whether cumulative breakage rate can decrease.
- Full Memory catalog.

## Module

- Duplicate rules beyond preserving individually owned instances.
- Rarity.
- Exact stat-growth scale.

## Character

- Additional occupations/classes beyond 賞金稼ぎ.
- VIT-to-maximum-HP formula.
- Additional starting weapons and finalized weapon rarity/type taxonomy.
- Final duplicate-Memory equipment rule.
- Additional stat-growth methods besides Modules.

## Death / persistence

- Number of recoverable Memories.
- Recovery selection/randomness.
- Persistent reward currency name.
- Persistent reward calculation.

## Map

- Node type finalization.
- Area/run length.
- Boss cadence.
- Generation algorithm.

## Meta

- Shop inventory/services.
- Archive contents.
- Lost Log fields.
- Character slot unlock rules.

---

# 17. Recommended implementation order

This is an implementation recommendation based on dependency order, not a new gameplay specification.

1. Character state model (VIT / STR / DEX / INT, weapon slot, 4 Memory slots)
2. Generic action + execution-type model
3. Player/enemy turn loop
4. Memory CT
5. Enemy intent display data
6. Memory damage/hit calculation pipeline
7. Cumulative wear pipeline
8. Module instance attachment to Memory instance
9. Map branch model + 2-step foresight
10. Death / character loss
11. Persistent Memory recovery
12. Home character slots and Inventory
13. Persistent reward / Shop after currency rules are decided
14. Events, enemies, statuses, Archive, Lost Log content

---

# 18. Change-management rule

When implementing future user instructions:

- update this specification first or in the same commit as behavior changes
- mark newly confirmed rules as CONFIRMED
- keep incomplete decisions as UNRESOLVED
- do not remove historical TODOs unless the new instruction resolves them
- if a new request contradicts this document, the newer explicit user instruction wins, but the contradiction should be reflected in the specification immediately


## 追加確定仕様：戦利品・所持メモリ・Module — CONFIRMED (2026-10-04)

- 敵撃破ごとに戦利品を1個生成する。MEMORY 20%、MODULE 80%。`combat → loot → map` の順に進み、回収前の戦利品を `state.run.loot` に保存する。リロードでは再抽選せず、回収は1回のみ。
- 各 EnemyDefinition の `memoryPool` は装備・使用していたメモリ候補。9体それぞれの候補は各EnemyDefinitionの `memoryPool` に定義する。AIの実際のメモリ使用は今回追加しない。
- Module は `MODULES` から抽選する。将来の敵別 `modulePool` にも対応。レア度の抽選ルールは追加せず、各定義の既存レア度を引き継ぐ。
- `c.memories` は装備中の4個。未装備メモリは `c.inventory.memories`、未使用Moduleは `c.inventory.modules` に保存する。同じメモリ定義の複数個体を所持でき、`instanceId` で区別する。
- 武器・メモリ個体は `instanceId / rarity / moduleSlots / modules` を持つ。COMMON=1、UNCOMMON=2、RARE=3、EPIC=4、LEGENDARY=5スロット。初期鉄管ブレードはCOMMON、1スロット。
- Module個体は `instanceId / definitionId / rarity / generatedDepth / effectCount / effects[]` を保持する。静的定義は `id / name / rarity / allowedEffects / preferredTargets / legacyEffects` とし、生成ルールと個体性能を分離する。
- 筋力増幅回路（MOD001）と違法筋繊維（MOD002）の既存COMMONレア度を維持する。旧固定効果（STR +10% / DEX -5、STR +5 / DEX -5%）は旧セーブ補完専用とし、新規個体の効果は生成時に確定する。
- 武器・装備メモリ・所持メモリの空きスロットにはINSTALL、使用中スロットにはOVERWRITEが可能。確認後、未使用Moduleの同じ個体を対象スロットへ移動して保存する。単独取り外しは禁止。上書きされた旧Moduleは消失し、Inventoryへ戻らない。
- `c.stats` は基礎値として変更しない。`getEffectiveStats(c)` は装備武器と装備メモリのModuleだけを集計し、`max(0, round((base + flat合計) × (1 + percent合計 / 100)))` を計算する。未装備アイテムは補正対象外。
- 旧固定効果の例：基礎STR20/DEX20、装備武器に筋力増幅回路、装備破砕に違法筋繊維 → STR28、DEX14。新規個体は保存済みのeffectsで計算する。基礎HP42の仕様は維持し、MAX_HP Moduleによる実効最大HPを別途計算する。
- INVENTORYはEQUIPPED / STORAGE MEMORIES / STORAGE MODULESを表示し、基礎値→補正値、容量、装着Moduleを確認できる。一覧内部のみスクロールし、下部HOMEと画面全体は固定する。
- 保存キー `nehan_alpha_v1` を維持する。旧アイテムは欠落していたID・レア度・容量・配列を補完する。既存HP、基礎ステータス、CT、破損状態、装着済みModuleは削除しない。未定義の旧Moduleは表示・保持し、未知の効果を推測して適用しない。
- 死亡後のMemory回収は後述の消費型Memory Salvageとして実装済み。倉庫上限、追加レアドロップ分布、命中率・CT・破損率のModule補正は未実装・未確定。


## 追加確定仕様：Character / Equipment — CONFIRMED (2026-10-04)

- Module容量はレア度から1〜5に決定する。COMMON 1 / UNCOMMON 2 / RARE 3 / EPIC 4 / LEGENDARY 5。武器と全Memory個体に適用し、`normalizeItem()` は既存 `modules[]` を維持して容量だけ再計算する。回収前のMemory戦利品にも適用する。
- MAP・Combatの名前＋HP枠（`#playerDetails`）はタップで管理画面へ進む。既存長押し簡易ステータス表示は維持する。
- 管理画面では名前・職業・HP/MAX HP・VIT/STR/DEX/INTの基礎値→補正値、武器1個と装備Memory4個を表示する。`getEffectiveStats()` と装備詳細描画はHome Inventoryと共用する。
- 武器詳細は名前・レア度・武器種・POWER・MAIN STAT・HIT・HIT COUNT・装着Moduleを表示する。Memory詳細は名前・レア度・カテゴリ・実行種別・basePower/main/hit・CT・破損率・BROKEN・説明・装着Moduleを表示する。
- Module枠は最大5個を ■/□ で表示する。MAPで□を押すと未使用Module一覧を開き、既存不可逆Install確認へ進む。単独取り外しは不可。使用中スロットからは個体詳細と不可逆OVERWRITE確認を開く。
- MAPで装備Memory詳細のCHANGEからStorage個体を選び、装備中個体と所持個体を交換する。`instanceId / rarity / modules / currentCT / breakageRate / broken` はそのまま移動し、定義だけを変更しない。装備数は必ず4個。
- 個体がStorageへ移った時点でそのModule補正は除外され、新たに装備した個体のModuleだけを集計する。`c.stats` は変更しない。
- Combatでは詳細・Module確認だけ可能。Memory CHANGE・Module Install・Module Overwriteを無効にし、共通mutation関数も拒否する。Home Inventoryからも進行中Combatキャラクターへの変更は不可。別キャラクターへの変更は進行中の戦闘に影響しない。
- 管理画面を開いても戦闘タイマーを停止・変更しない。背景の戦闘が解決した場合、閉じると現在のHPとフェーズへ戻る。
- 保存キー・ドロップ20/80・不可逆Install・補正式・基本ダメージ式・CT・破損仕様を維持する。管理画面はsafe-areaを考慮し、内部一覧だけスクロールする。


## 追加確定仕様：生成Module・最大HP・装着先威力・Overwrite — CONFIRMED (2026-10-04)

- 敵撃破ドロップ率はMEMORY 20% / MODULE 80%を維持する。Module生成には撃破した時点の深度を渡し、次のMAP深度を使わない。生成された性能を戦利品と一緒に保存し、load時には再抽選しない。
- Module Instanceの `effects[]` は `{target, mode, value}`。targetはVIT / STR / DEX / INT / MAX_HP / BASE_POWER、modeはflat / percent。全対象について正負の生成候補を持つ。新規個体は最低1・最大4効果で、同じtargetを重複生成しない。先頭効果は正、後続効果は負にもなり得る。
- キャラクター能力とMAX_HPは装備武器＋装備中4MemoryのModuleだけを集計する。Storage Memoryは対象外。計算順は基礎値→flat合計→percent合計→四捨五入。能力は最低0、実効最大HPは最低1。`c.stats` と `c.maxHp` は基礎値として維持する。
- `getEffectiveMaxHp(c)` をHP表示、回復上限、新Run開始の全回復に使用する。Install / Overwrite / Memory交換で実効最大HPが下がった場合だけ現在HPを上限へ制限する。最大HPが増えても現在HPは増やさない。
- BASE_POWERはそのModuleが付いている武器またはMemoryだけへ適用する。他アイテムへ波及しない。武器・Memoryは `getEffectiveBasePower(item)` と既存能力スケーリングを使用し、基本ダメージ式、CT、破損率、STANDARD / INSTANT、敵AI、行動タイミングは変更しない。
- 装着済みModuleは `slotIndex`（0始まり）を保持する。`modules[]` の配列順ではなくslotIndexでSLOT 1〜5を指定する。容量は従来どおりレア度により1〜5。空きスロットへはINSTALL、使用中スロットへは旧個体IDを再検証してOVERWRITEする共通ロジックを通す。
- OVERWRITEは旧Moduleの完全消失と未使用新Moduleの消費を伴う。単独REMOVE / UNINSTALL / EXTRACT、旧Moduleの回収、空スロットへの復元は実装しない。Combat中はInstallとOverwriteの両方を共通処理でも拒否する。
- UIは実際のInstance効果、レア度、取得深度、各SLOTの内容を表示する。使用中SLOTの詳細からOVERWRITEへ進める。確認で旧個体と新個体の効果、消失・不可逆の警告を表示する。Character / Equipment詳細は能力と基礎攻撃力の基礎値→実効値、現在HP / 実効最大HPを表示する。
- 旧詰め配列の装着Moduleは順にslotIndex 0、1…へ割り当てる。既に明示されたslotIndexと個体は維持する。Instanceにeffectsがない旧Moduleは `legacyEffects` を一度複製して保存する。旧 `stat` キーはtargetへ変換する。取得深度不明はnull / 未記録とし、推測して生成し直さない。未知定義の旧個体も消さず保持する。

### 深度生成：現行実装パラメータ（最終バランスはTODO / 要確認）

数値スケールは `1 + min(60, max(0, depth)) × 0.03`、上限2.8。各効果の生成値は基本乱数幅×スケールを四捨五入し、絶対値最低1とする。負効果は倍率0.55。基本幅は能力flat 3〜6、MAX_HP flat 6〜12、BASE_POWER flat 1〜3、percent共通6〜12。後続効果の負効果確率は `min(0.35, 0.15 + min(60, depth) × 0.003)`。定義のpreferredTargetsは抽選重み2、それ以外は1。Module自体の既存レア度は変更しない。

| 取得深度 | 効果数の重み |
| --- | --- |
| 0〜4 | 1個85% / 2個15% |
| 5〜9 | 1個35% / 2個65% |
| 10〜19 | 2個65% / 3個35% |
| 20〜29 | 2個25% / 3個45% / 4個30% |
| 30以上 | 3個35% / 4個65% |

// TODO(要確認): 生成値の範囲・深度スケール上限・効果数と負効果の抽選重みの最終バランス。

// TODO(要確認): Module補正後BASE_POWERの正式な最低値。現行は入力値を最低0とし、既存calcScaledの最低ダメージ1を維持する。


## Module Install専用画面 — CONFIRMED (2026-10-05)

- `openModuleInstall()` は工房背景 `assets/module-install-bg.webp` を使う全画面UIを開く。9:16キャンバスをsafe-area内で中央配置し、背景864×1536を切らず表示する。画面全体はスクロールせず、未使用Module一覧だけを内部スクロールにする。
- 下部は装備武器＋4Memoryの5アイコン固定。名前、Module使用数／容量、選択状態を表示する。装着先→Slot→未使用Module→確認の順で操作し、空きSlotはINSTALL、使用中SlotはOVERWRITE。
- 中央詳細はアイテムのレア度、武器種またはMemoryカテゴリ・実行種別、基礎攻撃力→実効値、命中、参照能力、ヒット数またはCT・破損状態とSlot一覧を表示する。確認時には実際のModule個体効果・取得深度と上書きによる旧個体消失を表示する。
- Inventoryから利用でき、Character / Equipmentの空きSlotおよび装着済みModule詳細のOVERWRITEからも同じ専用画面へ入る。所持Memoryへの装着は専用画面内の選択欄から継続利用できる。
- 画面の選択状態は一時的なUI状態。既存Runや保存形式は変更しない。Install / Overwriteは既存共通関数を通し、単独取り外し禁止、Slot上限、戦闘中変更禁止、装備中だけの補正を維持する。確定後も工房画面に留まり、残りModuleを装着できる。戻ると元のInventoryまたはCharacter / Equipmentへ復帰する。


## MAPノード：戦闘・ガレージ・スクラップ — CONFIRMED (2026-10-05)

- Nodeは `{id, side, type, enemyId?, future:[Node, Node]}`。typeはbattle / garage / scrap。Futureは文字列ではなく個体IDとtype（戦闘ならenemyId）を持つ予告。選択後の次MAPは選択したNodeのfutureを左右の選択肢として引き継ぐ。予告は進行操作を行わず種類だけを表示する。
- `NODE_DEFINITIONS` に日本語名・画像素材の切り出し座標・入場処理を登録する。MAP背景と六角形位置は維持し、ノード内は添付素材の画像のみを表示する。旧SVG・文字ラベルと戦闘の敵名は表示しない。日本語名はaria-labelと長押し詳細に保持する。画像座標の詳細は `docs/MAP_NODE_ART.md` を参照。現行 `NODE_WEIGHTS` はbattle 60 / garage 20 / scrap 20。左右と新しい予告は独立抽選し、同じ種類の2択も許可する。
- Battleは従来のCombatと敵撃破Loot（MEMORY 20% / MODULE 80%）を維持する。撃破時にはLootを保存してphase=lootへ移行し、回収するまでDepthを増やさない。Winsは撃破時に一度加算する。
- Garageはphase=garage。修復で `getEffectiveMaxHp(c)` までHP全回復して次MAPへ進む。立ち去る場合もノードを消費して次MAPへ進むがHPは変えない。CT、破損率、BROKEN、Module、装備、SHIELDは変更しない。Homeへ戻ってもphaseを保持し、PLAYから未完了Garageへ復帰する。
- Scrapはphase=scrap。入場時に `generateScrapLoot(depth)` で一個生成して `run.scrapLoot` を保存し、表示・reloadで再抽選しない。`SCRAP_DROP` はWEAPON 0.5 / MEMORY 0.5、MODULEは含まない。WEAPONS / MEMORIESから定義を抽選し、Instance化してから深度別rarityを設定する。
- Weapon Instanceは定義のid・性能をコピーし、instanceId / rarity / moduleSlots / modules / generatedDepthを保持する。Memoryは既存 `createMemoryInstance()` を利用する。Slot数はCOMMON 1 / UNCOMMON 2 / RARE 3 / EPIC 4 / LEGENDARY 5。
- `inventory:{weapons:[], memories:[], modules:[]}`。Scrap回収品はそれぞれStorageへ追加し、自動装備しない。Inventory WEAPONSタブ、Character / EquipmentのSTORAGE、工房画面の所持装備選択から確認・Module装着ができる。装着画面内の装備変更からStorage武器個体と交換できる。Storage武器のModuleは装備していないためキャラクター能力へ反映しない。
- `advanceDepth()` はLoot回収、Garage修復／立ち去り、Scrap回収の完了後に一度だけDepthを増やす。phaseとownerIdを確認し、完了後はmapへ移行して選択Nodeと未回収Lootを削除する。最深部 `c.depth` は完了Depthの最大値。踏破数 `c.wins` は従来どおり敵撃破数であり、Garage/Scrapでは増やさない。
- 保存キーを維持。旧routeの欠落typeはbattle、旧Future敵名文字列はbattle Nodeへ変換する。`inventory.weapons` がなければ空配列を補完する。旧mainの回収待ちLootは既にDepth増加済みのため、`lootDepthAdvanced=true`で追加加算を避ける。新規Lootはfalseを保存する。Garage phase、Scrap phase、scrapLoot、予告Node、Storage Weapon個体を保存する。
- GarageとScrapは既存工房背景を流用した別画面。9:16固定・safe-area・全体スクロールなし。Module工房・Combat・Character作成画面の構成を変更しない。

### Scrapレア度：現行実装パラメータ（最終バランスはTODO / 要確認）

| 深度 | COMMON | UNCOMMON | RARE | EPIC | LEGENDARY |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 85% | 12% | 2.5% | 0.4% | 0.1% |
| 10 | 55% | 28% | 13% | 3.5% | 0.5% |
| 20 | 25% | 30% | 30% | 13% | 2% |
| 30 | 12% | 20% | 33% | 28% | 7% |
| 50以上 | 5% | 10% | 25% | 38% | 22% |

`rollItemRarity()` は表の深度間を線形補間して重み付き抽選する。レア度のみを変え、武器・Memoryの基礎性能は変更しない。極浅層にも高レア、深層にもCOMMONの可能性を残す。

// TODO(要確認): Node確率、Scrap Weapon/Memory比率、深度別レア度重みの最終バランス。

// TODO(要確認): EVENT / BLACK_MARKET / BOSS / REST / ELITEの個別仕様は今回追加しない。

## モジュール装着画面への統合 — CONFIRMED (2026-10-04)

- モジュール選択・装着画面は可読性を優先した通常のシステムフォントを使用する。ピクセルフォントは使用しない。
- MAP・Combatの名前＋HP枠をタップすると、旧Character / Equipment一覧を経由せず専用モジュール装着画面へ直接進む。Home Inventoryの装備項目も同じ画面を開く。
- 独立した旧武器・Memory詳細ページおよび装備管理オーバーレイは廃止。装着先の情報とSlotは装着画面内で確認する。未選択時は名前・職業・HP・基礎→実効能力を表示する。
- 武器・Memory交換は装着画面の装備アイコン選択時の「装備変更」から利用できる。中央一覧を所持個体一覧へ切り替え、別画面や交換専用オーバーレイは作らない。個体情報を保持する共通処理を使用する。
- 戦闘中もこの画面を開いて確認可能。Install・Overwrite・Memory交換は無効。既存の戦闘タイマーは継続する。
- 戻ると元のMAP・Combat・Inventoryへ復帰し、現在のHP・装備を反映する。保存形式、補正式、Install / Overwriteの共通処理は変更しない。
- この節の導線・画面構成は上記旧Character / Equipment画面に関する記述を置き換える。

## 全画面フォント — CONFIRMED (2026-10-05)

ピクセルフォントは使用しない。全画面・オーバーレイのUIは通常のシステムフォントを使用する。
美咲フォントの読み込みと代替指定を削除する。背景・アイコンのピクセル画は維持する。

## 9体の敵・派閥別戦術 — CONFIRMED (2026-10-05)

黒系ピクセルアートの透過WebPを戦闘画面の既存enemy-figureへ表示する。文字は通常フォントを維持する。

| 色 | 敵 | 技（行動順） | 方針 |
|---|---|---|---|
| 青 | 侵蝕警備員 | 制圧警棒 → 防盾展開 → 警戒姿勢 | 防御 |
| 黄 | 黄角の賞金稼ぎ | 居合射撃 → 刀受け → 賞金狩り | 均衡 |
| 赤 | 般若組の剣客 | 紅蓮斬り → 追い突き → 逆袈裟 → 納刀構え | 攻撃 |
| 青 | 重装鎮圧官 | 重装防壁 → 盾撃 → 再防御 | 防御 |
| 青 | 電脳監察官 | 封鎖障壁 → 電磁制圧 → 保安再配置 | 防御 |
| 黄 | 廃鉄の物漁り | 廃鉄刺突 → 拾得装甲 → 鉤槍破砕 | 均衡 |
| 黄 | 渡りの銃士 | 抜き撃ち → 間合い制御 → 二連射 | 均衡 |
| 赤 | 解体処刑人 | 解体斬り → 装甲断ち → 処刑落とし | 攻撃 |
| 赤 | 路地の鉄牙 | 連打 → 鉄牙打ち → 頭砕き → 追撃 | 攻撃 |

- 青は3行動中2回防御。重装鎮圧官と電脳監察官は攻撃に小さな追加防御を伴う。
- 黄は攻撃・防御・強攻撃または連射の3行動。赤は3/4以上の行動が攻撃。
- 技は各EnemyDefinitionのmovesとpatternに定義する。行動順は固定サイクルで、次の技・ダメージ・防御量を予告する。詳細は右上の行動アイコン長押しで確認できる。
- 通常/強攻撃のダメージは既存atk + floor(depth / 2) + 強攻撃4を維持し、技のdamageBonusを加える。
- GUARDはguardPower + depth。盾撃などのguardGainは指定量のみ加算する。
- 二連射/連打は既存ダメージ合計を2/3発へ整数分配する。合計威力をヒット数倍しない。被ダメージのポップアップは合計を表示する。
- 装甲断ちは各ヒットの50%（切り捨て）をSHIELD貫通し、残りに通常のSHIELD軽減を適用する。
- 敵画像の点滅/ダメージポップアップ、750ms→650msの解決間隔、プレイヤーのCT/破損仕様、Memory20%/Module80%は維持する。
- E01/E02/E03のIDと旧名の予告データを継承する。旧進行中戦闘のHP・GUARD・turn・pendingAction・現在のintentは保持し、以後の予告は新しい技を使う。
- MAPには敵の名前を表示しない。既存の深度と左右差による敵選択に9体すべてが参加する。
- TODO(要確認): 9体のHP/攻撃/防御量と出現深度の最終バランス。今回の値は初期実装値。


## 全画面ホーム・同一画面内装備変更 — CONFIRMED (2026-10-05)

- ホームは端末全幅・全高へ背景を表示し、9:16固定による上下余白を作らない。添付画像を参考に生成した白黒の縦長都市背景を使い、タイトルと操作UIはHTMLで重ねる。
- 下方の白枠・黒背景メニューは左右スワイプで選択し、タップで開く。マウスドラッグ・左右キーにも対応。
- 装着画面内で装備武器・Memoryを選び「装備変更」を押すと、中央一覧から所持武器・Memoryを選んで交換する。同じ画面に留まり、装備変更直後にModule装着を続けられる。
- 武器は1個、Memoryは4個を維持し、個体全体をStorageと入れ替える。武器の装備制限はcanEquipWeapon()を使用し、旧職業未設定キャラクターは従来どおり全武器を扱える。
- 装備変更による補正は装備中個体だけを集計。最大HP減少時のみ現在HPをclampし、増加時の自動回復はしない。戦闘中は交換およびModule Install/Overwriteを禁止。保存形式・ドロップ率・戦闘計算式は維持。


## 新規Memory M005～M013 — CONFIRMED (2026-10-05)

既存M001～M004の定義、初期4Memory、基本ダメージ式、破損仕様は維持する。新規定義は既存の作成時選択とScrap抽選へ自動参加する。敵memoryPool・敵AI・20% MEMORY / 80% MODULEは変更しない。

| ID | 名前 | カテゴリ | rarity | execution | CT | 効果 |
|---|---|---|---|---|---|---|
| M005 | 一閃演算 | 攻撃 | RARE | STANDARD | 5 | POWER 22 / STR / HIT 95% / 1 HIT |
| M006 | 双牙 | 攻撃 | UNCOMMON | STANDARD | 2 | POWER 8 / DEX / HIT 85% / 2 HIT |
| M007 | 乱杭 | 攻撃 | RARE | STANDARD | 3 | POWER 5 / DEX / HIT 45% / 5 HIT |
| M008 | 筋束励起 | バフ | UNCOMMON | INSTANT | 4 | STR +25% / 2 TURN |
| M009 | 照準同期 | バフ | RARE | INSTANT | 4 | DEX +20%・HIT +15pt / 2 TURN |
| M010 | 赤熱駆動 | バフ | EPIC | INSTANT | 3 | 次の攻撃Action全HITにBASE POWER +30%、終了時HP -6 |
| M011 | 積層障壁 | 防御 | COMMON | STANDARD | 2 | POWER 10 / INT参照でSHIELD獲得 |
| M012 | 衝撃偏向 | 防御 | RARE | INSTANT | 3 | 次の敵Damage Actionを60%軽減 |
| M013 | 残像回路 | 防御 | EPIC | INSTANT | 4 | 次の敵Damage Actionを65%で完全回避 |

- 攻撃Memoryは`hitCount`回の独立命中判定。各命中HITで`calcScaled()`と`applyEnemyDamage()`を呼び、GUARDを順次削る。旧MemoryのhitCount省略は1。全弾MISSもAction完了としてCT・破損を1回だけ進める。
- ダメージとMISSは`combat.feedbackEvents[]`へHIT単位で記録し、該当キャラクター画像付近で各数値を別々に表示する。敵連撃も既存合計ダメージの配分を変えず各HITを表示する。数値を合算した単独ポップアップにはしない。
- `resolveMemoryEffect()`はDefinitionのeffect.typeを見る。effect省略の旧定義は攻撃→ATTACK、回復→HEAL、防御→SHIELDへ対応し、ID分岐は使わない。
- 一時BUFFは`combat.playerBuffs[]`にsource / type / modifiers / remainingTurns等を保存する。旧Combatは空配列で補完する。Definition・c.statsを変更しない。
- キャラクター能力は装備中ModuleとCombat Buffのflat/percentを同じ既存集計式へ入力する。`(base + flat合計) × (1 + percent合計/100)`を四捨五入、最低0。
- 命中率はWeaponと攻撃Memory共通で`baseHit + 一時HIT bonus`、0～100へclampする。hitのDefinitionは変更しない。
- Memoryの基礎威力ModuleはそのMemoryの全HITへ適用。赤熱駆動はModule適用後の実効基礎威力に+30%を掛けて四捨五入し、既存Stat Scalingへ渡す。反動は攻撃Action終了時に1回のみ。MISSでも消費し、回復・SHIELD・BUFFや攻撃せずターンを進めるだけでは消費しない。
- 敵Damage Actionの解決順はEvasion→Damage Reduction→SHIELD→HP。回避は成功/失敗どちらでも消費。成功時は軽減・SHIELDを保持。軽減は回避失敗後にAction合計へ1回適用し、その結果を既存の敵HIT数へ分配する。Enemy GUARD・Damage 0では一回限りの防御BUFFを消費しない。既存SHIELD貫通率も維持。
- 2TURN BUFFは使用時2で保存。敵行動が終了して次Player Turnになる時に1減らし、0で解除する。INSTANT使用だけでは減らない。NEXT系は期限なしで対応Actionまで保持する。
- CT減少は従来通り次Player Turn開始時に1減らす。破損率はActionごとにランダム+0.0～3.0%、100%でBROKEN。最終使用は効果を解決してから破損させる。
- 詳細は各HIT威力、命中率、HIT COUNT、BUFF/防御効果、期間、CTを表示。Player名前＋HPの長押しから有効BUFFと残りTURNを確認できる。通常システムフォントを維持。
- 新規Memoryの画像はカテゴリに対応する既存サンプルSVGを再利用する。武器の多段仕様は今回変更しない。

// TODO(要確認): 同系統BUFFの重複可否。現在は同じsource/typeを再使用すると更新し、累積しない。
// TODO(要確認): 敵撃破と赤熱駆動の反動による同時死亡の正式勝敗順。現在は通常Player死亡処理を先に評価し、死者にLootを付与しない。

### CONFIRMED — 消費型Memory Salvage / 2026-10-05

- 死亡画面では装備中・所持中のMemory Instanceから1個だけ選択して回収できる。回収せず終了することもできる。回収確定時に死亡Characterから個体を移動し、`state.metaInventory.memories`へ保存する。残りの所持品はCharacterと共に消失する。報酬・コイン等は今回追加しない。
- 永久アンロックやコピーではない。Character Creationの4枠で通常DefinitionまたはRecovered Memoryを選択する。Draftは`recoveredMemoryIds[4]`で個体を参照し、選択・編集取消・BACKではStorageから消費しない。CREATE確定でのみ同じオブジェクトを新Characterへ移動し、metaInventoryから削除して1回の保存で確定する。
- `instanceId`、`definitionId`、`rarity`、`moduleSlots`、`modules`、`breakageRate`、`broken`、`generatedDepth`と追加個体情報を保持する。`currentCT`だけ0へ戻す。BROKEN個体は使用不能のままであり回収で修理しない。
- 新Characterで通常の破損処理を継続する。再死亡時に自動回収されず、再びSalvageで選択しなければ失われる。同一instanceIdを複数CharacterやmetaInventoryへ重複所有させない。
- STORAGE_KEYは`nehan_alpha_v1`を維持。旧セーブにmetaInventoryが無い場合は空配列を補完する。既存Characterが所有する個体と重複した回収Storage参照は除外する。回収個体のロード時に性能を再生成しない。
- UIは黒・白・赤、通常フォント。死亡画面と作成メモリ編集の一覧のみ内部スクロールし、回収・確定・戻るボタンは画面内に維持する。

### CONFIRMED — 職業の固定初期ロードアウトと詳細一覧 / 2026-10-05

- `JobDefinition.startingLoadout:{weaponId,memoryIds[4]}`で職業ごとの初期装備を定義する。賞金稼ぎは鉄管ブレード（W001）、破砕・速断・応急修復・防壁展開（M001〜M004）。職業を選択すると初期装備を設定する。装備可能武器種の固有能力と、作成時の初期武器候補は別の制限である。
- 作成時の通常メモリ候補は職業の初期4種のみ。全Definitionを無料選択させない。別MemoryはmetaInventoryの回収個体として所有している場合に選択できる。createCharacter、Draft検証、候補変更の共通処理でも制限し、UI以外からの未所持Memory選択も拒否する。
- 武器・メモリは既存作成画面から詳細一覧を開く。武器はレア度・種別・威力・MAIN・命中・HIT数・Module容量を表示。メモリは4枠から装着先を選択し、職業初期装備または回収個体のカードを押して設定する。威力（Module補正含む）・HIT数・命中・CT・効果・説明・レア度を表示する。回収個体には破損率・BROKEN・取得深度・装着Moduleも表示する。
- 回収個体の選択・取消・BACKでは消費しない。CREATEで同じ個体を移動し、破損率・Module・instanceIdを維持する。同名Definitionの複数装備禁止は維持し、選択時は既存枠と交換する。
- 職業変更や旧Draftロード時は、回収個体を保持しながら未所持の通常Memoryを職業の初期装備へ補正する。既存Characterの武器・メモリは変更しない。全体画面はスクロールせず、詳細一覧だけ内部スクロールする。フォントは通常フォントを維持する。
