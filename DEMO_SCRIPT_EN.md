# PokerGTO Trainer — English Demo Script

**Duration:** 8–10 minutes  
**Target Audience:** GTO poker players, coaches, poker software buyers  
**Recording Tool:** QuickTime / OBS / Screen Studio  
**Resolution:** 1920×1080 (or native Retina)  
**Audio:** Clear narration, no background music during feature demos

---

## Recording Checklist

- [ ] Ensure sample data is initialized (Settings → Init Preflop Data + Init Postflop Data)
- [ ] Set language to English (Settings → English)
- [ ] Clean desktop, hide notifications, quit other apps
- [ ] Close sidebar for wider matrix view when showing range

---

## Script

### 0. INTRO (0:00–0:30)

**Visual:** App icon → app launches → main window with Strategy Explorer visible

**Narration:**
> "PokerGTO Trainer is a desktop application for studying Game Theory Optimal poker strategy. It runs entirely on your device — no cloud, no subscription. Let me show you all 14 modules."

**Key shots:**
- Title bar with "PokerGTO Trainer" branding
- Sidebar with grouped navigation
- Dark, professional UI

---

### 1. STRATEGY EXPLORER (0:30–2:00)

**Visual:** Strategy Explorer page — 13×13 range matrix visible

**Narration:**
> "The Strategy Explorer is the heart of the app. You're looking at a 13-by-13 preflop range matrix. Each cell is a hand combination — AA in the top-left, 72o in the bottom-right. Color intensity shows frequency: dark green is low, amber is medium, red is high frequency — just like PioSolver or GTO Wizard."

**Actions to show:**
1. Hover over cells — show tooltip with combo name, frequency, action
2. Click a cell — show detail panel on the right with equity, EV, action distribution
3. Switch between Hero / Villain / Diff / Merged views in toolbar
4. Change position: BTN → UTG — watch range tighten
5. Change stack depth: 100bb → 30bb — watch range shift

**Narration:**
> "Switch between Hero and Villain views to see both sides. Change position from Button to Under the Gun — watch the range tighten. Change stack depth from 100 big blinds to 30 — observe how short-stack dynamics change the range. Every change is instant, powered by on-device SQLite."

---

### 2. CFR SOLVER (2:00–2:30)

**Visual:** Left sidebar → click "Run CFR Solver"

**Narration:**
> "The app includes an on-device CFR solver that computes Nash equilibrium strategies. Click 'Run CFR Solver' and it iterates to find the optimal preflop strategy for the selected position and stack depth. No internet needed — it runs on your CPU."

**Actions:**
1. Click "Run CFR Solver" → show "Computing..." → "Solved!"
2. Matrix updates with computed frequencies

---

### 3. TRAINING MODE (2:30–3:30)

**Visual:** Navigate to Training Mode (⌘2)

**Narration:**
> "Training Mode tests your GTO decision-making. Configure the streets, difficulty, and number of questions. You'll see a scenario — position, stack depth, board cards — and choose the GTO action. Get instant feedback with EV loss calculation and detailed explanations."

**Actions:**
1. Configure: cash game, BTN vs BB, all streets, medium, 5 questions
2. Click Start → answer a question (deliberately wrong to show feedback)
3. Show: Correct answer with green checkmark + explanation
4. Show: Mistake analysis — "Your action vs GTO action, EV lost"
5. Progress through to results → show accuracy score, common mistakes

---

### 4. RANGE EDITOR (3:30–4:30)

**Visual:** Navigate to Range Editor (⌘3)

**Narration:**
> "The Range Editor lets you build custom ranges by clicking cells on the matrix. Three edit modes: Toggle cycles through 0% → 50% → 100%. Paint sets selected hands to 100%. Erase removes hands. The sidebar shows live stats — VPIP, combo count, pair/suited/offsuit breakdown."

**Actions:**
1. Click "BTN Open" preset → range populates
2. Paint mode: add a few more hands (A2s-A5s)
3. Erase mode: remove some offsuit broadways
4. Click "Save" → range appears in saved list
5. Click "Export" → show JSON download
6. Click "Import" → show file picker

---

### 5. RANGE COMPARISON (4:30–5:15)

**Visual:** Navigate to Range Compare (⌘4)

**Narration:**
> "Range Compare puts two ranges side by side. Select Position A and Position B, choose stack depth, and load. You see BTN's 100bb opening range versus UTG's — the difference is immediately visible. Switch to 'Difference' mode for a heatmap overlay showing where one range is wider."

**Actions:**
1. Set Position A = BTN, Position B = UTG, 100bb
2. Click "Load Ranges" → side-by-side view
3. Toggle "Difference" mode → show heatmap diff
4. Point out: green cells = BTN wider, red = UTG wider

---

### 6. HAND ANALYZER (5:15–6:15)

**Visual:** Navigate to Hand Analyzer (⌘6)

**Narration:**
> "The Hand Analyzer evaluates your actual play against GTO. Input your hole cards, the board, positions, and build an action line street by street. Click 'Analyze Hand' and get a per-decision GTO deviation report with letter grades, EV losses, and detailed explanations."

**Actions:**
1. Select cards: A♠ K♥ (click rank A → ♠, rank K → ♥)
2. Set board: Q♠ 7♦ 2♣
3. Set Hero = BTN, Villain = BB, 100bb
4. Build actions: preflop → open_2.5bb → villain calls
5. Add flop action: bet_50 → villain calls
6. Click "Analyze Hand"
7. Show: Grade (B+), stats, per-decision cards with GTO comparison
8. Point out: severity badges, EV lost per decision, street breakdown

---

### 7. ADVANCED ANALYSIS — NODE LOCKING (6:15–7:00)

**Visual:** Navigate to Advanced Analysis (⌘7)

**Narration:**
> "Node Locking is one of the most powerful features. Select a board, analyze the postflop strategy, then lock specific combos to a forced action — like forcing AK to always bet. The solver recalculates and shows you how the rest of the range adjusts. This is how pros study exploitative adjustments."

**Actions:**
1. Board: A♠ 7♦ 2♣ → click "Analyze"
2. Show equity distribution chart
3. Select "Force Fold" → click AKs, AKo in matrix → they get lock badges
4. Click "Apply Locks & Recalculate"
5. Show: Results panel — affected combos, strategy shift
6. Toggle to "Difference" view → show where frequencies changed

---

### 8. ICM CALCULATOR (7:00–7:30)

**Visual:** Navigate to ICM Calculator (⌘8)

**Narration:**
> "The ICM Calculator uses the Malmuth-Harville algorithm for exact tournament equity calculations. Input player stacks, set payouts, and see ICM dollar values, chip EVs, ICM tax, and bubble factors. Perfect for studying tournament push/fold decisions."

**Actions:**
1. Show default 4-player setup
2. Adjust Hero stack from 5000 → 2000 → see ICM values update
3. Point out: Bubble factor column, ICM tax column
4. Add a 5th player → show how equities redistribute

---

### 9. TURN & RIVER ANALYSIS (7:30–8:00)

**Visual:** Navigate to Turn/River Analysis (⌘9)

**Narration:**
> "Turn and River Analysis detects scare cards, bricks, and strategy shifts. Select a flop and turn card, click analyze, and see how the double barrel frequency changes. For the river, see value bet, bluff, and check frequencies — with specific hand type recommendations."

**Actions:**
1. Flop: A♠ 7♦ 2♣, Turn: T♥ → click Analyze
2. Show: "Brick" badge, double barrel 65%, best sizing recommendation
3. Show hand type recommendations table
4. River result: show value bet / bluff / check breakdown

---

### 10. MULTI-WAY POT (8:00–8:30)

**Visual:** Navigate to Multi-way Pot (⌘0)

**Narration:**
> "Multi-way analysis covers 3-to-6 player scenarios. Select the number of players and aggressor position, and get heuristic adjustments compared to heads-up play. See how c-bet frequency drops, protection value changes, and which hand types need to adjust most in multi-way pots."

**Actions:**
1. Set 4 players, BTN aggressor → Analyze
2. Show warnings section ("heuristic-based" note)
3. Show stats: adjusted c-bet frequency, protection value
4. Show HU vs Multi-way comparison table
5. Point out: "Lower c-bet frequency" → "Tighter value range" adjustments

---

### 11. SETTINGS & LANGUAGE SWITCH (8:30–9:00)

**Visual:** Navigate to Settings

**Narration:**
> "Settings let you switch between English and Chinese with one click. The entire app — all 14 modules — is fully bilingual. You can also initialize sample data, check database stats, and configure keyboard shortcuts. Every action has a ⌘ shortcut for power users."

**Actions:**
1. Toggle to 中文 → sidebar and UI switch to Chinese
2. Toggle back to English
3. Show keyboard shortcuts list
4. Show data management section

---

### 12. OUTRO (9:00–9:30)

**Visual:** Return to Strategy Explorer, show the full polished UI

**Narration:**
> "PokerGTO Trainer brings professional-grade GTO study tools to your desktop. On-device CFR solver, interactive range matrix, Node Locking, ICM, hand analysis, and training mode — all running locally on your machine. Thanks for watching."

**End card:** PokerGTO Trainer logo + "Download at [link]" + tech stack line

---

## Post-Recording

- [ ] Trim silence at start/end
- [ ] Add intro/outro cards if needed
- [ ] Check audio levels
- [ ] Export as 1080p MP4 (H.264)
