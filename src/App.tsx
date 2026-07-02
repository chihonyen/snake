import { useState, useEffect, useRef } from 'react';
import { Direction, Position, GameMode, Difficulty, Food, LeaderboardEntry, Achievement } from './types';
import GameBoard, { getObstacles } from './components/GameBoard';
import ControlPanel from './components/ControlPanel';
import Leaderboard from './components/Leaderboard';
import { 
  Trophy, Gamepad2, Volume2, VolumeX, Award, Sparkles, 
  Play, Flame, Star, Timer, ChevronRight, User, Skull, 
  RefreshCw, Settings, HelpCircle, Shield, Compass, Heart 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  playEatSound, playGoldenEatSound, playChiliEatSound, 
  playCollisionSound, playNewHighScoreSound, getMuteState, toggleMute 
} from './utils/audio';

const GRID_SIZE = 20;

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_step', title: '初試身手', description: '首次單局獲得 10 分', icon: 'Award', unlocked: false },
  { id: 'snake_master', title: '吞食大師', description: '單局獲得 50 分', icon: 'Trophy', unlocked: false },
  { id: 'snake_god', title: '神乎其技', description: '單局獲得 100 分', icon: 'Sparkles', unlocked: false },
  { id: 'golden_touch', title: '黃金誘惑', description: '吃下一顆神秘黃金果實', icon: 'Star', unlocked: false },
  { id: 'chili_fever', title: '辣椒狂熱', description: '吃下一根極速紅辣椒', icon: 'Flame', unlocked: false },
  { id: 'obstacle_conqueror', title: '障礙超越者', description: '在障礙模式中獲得 30 分', icon: 'Shield', unlocked: false },
  { id: 'portal_survivor', title: '次元穿梭客', description: '在傳送穿牆模式中獲得 50 分', icon: 'Compass', unlocked: false },
];

export default function App() {
  // Game states
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('snake_player_name') || '匿名蛇手';
  });
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER' | 'LEADERBOARD_VIEW'>('MENU');
  
  const [snake, setSnake] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [food, setFood] = useState<Food | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => getMuteState());

  // Special item mechanics
  const [chiliTimeLeft, setChiliTimeLeft] = useState(0); // in seconds
  const [triggerParticle, setTriggerParticle] = useState<{ type: 'NORMAL' | 'GOLDEN' | 'CHILI', pos: Position } | null>(null);

  // Leaderboard & Achievements
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showUnlockAnim, setShowUnlockAnim] = useState<Achievement | null>(null);

  // Keep references for precise 60fps independent timers and input processing
  const directionRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Position[]>([]);
  const foodRef = useRef<Food | null>(null);
  const gameModeRef = useRef<GameMode>('CLASSIC');
  const isPausedRef = useRef(false);
  const gameStateRef = useRef(gameState);

  // Load leaderboard & achievements on boot
  useEffect(() => {
    // Leaderboard
    const savedLeaderboard = localStorage.getItem('snake_leaderboard');
    if (savedLeaderboard) {
      try {
        const parsed = JSON.parse(savedLeaderboard) as LeaderboardEntry[];
        setLeaderboard(parsed);
        // Calculate all-time high score
        if (parsed.length > 0) {
          const top = Math.max(...parsed.map(e => e.score));
          setHighScore(top);
        }
      } catch (e) {
        console.error('Error loading leaderboard', e);
      }
    }

    // Achievements
    const savedAchievements = localStorage.getItem('snake_achievements');
    if (savedAchievements) {
      try {
        const parsed = JSON.parse(savedAchievements) as Achievement[];
        // Merge in case we added new achievements
        const merged = DEFAULT_ACHIEVEMENTS.map(def => {
          const saved = parsed.find(p => p.id === def.id);
          return saved ? { ...def, unlocked: saved.unlocked, unlockedAt: saved.unlockedAt } : def;
        });
        setAchievements(merged);
      } catch (e) {
        setAchievements(DEFAULT_ACHIEVEMENTS);
      }
    } else {
      setAchievements(DEFAULT_ACHIEVEMENTS);
    }
  }, []);

  // Update references to avoid React stale closure bugs in continuous game loop
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Handle Mute toggle
  const handleToggleMute = () => {
    const muted = toggleMute();
    setIsMuted(muted);
  };

  // Helper to unlock achievement
  const unlockAchievement = (id: string) => {
    setAchievements(prev => {
      const alreadyUnlocked = prev.find(a => a.id === id)?.unlocked;
      if (alreadyUnlocked) return prev;

      const updated = prev.map(ach => {
        if (ach.id === id) {
          const unlockedAch = { ...ach, unlocked: true, unlockedAt: new Date().toISOString() };
          setShowUnlockAnim(unlockedAch);
          // Play a delightful sparkle sound if unmuted
          playGoldenEatSound();
          setTimeout(() => setShowUnlockAnim(null), 4000);
          return unlockedAch;
        }
        return ach;
      });
      localStorage.setItem('snake_achievements', JSON.stringify(updated));
      return updated;
    });
  };

  // Generate next food position
  const spawnFood = (currentSnake: Position[]) => {
    const obstacles = getObstacles(gameModeRef.current, GRID_SIZE);
    const occupied = new Set<string>();
    
    // Mark snake occupied cells
    currentSnake.forEach(segment => occupied.add(`${segment.x},${segment.y}`));
    // Mark obstacle occupied cells
    obstacles.forEach(obs => occupied.add(`${obs.x},${obs.y}`));

    const emptyCells: Position[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) return; // Grid fully filled (Winner!)

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // Choose food type
    const roll = Math.random();
    let type: 'NORMAL' | 'GOLDEN' | 'CHILI' = 'NORMAL';
    let expiresAt: number | undefined = undefined;

    if (roll < 0.12) {
      type = 'GOLDEN';
      expiresAt = Date.now() + 8500; // expires in 8.5 seconds
    } else if (roll < 0.24) {
      type = 'CHILI';
      expiresAt = Date.now() + 6500; // expires in 6.5 seconds
    }

    setFood({
      position: randomCell,
      type,
      expiresAt
    });
  };

  // Initialize Game
  const startGame = () => {
    // Save player name
    const trimmedName = playerName.trim() || '匿名蛇手';
    setPlayerName(trimmedName);
    localStorage.setItem('snake_player_name', trimmedName);

    // Initial snake: centered, 3 segments long
    const mid = Math.floor(GRID_SIZE / 2);
    const initialSnake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];

    setSnake(initialSnake);
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    setChiliTimeLeft(0);
    setIsPaused(false);
    setTriggerParticle(null);
    
    spawnFood(initialSnake);
    setGameState('PLAYING');
  };

  // Game Loop Ticks
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) return;

    let timerId: NodeJS.Timeout;

    const tick = () => {
      moveSnake();
      
      // Calculate delay based on difficulty
      let baseDelay = 160;
      if (difficulty === 'MEDIUM') baseDelay = 110;
      if (difficulty === 'HARD') baseDelay = 75;

      // Extreme Chili boost
      const currentDelay = chiliTimeLeft > 0 ? baseDelay * 0.65 : baseDelay;

      timerId = setTimeout(tick, currentDelay);
    };

    // Schedule next step
    timerId = setTimeout(tick, difficulty === 'HARD' ? 75 : difficulty === 'MEDIUM' ? 110 : 160);

    return () => clearTimeout(timerId);
  }, [gameState, isPaused, snake, direction, chiliTimeLeft, difficulty, gameMode]);

  // Real-time second countdown for active Chili Boost and temporary foods on field
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) return;

    const intervalId = setInterval(() => {
      // Chili speed boost timer
      setChiliTimeLeft(prev => (prev > 0 ? prev - 1 : 0));

      // Food expiry checker
      setFood(prevFood => {
        if (!prevFood || prevFood.type === 'NORMAL') return prevFood;
        if (prevFood.expiresAt && prevFood.expiresAt <= Date.now()) {
          // Play a low poof or simple indicator that food expired
          return { position: prevFood.position, type: 'NORMAL' };
        }
        return prevFood;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState, isPaused]);

  // Core movement logic
  const moveSnake = () => {
    const currentSnake = [...snakeRef.current];
    if (currentSnake.length === 0) return;

    const head = currentSnake[0];
    const dir = directionRef.current;
    
    // Compute new head
    let newHead = { ...head };
    switch (dir) {
      case 'UP': newHead.y -= 1; break;
      case 'DOWN': newHead.y += 1; break;
      case 'LEFT': newHead.x -= 1; break;
      case 'RIGHT': newHead.x += 1; break;
    }

    // Portal Wrap-around Mode check
    if (gameModeRef.current === 'PORTAL') {
      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      if (newHead.x >= GRID_SIZE) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      if (newHead.y >= GRID_SIZE) newHead.y = 0;
    }

    // Collision Check: Boundaries (for Classic & Obstacles mode)
    if (gameModeRef.current !== 'PORTAL') {
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver();
        return;
      }
    }

    // Collision Check: Obstacles (Obstacle Mode)
    if (gameModeRef.current === 'OBSTACLE') {
      const obstacles = getObstacles('OBSTACLE', GRID_SIZE);
      const hitObstacle = obstacles.some(obs => obs.x === newHead.x && obs.y === newHead.y);
      if (hitObstacle) {
        handleGameOver();
        return;
      }
    }

    // Collision Check: Self-bite (all modes)
    // Avoid head overlapping body segments. In classic snake, hitting the absolute tail tip is technically safe
    // as it will move away, but to be safe and classic we check collision with any segments
    const bitSelf = currentSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (bitSelf) {
      handleGameOver();
      return;
    }

    // Check Food Eaten
    const currentFood = foodRef.current;
    const ateFood = currentFood && newHead.x === currentFood.position.x && newHead.y === currentFood.position.y;

    if (ateFood && currentFood) {
      // Trigger matching particle burst signal
      setTriggerParticle({ type: currentFood.type, pos: currentFood.position });
      
      // Apply scores & play sounds
      let pointsEarned = 1;
      if (currentFood.type === 'GOLDEN') {
        pointsEarned = 3;
        playGoldenEatSound();
        unlockAchievement('golden_touch');
      } else if (currentFood.type === 'CHILI') {
        pointsEarned = 2;
        playChiliEatSound();
        setChiliTimeLeft(5); // 5 seconds of speed boost
        unlockAchievement('chili_fever');
      } else {
        playEatSound();
      }

      const nextScore = score + pointsEarned;
      setScore(nextScore);

      // Check real-time score achievements
      if (nextScore >= 10) unlockAchievement('first_step');
      if (nextScore >= 50) unlockAchievement('snake_master');
      if (nextScore >= 100) unlockAchievement('snake_god');
      
      if (gameModeRef.current === 'OBSTACLE' && nextScore >= 30) {
        unlockAchievement('obstacle_conqueror');
      }
      if (gameModeRef.current === 'PORTAL' && nextScore >= 50) {
        unlockAchievement('portal_survivor');
      }

      // Add head and keep tail (snake grows)
      const nextSnake = [newHead, ...currentSnake];
      setSnake(nextSnake);
      spawnFood(nextSnake);
    } else {
      // Normal movement: add head, remove tail
      currentSnake.pop();
      const nextSnake = [newHead, ...currentSnake];
      setSnake(nextSnake);
    }
  };

  // Game Over Triggers
  const handleGameOver = () => {
    playCollisionSound();
    setGameState('GAMEOVER');

    // Save to local leaderboard
    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: playerName || '匿名蛇手',
      score: score,
      mode: gameMode,
      difficulty: difficulty,
      date: new Date().toISOString()
    };

    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score);
    
    setLeaderboard(updated);
    localStorage.setItem('snake_leaderboard', JSON.stringify(updated));

    // High Score celebrations!
    if (score > highScore) {
      setHighScore(score);
      setTimeout(() => {
        playNewHighScoreSound();
      }, 500);
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      // Do not capture keypresses when typing name
      if (activeElement && activeElement.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      
      // Space for Pause
      if (e.key === ' ' || key === 'spacebar') {
        e.preventDefault();
        if (gameStateRef.current === 'PLAYING') {
          setIsPaused(prev => !prev);
        }
        return;
      }

      // R for quick restart
      if (key === 'r') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'GAMEOVER') {
          startGame();
        }
        return;
      }

      if (gameStateRef.current !== 'PLAYING' || isPausedRef.current) return;

      const currDir = directionRef.current;
      let newDir: Direction | null = null;

      if (key === 'arrowup' || key === 'w') {
        if (currDir !== 'DOWN') newDir = 'UP';
      } else if (key === 'arrowdown' || key === 's') {
        if (currDir !== 'UP') newDir = 'DOWN';
      } else if (key === 'arrowleft' || key === 'a') {
        if (currDir !== 'RIGHT') newDir = 'LEFT';
      } else if (key === 'arrowright' || key === 'd') {
        if (currDir !== 'LEFT') newDir = 'RIGHT';
      }

      if (newDir) {
        e.preventDefault();
        setDirection(newDir);
        directionRef.current = newDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clear Leaderboard function
  const handleClearLeaderboard = () => {
    localStorage.removeItem('snake_leaderboard');
    setLeaderboard([]);
    setHighScore(0);
  };

  // Import Leaderboard function
  const handleImportLeaderboard = (imported: LeaderboardEntry[]) => {
    const sorted = [...leaderboard, ...imported].sort((a, b) => b.score - a.score);
    setLeaderboard(sorted);
    localStorage.setItem('snake_leaderboard', JSON.stringify(sorted));
    if (sorted.length > 0) {
      setHighScore(Math.max(...sorted.map(e => e.score)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col justify-between overflow-x-hidden antialiased">
      
      {/* Toast Alert for Unlocked Achievements */}
      <AnimatePresence>
        {showUnlockAnim && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-lime-500 rounded-2xl p-4 shadow-2xl shadow-lime-950/40 flex items-center gap-3.5 z-50 max-w-sm w-full"
          >
            <div className="w-12 h-12 bg-lime-500/15 border-2 border-lime-400/30 text-lime-400 rounded-xl flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-lime-400 font-bold font-mono">🏆 解鎖成就</span>
              <h4 className="font-extrabold text-sm text-white truncate mt-0.5">{showUnlockAnim.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-1">{showUnlockAnim.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header className="border-b-2 border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setGameState('MENU')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-lime-600 to-lime-400 flex items-center justify-center shadow-lg shadow-lime-900/30">
              <Gamepad2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 font-display">
                貪食蛇 <span className="text-[10px] text-lime-400 font-mono font-bold bg-lime-950/50 px-2 py-0.5 rounded-full border border-lime-800/40">ARCADE</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time high score on top bar */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border-2 border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-400">最佳紀錄:</span>
              <span className="text-white font-mono">{highScore}</span>
            </div>

            <button
              onClick={handleToggleMute}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-lime-400" />}
            </button>
            
            {gameState !== 'MENU' && (
              <button
                onClick={() => setGameState('MENU')}
                className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 text-xs font-semibold hover:text-white transition cursor-pointer"
              >
                主選單
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* WELCOME MENU STATE */}
          {gameState === 'MENU' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-lg space-y-6 py-6"
            >
              <div className="text-center space-y-2.5">
                <motion.div 
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="inline-flex p-3 bg-lime-500/10 border-2 border-lime-500/20 text-lime-400 rounded-2xl mb-2"
                >
                  <Gamepad2 className="w-8 h-8" />
                </motion.div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display uppercase tracking-wider">路卡大雞雞</h2>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">經典玩法的全新復古演繹，配有個人積分排行榜、多種關卡模式與滿滿的成就徽章！</p>
              </div>

              {/* Settings Box */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
                
                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-lime-400" />
                    <span>玩家大名 PLAYER NAME</span>
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="輸入暱稱..."
                    maxLength={10}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-100 focus:ring-1 focus:ring-lime-500 focus:border-lime-500 transition font-medium"
                  />
                </div>

                {/* Game Mode Picker */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-lime-400" />
                    <span>選擇遊戲模式 GAME MODE</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Classic */}
                    <button
                      onClick={() => setGameMode('CLASSIC')}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        gameMode === 'CLASSIC'
                          ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                          : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:bg-slate-950'
                      }`}
                    >
                      <h4 className="font-bold text-xs flex items-center gap-1 text-slate-200">
                        <Skull className="w-3.5 h-3.5 text-rose-400" />
                        經典模式
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">撞牆或咬到自己即宣告死亡</p>
                    </button>

                    {/* Obstacles */}
                    <button
                      onClick={() => setGameMode('OBSTACLE')}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        gameMode === 'OBSTACLE'
                          ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                          : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:bg-slate-950'
                      }`}
                    >
                      <h4 className="font-bold text-xs flex items-center gap-1 text-slate-200">
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                        障礙地圖
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">加入數個極具挑戰性的死角障礙物</p>
                    </button>

                    {/* Portal Wrap */}
                    <button
                      onClick={() => setGameMode('PORTAL')}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        gameMode === 'PORTAL'
                          ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                          : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:bg-slate-950'
                      }`}
                    >
                      <h4 className="font-bold text-xs flex items-center gap-1 text-slate-200">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        傳送穿牆
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">蛇身可以穿牆並從另一側傳送出來</p>
                    </button>
                  </div>
                </div>

                {/* Difficulty Picker */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-lime-400" />
                    <span>調整蛇身行進速度 DIFFICULTY</span>
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border-2 border-slate-850">
                    {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => {
                      const labels = { EASY: '簡單', MEDIUM: '普通', HARD: '困難' };
                      const activeColors = {
                        EASY: 'bg-lime-500/15 border-lime-500/30 text-lime-400',
                        MEDIUM: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                        HARD: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
                      };
                      const isSelected = difficulty === diff;
                      return (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            isSelected 
                              ? activeColors[diff] 
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {labels[diff]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action CTA */}
                <button
                  onClick={startGame}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-lime-600 to-lime-400 hover:from-lime-500 hover:to-lime-350 text-slate-950 font-extrabold text-sm tracking-wider uppercase shadow-lg shadow-lime-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer border-2 border-slate-950"
                >
                  <Play className="w-4 h-4 fill-current" />
                  啟動遊戲 CORE START
                </button>
              </div>

              {/* View Highscores shortcut */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setGameState('LEADERBOARD_VIEW')}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition text-xs font-semibold cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  檢視榮譽殿堂 & 成就
                </button>
              </div>
            </motion.div>
          )}

          {/* ACTIVE PLAYING STATE */}
          {gameState === 'PLAYING' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 py-2"
            >
              {/* Left Column: Stats & Indicators */}
              <div className="lg:col-span-4 flex flex-col gap-4 justify-between">
                
                {/* Scoring metrics */}
                <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">目前得分 SCORE</span>
                      <h3 className="text-3xl font-black text-lime-400 font-mono tracking-tight neon-text-lime mt-0.5">{score} <span className="text-xs text-lime-600 font-normal">pts</span></h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">歷史最高 BEST</span>
                      <h4 className="text-lg font-bold text-slate-300 font-mono mt-0.5">{Math.max(score, highScore)}</h4>
                    </div>
                  </div>

                  {/* Active buffs */}
                  <div className="space-y-2.5">
                    {/* Chili Heat Boost Active bar */}
                    {chiliTimeLeft > 0 && (
                      <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between items-center text-rose-400 font-bold text-[10px] uppercase tracking-wider font-mono">
                          <span className="flex items-center gap-1 animate-pulse">
                            <Flame className="w-3.5 h-3.5 fill-current text-rose-400" />
                            辣椒極速狀態
                          </span>
                          <span>{chiliTimeLeft}s</span>
                        </div>
                        {/* Custom timer bar */}
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: '100%' }}
                            animate={{ width: `${(chiliTimeLeft / 5) * 100}%` }}
                            transition={{ duration: 1, ease: 'linear' }}
                            className="bg-gradient-to-r from-rose-600 to-amber-500 h-full rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Temporary Special Foods on Field countdown indicator */}
                    {food && food.type !== 'NORMAL' && food.expiresAt && (
                      <div className={`border rounded-xl p-3 space-y-1.5 ${
                        food.type === 'GOLDEN' 
                          ? 'bg-yellow-950/40 border-yellow-900/50 text-yellow-400' 
                          : 'bg-rose-950/40 border-rose-900/50 text-rose-400'
                      }`}>
                        <div className="flex justify-between items-center font-bold text-[10px] uppercase tracking-wider font-mono">
                          <span className="flex items-center gap-1">
                            {food.type === 'GOLDEN' ? <Star className="w-3.5 h-3.5 fill-current" /> : <Flame className="w-3.5 h-3.5" />}
                            特殊果實即將消失
                          </span>
                          <span className="animate-pulse">限時</span>
                        </div>
                        {/* Static pulse overlay to notify item decay */}
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full animate-pulse ${
                            food.type === 'GOLDEN' ? 'bg-yellow-400' : 'bg-rose-500'
                          }`} style={{ width: '100%' }} />
                        </div>
                      </div>
                    )}

                    {/* Default Status details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-semibold font-mono">
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-slate-500">當前玩家</span>
                        <p className="text-slate-300 font-bold mt-0.5 truncate">{playerName}</p>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-slate-500">關卡模式</span>
                        <p className="text-slate-300 font-bold mt-0.5 truncate">
                          {gameMode === 'CLASSIC' ? '經典模式' : gameMode === 'OBSTACLE' ? '障礙地圖' : '傳送穿牆'}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Instructions & legend details */}
                <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-3.5 hidden lg:block">
                  <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1 border-b border-slate-800 pb-2">
                    <Sparkles className="w-4 h-4 text-lime-400" />
                    <span>特殊道具圖鑑</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 text-xs">
                      <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-900/40 flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow shadow-red-500" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-200">紅蘋果 (+1分)</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">普通道具，讓蛇身長度正常增長</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5 text-xs">
                      <div className="w-8 h-8 rounded-lg bg-yellow-950/60 border border-yellow-900/40 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                      </div>
                      <div>
                        <span className="font-bold text-yellow-400">黃金星星 (+3分)</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">限時出沒，吃下可獲得大量分數</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs">
                      <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-900/40 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <span className="font-bold text-rose-400">辣椒極速 (+2分)</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">吃下後將觸發 5 秒的超狂極速狂飆！</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Center Column: Game Screen and controls */}
              <div className="lg:col-span-8 space-y-4">
                <GameBoard
                  snake={snake}
                  food={food}
                  obstacles={getObstacles(gameMode, GRID_SIZE)}
                  gridSize={GRID_SIZE}
                  gameMode={gameMode}
                  isPaused={isPaused}
                  isGameOver={false}
                  score={score}
                  triggerParticleSignal={triggerParticle}
                />

                <ControlPanel
                  onDirectionChange={(dir) => {
                    setDirection(dir);
                    directionRef.current = dir;
                  }}
                  currentDirection={direction}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused(prev => !prev)}
                  onRestart={startGame}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                />
              </div>

            </motion.div>
          )}

          {/* GAME OVER SUMMARY STATE */}
          {gameState === 'GAMEOVER' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md space-y-5 py-6 text-center"
            >
              <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-2xl mb-2">
                <Skull className="w-12 h-12 mx-auto text-rose-500 animate-bounce" />
                <h2 className="text-3xl font-black text-rose-500 tracking-tight uppercase mt-3 font-display">遊戲結束</h2>
                <span className="text-xs uppercase tracking-widest text-slate-400 font-mono font-medium">GAME OVER</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
                
                {/* Score Summary badges */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">本次得分 SCORE</span>
                    <h3 className="text-3xl font-black text-lime-400 font-mono mt-1">{score}</h3>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">歷史最佳 HIGHSCORE</span>
                    <h3 className="text-3xl font-black text-yellow-400 font-mono mt-1">{highScore}</h3>
                  </div>
                </div>

                {/* Nice high score congratulations ribbon */}
                {score >= highScore && score > 0 && (
                  <div className="bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold leading-relaxed">
                    <Sparkles className="w-4 h-4 animate-spin text-yellow-300" style={{ animationDuration: '3s' }} />
                    <span>恭喜突破紀錄！締造了全新的傳奇高分！</span>
                  </div>
                )}

                {/* Quick stats rundown */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/80 text-xs text-left space-y-2 text-slate-300 font-medium font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">挑戰玩家：</span>
                    <span className="text-white font-bold">{playerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">挑戰模式：</span>
                    <span className="text-white">
                      {gameMode === 'CLASSIC' ? '經典模式' : gameMode === 'OBSTACLE' ? '障礙地圖' : '傳送穿牆'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">遊戲難度：</span>
                    <span className="text-white">
                      {difficulty === 'EASY' ? '簡單' : difficulty === 'MEDIUM' ? '普通' : '困難'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">蛇身長度：</span>
                    <span className="text-lime-400 font-bold">{snake.length} 節</span>
                  </div>
                </div>

                {/* Action controls */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGameState('MENU')}
                    className="py-3 px-4 rounded-xl border-2 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                  >
                    返回主選單
                  </button>
                  <button
                    onClick={startGame}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-lime-600 to-lime-400 hover:from-lime-500 hover:to-lime-350 text-slate-950 font-extrabold text-xs shadow-lg shadow-lime-500/10 transition cursor-pointer flex items-center justify-center gap-1 border-2 border-slate-950"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    再試一局
                  </button>
                </div>

              </div>

              {/* Leaderboard shortcut */}
              <button
                onClick={() => setGameState('LEADERBOARD_VIEW')}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition font-semibold cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                檢視排行榜 & 完整成就
              </button>

            </motion.div>
          )}

          {/* LEADERBOARD VIEW STATE */}
          {gameState === 'LEADERBOARD_VIEW' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-2xl py-2"
            >
              <Leaderboard
                entries={leaderboard}
                achievements={achievements}
                onClear={handleClearLeaderboard}
                onImport={handleImportLeaderboard}
                onClose={() => setGameState('MENU')}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Styled Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-600 font-mono">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 經典復古貪食蛇 ARCADE. 靜態網頁可完美部署於 GitHub Pages.</p>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Powered by React + Tailwind</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
          </div>
        </div>
      </footer>

    </div>
  );
}
