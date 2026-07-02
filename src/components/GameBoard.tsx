import { useEffect, useRef, useState } from 'react';
import { Position, Food, GameMode } from '../types';

// Exporting obstacle maps so logic can read them
export function getObstacles(mode: GameMode, gridSize: number): Position[] {
  if (mode !== 'OBSTACLE') return [];
  
  const obstacles: Position[] = [];
  
  // Custom futuristic obstacles: blocks in symmetric L shapes or central pylons
  // Top-left block
  for (let i = 4; i <= 6; i++) {
    obstacles.push({ x: i, y: 4 });
    obstacles.push({ x: 4, y: i });
  }
  // Top-right block
  for (let i = 4; i <= 6; i++) {
    obstacles.push({ x: gridSize - 1 - i, y: 4 });
    obstacles.push({ x: gridSize - 1 - 4, y: i });
  }
  // Bottom-left block
  for (let i = 4; i <= 6; i++) {
    obstacles.push({ x: i, y: gridSize - 1 - 4 });
    obstacles.push({ x: 4, y: gridSize - 1 - i });
  }
  // Bottom-right block
  for (let i = 4; i <= 6; i++) {
    obstacles.push({ x: gridSize - 1 - i, y: gridSize - 1 - 4 });
    obstacles.push({ x: gridSize - 1 - 4, y: gridSize - 1 - i });
  }

  // Center obstacle
  const mid = Math.floor(gridSize / 2);
  obstacles.push({ x: mid, y: mid - 1 });
  obstacles.push({ x: mid, y: mid });
  obstacles.push({ x: mid, y: mid + 1 });
  obstacles.push({ x: mid - 1, y: mid });
  obstacles.push({ x: mid + 1, y: mid });

  return obstacles;
}

interface GameBoardProps {
  snake: Position[];
  food: Food | null;
  obstacles: Position[];
  gridSize: number;
  gameMode: GameMode;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  triggerParticleSignal: { type: 'NORMAL' | 'GOLDEN' | 'CHILI', pos: Position } | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export default function GameBoard({
  snake,
  food,
  obstacles,
  gridSize,
  gameMode,
  isPaused,
  isGameOver,
  score,
  triggerParticleSignal
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const pulseRef = useRef(0); // for animated objects (food rotation, glow pulses)

  // Track parent resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      // Ensure it's square and fills the container nicely
      const size = Math.min(rect.width, rect.height, 500);
      setDimensions({ width: size, height: size });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Listen for eating particles triggers
  useEffect(() => {
    if (!triggerParticleSignal) return;

    const { type, pos } = triggerParticleSignal;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellSize = dimensions.width / gridSize;
    const startX = (pos.x + 0.5) * cellSize;
    const startY = (pos.y + 0.5) * cellSize;

    // Generate color based on food type
    let colors = ['#a3e635', '#bef264', '#d9f99d']; // Lime green from Bold Typography theme
    if (type === 'GOLDEN') colors = ['#f59e0b', '#fbbf24', '#fef08a']; // Gold yellow
    if (type === 'CHILI') colors = ['#f43f5e', '#fb7185', '#fda4af']; // Hot rose-red

    const newParticles: Particle[] = [];
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      newParticles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, [triggerParticleSignal, dimensions.width, gridSize]);

  // Game continuous render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      pulseRef.current += 0.04;
      const pulseValue = Math.sin(pulseRef.current);

      // Clear canvas with deep dark background
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const cellSize = dimensions.width / gridSize;

      // Draw subtle retro grid backdrop
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)'; // slate-800
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= gridSize; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, dimensions.height);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(dimensions.width, i * cellSize);
        ctx.stroke();
      }

      // Draw Portals/Warp gates on boundaries in PORTAL mode
      if (gameMode === 'PORTAL') {
        const glowOpacity = 0.15 + Math.abs(pulseValue) * 0.15;
        ctx.strokeStyle = `rgba(16, 185, 129, ${glowOpacity})`; // glowing green
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, dimensions.width, dimensions.height);
        
        // Corner decor
        const size = 15;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        
        // Top Left
        ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(0, 0); ctx.lineTo(size, 0); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(dimensions.width - size, 0); ctx.lineTo(dimensions.width, 0); ctx.lineTo(dimensions.width, size); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(0, dimensions.height - size); ctx.lineTo(0, dimensions.height); ctx.lineTo(size, dimensions.height); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(dimensions.width - size, dimensions.height); ctx.lineTo(dimensions.width, dimensions.height); ctx.lineTo(dimensions.width, dimensions.height - size); ctx.stroke();
      }

      // Draw Obstacles in OBSTACLE mode
      if (gameMode === 'OBSTACLE') {
        obstacles.forEach(obs => {
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'; // glowing red walls
          ctx.fillStyle = '#ef4444'; // rose-500
          
          // Draw metallic/cyber block
          ctx.fillRect(
            obs.x * cellSize + 2,
            obs.y * cellSize + 2,
            cellSize - 4,
            cellSize - 4
          );
          
          // Darker center for brick effect
          ctx.fillStyle = '#7f1d1d'; // red-900
          ctx.fillRect(
            obs.x * cellSize + 5,
            obs.y * cellSize + 5,
            cellSize - 10,
            cellSize - 10
          );
          ctx.shadowBlur = 0; // reset
        });
      }

      // Draw Food
      if (food) {
        const foodX = (food.position.x + 0.5) * cellSize;
        const foodY = (food.position.y + 0.5) * cellSize;
        const radius = (cellSize / 2) * (0.8 + Math.sin(pulseRef.current * 2.5) * 0.05);

        ctx.save();
        ctx.beginPath();

        if (food.type === 'GOLDEN') {
          // Golden star that sparkles and rotates
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#fbbf24';
          ctx.fillStyle = '#fbbf24';
          
          ctx.translate(foodX, foodY);
          ctx.rotate(pulseRef.current * 0.8);
          
          // Draw star shape
          const spikes = 5;
          const outerRadius = radius * 1.1;
          const innerRadius = radius * 0.5;
          let rot = (Math.PI / 2) * 3;
          let x = 0, y = 0;
          const step = Math.PI / spikes;

          ctx.beginPath();
          ctx.moveTo(0, -outerRadius);
          for (let i = 0; i < spikes; i++) {
            x = Math.cos(rot) * outerRadius;
            y = Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = Math.cos(rot) * innerRadius;
            y = Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.closePath();
          ctx.fill();
        } 
        else if (food.type === 'CHILI') {
          // Hot chili pepper
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#f43f5e';
          
          // Flame outline or simple hot pod shape
          ctx.translate(foodX, foodY);
          ctx.rotate(-Math.PI / 4 + Math.sin(pulseRef.current * 5) * 0.08); // dangling/swaying
          
          ctx.fillStyle = '#f43f5e'; // chili body
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.9, 0, Math.PI, false);
          ctx.quadraticCurveTo(-radius * 0.2, -radius * 1.2, -radius * 0.6, -radius * 0.2);
          ctx.fill();

          // Stem
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -radius * 0.2);
          ctx.quadraticCurveTo(radius * 0.4, -radius * 0.8, radius * 0.2, -radius * 1.1);
          ctx.stroke();
        } 
        else {
          // Normal Red Apple
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
          ctx.fillStyle = '#ef4444';
          
          // Left lobe
          ctx.arc(foodX - radius * 0.2, foodY, radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
          // Right lobe
          ctx.beginPath();
          ctx.arc(foodX + radius * 0.2, foodY, radius * 0.7, 0, Math.PI * 2);
          ctx.fill();

          // Green leaf
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.ellipse(foodX + radius * 0.1, foodY - radius * 0.8, radius * 0.3, radius * 0.15, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Snake
      if (snake.length > 0) {
        snake.forEach((segment, index) => {
          const isHead = index === 0;
          const isTail = index === snake.length - 1;
          
          // Head, body and tail calculations
          const segX = segment.x * cellSize;
          const segY = segment.y * cellSize;
          
          // Size decay towards the tail to make snake look organic and elegant
          const segmentScale = isHead 
            ? 1.0 
            : 0.95 - (index / snake.length) * 0.3; // tail gets thinner
            
          const padding = (cellSize * (1 - segmentScale)) / 2;
          const size = cellSize * segmentScale;

          ctx.save();
          
          if (isHead) {
            // Neon glowing lime head
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#a3e635';
            ctx.fillStyle = '#a3e635';
            
            // Draw smooth rounded head block or capsule
            ctx.beginPath();
            ctx.roundRect(segX + padding, segY + padding, size, size, [cellSize * 0.4]);
            ctx.fill();

            // Draw Cute Animated Face
            // Figure out direction based on second segment
            let dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = 'RIGHT';
            if (snake.length > 1) {
              const next = snake[1];
              if (segment.x < next.x) dir = 'LEFT';
              else if (segment.x > next.x) dir = 'RIGHT';
              else if (segment.y < next.y) dir = 'UP';
              else if (segment.y > next.y) dir = 'DOWN';
            }

            // Eyes position based on direction
            ctx.fillStyle = '#ffffff'; // outer eye
            const eyeSize = cellSize * 0.2;
            const pupilSize = cellSize * 0.1;
            ctx.shadowBlur = 0; // turn off shadow for eyes

            let eye1 = { x: 0, y: 0 };
            let eye2 = { x: 0, y: 0 };

            if (dir === 'RIGHT') {
              eye1 = { x: segX + cellSize * 0.65, y: segY + cellSize * 0.25 };
              eye2 = { x: segX + cellSize * 0.65, y: segY + cellSize * 0.75 };
            } else if (dir === 'LEFT') {
              eye1 = { x: segX + cellSize * 0.35, y: segY + cellSize * 0.25 };
              eye2 = { x: segX + cellSize * 0.35, y: segY + cellSize * 0.75 };
            } else if (dir === 'UP') {
              eye1 = { x: segX + cellSize * 0.25, y: segY + cellSize * 0.35 };
              eye2 = { x: segX + cellSize * 0.75, y: segY + cellSize * 0.35 };
            } else if (dir === 'DOWN') {
              eye1 = { x: segX + cellSize * 0.25, y: segY + cellSize * 0.65 };
              eye2 = { x: segX + cellSize * 0.75, y: segY + cellSize * 0.65 };
            }

            // Draw eyes
            ctx.beginPath(); ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2); ctx.fill();

            // Pupil
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(eye1.x, eye1.y, pupilSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2.x, eye2.y, pupilSize, 0, Math.PI * 2); ctx.fill();

            // Flickering cute tongue!
            if (Math.sin(pulseRef.current * 10) > 0.5) {
              ctx.strokeStyle = '#f43f5e';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              if (dir === 'RIGHT') {
                ctx.moveTo(segX + cellSize, segY + cellSize / 2);
                ctx.lineTo(segX + cellSize + 5, segY + cellSize / 2);
                ctx.lineTo(segX + cellSize + 7, segY + cellSize / 2 - 2);
                ctx.moveTo(segX + cellSize + 5, segY + cellSize / 2);
                ctx.lineTo(segX + cellSize + 7, segY + cellSize / 2 + 2);
              } else if (dir === 'LEFT') {
                ctx.moveTo(segX, segY + cellSize / 2);
                ctx.lineTo(segX - 5, segY + cellSize / 2);
                ctx.lineTo(segX - 7, segY + cellSize / 2 - 2);
                ctx.moveTo(segX - 5, segY + cellSize / 2);
                ctx.lineTo(segX - 7, segY + cellSize / 2 + 2);
              } else if (dir === 'UP') {
                ctx.moveTo(segX + cellSize / 2, segY);
                ctx.lineTo(segX + cellSize / 2, segY - 5);
                ctx.lineTo(segX + cellSize / 2 - 2, segY - 7);
                ctx.moveTo(segX + cellSize / 2, segY - 5);
                ctx.lineTo(segX + cellSize / 2 + 2, segY - 7);
              } else if (dir === 'DOWN') {
                ctx.moveTo(segX + cellSize / 2, segY + cellSize);
                ctx.lineTo(segX + cellSize / 2, segY + cellSize + 5);
                ctx.lineTo(segX + cellSize / 2 - 2, segY + cellSize + 7);
                ctx.moveTo(segX + cellSize / 2, segY + cellSize + 5);
                ctx.lineTo(segX + cellSize / 2 + 2, segY + cellSize + 7);
              }
              ctx.stroke();
            }
          } 
          else {
            // Body segments - gradient transition
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(163, 230, 71, 0.2)';
            
            // Neon Lime and Green alternating theme
            const pct = index / snake.length;
            ctx.fillStyle = `rgb(${Math.floor(163 - pct * 60)}, ${Math.floor(230 - pct * 80)}, ${Math.floor(53 + pct * 20)})`;
            
            // Draw joint segment with round corners
            ctx.beginPath();
            ctx.roundRect(segX + padding, segY + padding, size, size, [cellSize * 0.25]);
            ctx.fill();
          }

          ctx.restore();
        });
      }

      // Draw active particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Pause/GameOver overlays
      if (isPaused) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // slate-900 backwash
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('遊戲暫停中', dimensions.width / 2, dimensions.height / 2 - 15);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText('按下 [空白鍵] 或點擊暫停鍵繼續', dimensions.width / 2, dimensions.height / 2 + 15);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [snake, food, obstacles, gridSize, gameMode, dimensions, isPaused, isGameOver]);

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-square flex items-center justify-center p-1 rounded-2xl bg-slate-950/40 border border-slate-800/80 shadow-2xl overflow-hidden"
    >
      <canvas
        id="snake-game-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-xl border border-slate-900 shadow-xl"
      />
    </div>
  );
}
