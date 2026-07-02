import { Direction } from '../types';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Volume2, VolumeX, HelpCircle } from 'lucide-react';

interface ControlPanelProps {
  onDirectionChange: (dir: Direction) => void;
  currentDirection: Direction;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function ControlPanel({
  onDirectionChange,
  currentDirection,
  isPaused,
  onTogglePause,
  onRestart,
  isMuted,
  onToggleMute
}: ControlPanelProps) {
  
  const handleArrowClick = (dir: Direction) => {
    // Prevent reverse directions from causing self-colliding death
    if (dir === 'UP' && currentDirection === 'DOWN') return;
    if (dir === 'DOWN' && currentDirection === 'UP') return;
    if (dir === 'LEFT' && currentDirection === 'RIGHT') return;
    if (dir === 'RIGHT' && currentDirection === 'LEFT') return;
    
    onDirectionChange(dir);
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-5 bg-slate-900/60 p-4 rounded-2xl border-2 border-slate-800">
      
      {/* Game controls utilities */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
        <button
          onClick={onTogglePause}
          id="btn-toggle-pause"
          className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border-2 transition cursor-pointer ${
            isPaused
              ? 'bg-lime-500/15 text-lime-400 border-lime-500/30 hover:bg-lime-500/25'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
          }`}
        >
          {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          {isPaused ? '繼續遊戲' : '暫停'}
        </button>

        <button
          onClick={onRestart}
          id="btn-restart"
          className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-950 text-slate-300 border-2 border-slate-800 hover:bg-slate-900 hover:text-white transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          重新開始
        </button>

        <button
          onClick={onToggleMute}
          id="btn-toggle-mute"
          className="p-2.5 rounded-xl bg-slate-950 text-slate-400 border-2 border-slate-800 hover:bg-slate-900 hover:text-white transition cursor-pointer"
          title={isMuted ? '取消靜音' : '靜音'}
        >
          {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-400" /> : <Volume2 className="w-4.5 h-4.5 text-lime-400" />}
        </button>
      </div>

      {/* Touch/Mobile Virtual Joystick */}
      <div className="flex flex-col items-center justify-center relative scale-95 select-none my-1">
        {/* Diamond layout for touch targets */}
        <div className="grid grid-cols-3 gap-2 w-[160px] h-[160px] relative">
          <div /> {/* 1,1 empty */}
          
          {/* UP */}
          <button
            onClick={() => handleArrowClick('UP')}
            id="joy-up"
            className={`flex items-center justify-center rounded-xl transition cursor-pointer border-2 h-12 w-12 mx-auto ${
              currentDirection === 'UP'
                ? 'bg-lime-400 text-slate-950 border-lime-350 shadow-lg shadow-lime-500/30 scale-95 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 active:bg-slate-900'
            }`}
          >
            <ChevronUp className="w-6 h-6 stroke-[3]" />
          </button>
          
          <div /> {/* 1,3 empty */}

          {/* LEFT */}
          <button
            onClick={() => handleArrowClick('LEFT')}
            id="joy-left"
            className={`flex items-center justify-center rounded-xl transition cursor-pointer border-2 h-12 w-12 mx-auto ${
              currentDirection === 'LEFT'
                ? 'bg-lime-400 text-slate-950 border-lime-350 shadow-lg shadow-lime-500/30 scale-95 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 active:bg-slate-900'
            }`}
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Center visual accent */}
          <div className="w-12 h-12 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-center text-lime-400/80 text-lg font-mono font-bold mx-auto animate-pulse">
            ★
          </div>

          {/* RIGHT */}
          <button
            onClick={() => handleArrowClick('RIGHT')}
            id="joy-right"
            className={`flex items-center justify-center rounded-xl transition cursor-pointer border-2 h-12 w-12 mx-auto ${
              currentDirection === 'RIGHT'
                ? 'bg-lime-400 text-slate-950 border-lime-350 shadow-lg shadow-lime-500/30 scale-95 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 active:bg-slate-900'
            }`}
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>

          <div /> {/* 3,1 empty */}

          {/* DOWN */}
          <button
            onClick={() => handleArrowClick('DOWN')}
            id="joy-down"
            className={`flex items-center justify-center rounded-xl transition cursor-pointer border-2 h-12 w-12 mx-auto ${
              currentDirection === 'DOWN'
                ? 'bg-lime-400 text-slate-950 border-lime-350 shadow-lg shadow-lime-500/30 scale-95 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 active:bg-slate-900'
            }`}
          >
            <ChevronDown className="w-6 h-6 stroke-[3]" />
          </button>

          <div /> {/* 3,3 empty */}
        </div>
      </div>

      {/* Instructions Legend */}
      <div className="text-[11px] text-slate-400 bg-slate-950/80 border-2 border-slate-800 p-3 rounded-xl max-w-[200px] w-full space-y-1.5 md:block hidden">
        <div className="flex items-center gap-1.5 font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-lime-400" />
          <span>鍵盤快捷鍵</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">移動：</span>
          <span className="font-mono text-lime-400 font-bold">↑↓←→ / WASD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">暫停：</span>
          <span className="font-mono text-lime-400 font-bold">Space</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">重開：</span>
          <span className="font-mono text-lime-400 font-bold">R</span>
        </div>
      </div>

    </div>
  );
}
