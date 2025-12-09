# 🎮 The Way of Harmony

**Winner of MET GAME HACKATHON** powered by Univerzitet Metropolitan & Mad Head Games

A collection of three cooperative/competitive two-player games exploring the concepts of harmony and disharmony in gameplay mechanics.

## 🎮 [Play Now!](https://yodakole1.github.io/The-Way-of-Harmony/index.html)

![Main Menu](for-readme/main-menu-screenshot.png)

## 🏆 Team

**JavaScript Development:**
- [Yodakole1](https://github.com/Yodakole1)
- [Sarik](https://github.com/Sarik47)

**Assets & Sound Design:**
- [pijera](https://github.com/pijera)
- [laki011](https://github.com/LazarJanjic)

## 🎯 Game Concepts

### 🎸 Harmonic Flight - *Harmony vs Disharmony*

![Harmonic Flight](for-readme/harmonic-flight-screenshot.png)

Experience the dynamic shift between harmony and disharmony! Control two musical instruments simultaneously as the game randomly switches between two modes:

- **🟢 Harmony Mode (50% chance):** Both instruments need the SAME action - jump together or crouch together
- **🔴 Disharmony Mode (50% chance):** Instruments need OPPOSITE actions - when one jumps, the other must crouch

**Controls:**
- Player 1 (Guitar - Top): `W` (jump) / `S` (crouch)
- Player 2 (Saxophone - Bottom): `↑` (jump) / `↓` (crouch)
- `SPACE` to start/pause

**Goal:** Keep both instruments alive as long as possible while adapting to changing modes!

---

### 🐍 Snake Battle - *Pure Disharmony*

![Snake Battle](for-readme/snake-battle-screenshot.png)

Classic snake chaos with two players fighting on one board! This is pure competition - no cooperation here.

- Eat food to grow longer and score points
- 🍎 Apple: +1 point, grow by 1 segment
- 🍌 Banana: +2 points, grow by 2 segments  
- 🍐 Pear: Speed boost for 3 seconds (no points/growth)
- Collision with walls, yourself, or opponent = instant death

**Controls:**
- Player 1: `W` `A` `S` `D`
- Player 2: Arrow Keys `↑` `←` `↓` `→`
- `SPACE` to start/pause

**Goal:** Outlive your opponent and score the most points!

---

### 🥊 Just Fight - *Pure Harmony*

![Just Fight](for-readme/just-fight-screenshot.png)

Team up to defeat the monster! This is all about cooperation and timing.

- Arrows appear above each player's head showing required moves
- Both players must successfully hit their buttons to deal damage
- Miss your move = monster attacks and you lose health
- Choose your fighter skin before battle

**Controls:**
- Player 1: `W` (high kick) / `A` (left punch) / `S` (low kick) / `D` (right punch)
- Player 2: Arrow Keys `↑` `←` `↓` `→`
- `SPACE` to start/pause

**Goal:** Defeat the monster before both players lose all health!

---

## 🎮 How to Play

1. Open `index.html` in a web browser
2. Choose a game mode from the main menu
3. Select character skins (Boxing Game only)
4. Press `SPACE` to start
5. Work together or compete to win!

### Tournament Mode

![Leaderboard](for-readme/leaderboard-screenshot.png)

Play all three games in sequence and compete for the highest combined score on the global leaderboard!

## 🛠️ Technical Details

- Pure vanilla JavaScript (no frameworks)
- HTML5 Canvas for rendering
- CSS sprites for smooth animations
- Local storage for high scores and leaderboard

## 📁 Project Structure

```
├── index.html              # Main menu
├── dino-harmony.html       # Harmonic Flight game
├── versus-crazy.html       # Snake Battle game
├── boxing-game.html        # Just Fight game
├── style.css               # Global styles
├── dino-game.css           # Dino game styles
├── snake-game.css          # Snake game styles
├── boxing-game.css         # Boxing game styles
├── dino-game.js            # Dino game logic
├── game1v1.js              # Snake game logic
├── boxing-game.js          # Boxing game logic
├── global-leaderboard.js   # Tournament & leaderboard system
└── assets/
    ├── boks/               # Boxing sprites
    ├── dino/               # Guitar/obstacle sprites
    ├── zmijice/            # Snake/food sprites
    └── soundeffectovi/     # Sound effects
```

## 🎨 Features

- Retro pixel art aesthetic with vibrant neon colors
- Smooth sprite-based animations
- Dynamic difficulty scaling (Harmonic Flight)
- Real-time 2-player local multiplayer
- Sound effects and visual feedback
- Tournament mode with persistent leaderboard
- Pause functionality in all games

## 📜 License

Created for MET GAME HACKATHON 2025

---

**Play together. Win together. Or crush each other. Your choice! 🎮**
