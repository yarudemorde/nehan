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
- Repeated Memory use creates long-term risk through breakage probability.
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
- Whether unequipped weapons are stored here.
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
- Each selected Memory generates an independent `{definitionId,currentCT:0,breakageRate:0,broken:false,modules:[]}` instance. Static definitions never store those mutable fields.
- Current duplicate policy: duplicates are prohibited. The final duplicate-equipment rule remains **UNRESOLVED** (`TODO(要確認)`).
- New CharacterState stores `jobId`, a copy of the occupation's `stats`, and independent `weapon` / `memories` instances. Existing `c.stats`, `c.weapon`, `c.memories` access remains compatible with MAP, Combat and Inventory.
- **Current implementation HP remains 42/42.** A derived VIT-to-HP formula is **UNRESOLVED**; do not invent one.
- WeaponDefinition is separate from character creation and carries `id`, `name`, `weaponType`, `basePower`, `mainStat`, `hit`, `hitCount`, `rarity`. The current selectable catalog uses the existing 鉄管ブレード (W001, base power 9, hit 90%, STR, 1 HIT). Its `BLADE` type is an implementation category, not a finalized taxonomy. Its rarity is unset. The example 打刀 does not establish a new production weapon.
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

## 4.3 Node categories — PROPOSAL / NOT YET CANONICAL

The planning sheet currently contains candidate node types such as:

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

## 6.5 Breakage / corruption model — CONFIRMED

There is **no durability value** and **no fixed Memory-specific deterioration value**.

Each Memory instance has a current **破損率 (breakage probability)**.

On every Memory use:

1. perform a breakage check using the Memory's **current breakage probability**
2. after the breakage check, increase that Memory's breakage probability by a random **0.0% to 0.5%**

Exact confirmed order:

```text
破損判定 -> 破損率上昇
```

The random breakage-probability increase is common to both Standard and Immediate Execution Memories.

There is no automatic additional fixed deterioration penalty for Immediate Execution.

## 6.6 Broken Memory behavior — CONFIRMED AT HIGH LEVEL

When a Memory breaks:

- the Memory remains as an item/data object
- it is not automatically deleted
- its combat effect becomes weakened to the point that it is almost unusable

### UNRESOLVED

- Exact broken effect per Memory.
- Whether every Memory has a bespoke broken effect or uses a common transformation.
- Repair availability and repair cost.
- Whether breakage probability can be lowered.
- Exact ordering of `effect resolution` relative to the breakage result on the use that triggers breakage.

For implementation, keep these steps separable and configurable.

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

## 7.4 Module details — UNRESOLVED

Not yet decided:

- number of Module slots per Memory
- whether Module slots differ by Memory rarity
- whether Modules can be freely removed
- removal cost
- whether duplicate Modules can be installed
- Module rarity structure
- exact stat value ranges
- whether Modules can modify CT
- whether Modules can modify breakage-probability increase
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
- weapon Modules or modifications
- weapon rarity

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
- current breakage probability
- installed Modules

Recovery does **not** reset breakage probability.

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

This distinction is especially important because a Memory's breakage probability and installed Modules survive across characters when recovered.

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
  if (memory.currentCT > 0) return invalidAction();

  // CONFIRMED ORDER:
  const didBreak = rollBreakage(memory.breakageRate);

  // TODO(要確認): exact ordering between break result and effect resolution.
  resolveMemoryEffect(memory, { didBreak });

  memory.currentCT = memory.definition.ct;

  memory.breakageRate += randomRange(0.0, 0.5); // percentage points

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

The `randomRange(0.0, 0.5)` statement means a **0.0 to 0.5 percentage-point** increase to breakage probability per use, not multiplication by 0.0–0.5.

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
 |            - breakage probability
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
10. **Memory uses breakage probability, not durability.**
11. **No Memory-specific fixed deterioration value.**
12. **Each Memory use increases breakage probability by a random 0.0–0.5 percentage points.**
13. **Breakage check happens before the probability increase.**
14. **Broken Memories remain but become nearly unusable.**
15. **A dead character is lost.**
16. **Recovered Memory retains breakage probability.**
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
- Exact effect-resolution order when a Memory breaks on the current use.
- Hit-rate global conventions.

## Memory

- Secondary-stat correction formula.
- Broken-effect model.
- Repair system.
- Whether breakage probability can decrease.
- Full Memory catalog.

## Module

- Module slot count per Memory.
- Module installation/removal rules.
- Duplicate rules.
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
7. Breakage probability pipeline
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
