import { useState, ChangeEvent } from 'react';
import { LeaderboardEntry, Achievement, GameMode, Difficulty } from '../types';
import { Trophy, Trash2, Download, Upload, Medal, Award, Calendar, CheckCircle, ChevronRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  achievements: Achievement[];
  onClear: () => void;
  onImport: (importedEntries: LeaderboardEntry[]) => void;
  onClose?: () => void;
}

export default function Leaderboard({ entries, achievements, onClear, onImport, onClose }: LeaderboardProps) {
  const [selectedTab, setSelectedTab] = useState<'scores' | 'achievements'>('scores');
  const [filterMode, setFilterMode] = useState<GameMode | 'ALL'>('ALL');
  const [filterDiff, setFilterDiff] = useState<Difficulty | 'ALL'>('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sort and filter entries
  const filteredEntries = entries
    .filter(entry => (filterMode === 'ALL' || entry.mode === filterMode))
    .filter(entry => (filterDiff === 'ALL' || entry.difficulty === filterDiff))
    .sort((a, b) => b.score - a.score);

  // Export JSON file
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(entries, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `snake_leaderboard_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      alert('匯出失敗：' + e);
    }
  };

  // Import JSON file
  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            // Basic validation
            const isValid = parsed.every(item => 
              typeof item.id === 'string' &&
              typeof item.name === 'string' &&
              typeof item.score === 'number' &&
              ['CLASSIC', 'OBSTACLE', 'PORTAL'].includes(item.mode) &&
              ['EASY', 'MEDIUM', 'HARD'].includes(item.difficulty)
            );
            if (isValid) {
              onImport(parsed);
              alert(`成功匯入 ${parsed.length} 筆排行榜記錄！`);
            } else {
              alert('檔案格式不正確，必須是有效的貪食蛇紀錄檔！');
            }
          } else {
            alert('檔案格式不正確，必須是 JSON 陣列！');
          }
        } catch (err) {
          alert('解析檔案失敗，請確保是正確的 JSON 格式！');
        }
      };
    }
  };

  const getModeLabel = (mode: GameMode) => {
    switch (mode) {
      case 'CLASSIC': return '經典模式';
      case 'OBSTACLE': return '障礙地圖';
      case 'PORTAL': return '傳送穿牆';
    }
  };

  const getDiffLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'EASY': return '簡單';
      case 'MEDIUM': return '普通';
      case 'HARD': return '困難';
    }
  };

  const getDiffColor = (diff: Difficulty) => {
    switch (diff) {
      case 'EASY': return 'text-lime-400 bg-lime-950/40 border-lime-800/50';
      case 'MEDIUM': return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'HARD': return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl shadow-lime-950/20 overflow-hidden flex flex-col h-[580px]">
      {/* Header */}
      <div className="p-5 border-b-2 border-slate-800 bg-slate-950 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-lime-500/10 text-lime-400 rounded-lg border-2 border-lime-500/20">
            <Trophy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5 font-display">
              榮譽殿堂 <span className="text-xs text-lime-400 font-mono px-2 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/20">HALL OF FAME</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">紀錄你最佳的貪食蛇闖關冒險</p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/50 p-2 gap-1">
        <button
          onClick={() => setSelectedTab('scores')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 border-2 ${
            selectedTab === 'scores'
              ? 'bg-lime-500/10 text-lime-400 border-lime-500/30'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Trophy className="w-4 h-4" />
          積分排行榜
        </button>
        <button
          onClick={() => setSelectedTab('achievements')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 border-2 ${
            selectedTab === 'achievements'
              ? 'bg-lime-500/10 text-lime-400 border-lime-500/30'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Award className="w-4 h-4" />
          成就獎章 ({unlockedCount}/{achievements.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-900/60">
        {selectedTab === 'scores' ? (
          <>
            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold uppercase tracking-wide">遊戲模式</label>
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="w-full bg-slate-950 text-slate-200 border-2 border-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-lime-500 outline-none cursor-pointer"
                >
                  <option value="ALL">全部模式</option>
                  <option value="CLASSIC">經典模式</option>
                  <option value="OBSTACLE">障礙地圖</option>
                  <option value="PORTAL">傳送穿牆</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold uppercase tracking-wide">難易度</label>
                <select
                  value={filterDiff}
                  onChange={(e) => setFilterDiff(e.target.value as any)}
                  className="w-full bg-slate-950 text-slate-200 border-2 border-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-lime-500 outline-none cursor-pointer"
                >
                  <option value="ALL">全部難度</option>
                  <option value="EASY">簡單</option>
                  <option value="MEDIUM">普通</option>
                  <option value="HARD">困難</option>
                </select>
              </div>
            </div>

            {/* Scores List */}
            <div className="space-y-2 mt-2">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <Medal className="w-10 h-10 mx-auto opacity-20 mb-2.5" />
                  <p className="text-sm font-bold">尚未有此分類的排行榜紀錄</p>
                  <p className="text-xs text-slate-600 mt-1">趕快開始一局新遊戲並締造高分吧！</p>
                </div>
              ) : (
                filteredEntries.map((entry, index) => {
                  const isTop3 = index < 3;
                  const medalColors = [
                    'text-yellow-400 bg-yellow-400/10 border-yellow-500/30 shadow-yellow-500/5',
                    'text-slate-300 bg-slate-300/10 border-slate-300/30 shadow-slate-300/5',
                    'text-amber-600 bg-amber-600/10 border-amber-600/30 shadow-amber-600/5'
                  ];

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isTop3 
                          ? `bg-slate-950/80 ${medalColors[index]} border-2` 
                          : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/60 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-sm border-2 ${
                          isTop3 
                            ? 'bg-slate-950 border-current shadow-inner' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{entry.name}</span>
                            {isTop3 && index === 0 && <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs">
                            <span className="text-slate-400 font-semibold">{getModeLabel(entry.mode)}</span>
                            <span className="text-slate-600">•</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getDiffColor(entry.difficulty)}`}>
                              {getDiffLabel(entry.difficulty)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="text-lg font-black font-mono text-lime-400 tracking-tight neon-text-lime">{entry.score} <span className="text-[10px] text-lime-500 font-normal">pts</span></div>
                          <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5 font-mono">
                            <Calendar className="w-3 h-3" />
                            {new Date(entry.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Achievements tab */
          <div className="grid grid-cols-1 gap-2.5">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`flex gap-3.5 p-3 rounded-xl border-2 transition-all ${
                  ach.unlocked
                    ? 'bg-slate-950/80 border-lime-500/20 shadow-lg shadow-lime-950/5'
                    : 'bg-slate-950/30 border-slate-800/50 opacity-60'
                }`}
              >
                {/* Icon wrapper */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 shrink-0 ${
                  ach.unlocked
                    ? 'bg-lime-500/10 border-lime-500/30 text-lime-400'
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}>
                  <Award className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 justify-between">
                    <h3 className={`font-bold text-sm ${ach.unlocked ? 'text-white' : 'text-slate-500'}`}>
                      {ach.title}
                    </h3>
                    {ach.unlocked && (
                      <span className="flex items-center gap-1 text-[10px] text-lime-400 bg-lime-500/10 px-1.5 py-0.5 rounded border border-lime-500/20 font-bold">
                        <CheckCircle className="w-3 h-3" />
                        已解鎖
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ach.description}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                      <Calendar className="w-2.5 h-2.5" />
                      解鎖於 {new Date(ach.unlockedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Utility Actions */}
      <div className="p-4 bg-slate-950 border-t-2 border-slate-850 flex flex-wrap gap-2.5 justify-between items-center text-xs">
        {selectedTab === 'scores' && (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={entries.length === 0}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border-2 border-slate-800 text-slate-300 hover:bg-slate-900 transition disabled:opacity-40 disabled:pointer-events-none font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                匯出紀錄
              </button>
              
              <label className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border-2 border-slate-800 text-slate-300 hover:bg-slate-900 transition cursor-pointer font-bold">
                <Upload className="w-3.5 h-3.5" />
                匯入紀錄
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-950/50 transition disabled:opacity-40 disabled:pointer-events-none font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空排行
            </button>
          </>
        )}
        
        {selectedTab === 'achievements' && (
          <p className="text-slate-500 italic mx-auto font-medium">挑戰高分、吞食特殊道具來解鎖滿滿成就！</p>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 z-20"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
            >
              <h3 className="font-bold text-lg text-white">確認清空排行榜？</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                這將會永久刪除所有儲存在本地的積分紀錄。該動作無法還原！建議在清空前先點擊「匯出紀錄」備份。
              </p>
              
              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium transition text-xs"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onClear();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 text-white hover:bg-rose-500 font-medium transition text-xs shadow-lg shadow-rose-950/20"
                >
                  確認刪除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
