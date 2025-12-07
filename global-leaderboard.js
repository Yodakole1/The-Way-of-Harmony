// Global Leaderboard System for The Way of Harmony
// Tracks scores across all three games

const LEADERBOARD_KEY = 'harmonyGlobalLeaderboard';
const SESSION_KEY = 'harmonyCurrentSession';

// Game types
const GAMES = {
  DINO: 'dino',
  SNAKE: 'snake',
  BOXING: 'boxing'
};

// Get current session data
function getCurrentSession() {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
}

// Start new session
function startNewSession(player1Name, player2Name) {
  const session = {
    player1: {
      name: player1Name || 'Player 1',
      scores: {
        dino: 0,
        snake: 0,
        boxing: 0
      },
      total: 0
    },
    player2: {
      name: player2Name || 'Player 2',
      scores: {
        dino: 0,
        snake: 0,
        boxing: 0
      },
      total: 0
    },
    currentGame: 0, // 0=dino, 1=snake, 2=boxing
    startTime: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// Update session with game score
function updateSessionScore(game, player1Score, player2Score) {
  const session = getCurrentSession();
  if (!session) return;
  
  session.player1.scores[game] = player1Score;
  session.player2.scores[game] = player2Score;
  session.player1.total = Object.values(session.player1.scores).reduce((a, b) => a + b, 0);
  session.player2.total = Object.values(session.player2.scores).reduce((a, b) => a + b, 0);
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// Complete session and save to leaderboard
function completeSession() {
  const session = getCurrentSession();
  if (!session) return;
  
  const leaderboard = getGlobalLeaderboard();
  const endTime = Date.now();
  const duration = Math.floor((endTime - session.startTime) / 1000); // seconds
  
  // Add both players to leaderboard
  leaderboard.push({
    player1: session.player1.name,
    player2: session.player2.name,
    player1Total: session.player1.total,
    player2Total: session.player2.total,
    scores: {
      dino: {p1: session.player1.scores.dino, p2: session.player2.scores.dino},
      snake: {p1: session.player1.scores.snake, p2: session.player2.scores.snake},
      boxing: {p1: session.player1.scores.boxing, p2: session.player2.scores.boxing}
    },
    duration: duration,
    date: new Date().toISOString()
  });
  
  // Sort by total score (p1 + p2)
  leaderboard.sort((a, b) => (b.player1Total + b.player2Total) - (a.player1Total + a.player2Total));
  
  // Keep top 10
  if (leaderboard.length > 10) {
    leaderboard.splice(10);
  }
  
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  localStorage.removeItem(SESSION_KEY);
  
  return leaderboard;
}

// Get global leaderboard
function getGlobalLeaderboard() {
  const data = localStorage.getItem(LEADERBOARD_KEY);
  return data ? JSON.parse(data) : [];
}

// Clear session
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Get next game in sequence
function getNextGame() {
  const session = getCurrentSession();
  if (!session) return null;
  
  const games = ['dino', 'snake', 'boxing'];
  return games[session.currentGame];
}

// Advance to next game
function advanceToNextGame() {
  const session = getCurrentSession();
  if (!session) return null;
  
  session.currentGame++;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  if (session.currentGame >= 3) {
    return 'complete';
  }
  
  return getNextGame();
}

// Format time (seconds to MM:SS)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
