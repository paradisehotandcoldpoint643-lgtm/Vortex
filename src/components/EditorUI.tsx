import React from 'react';
import { MousePointer2, Eraser, Plus, Save, RotateCcw, Box, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HandGesture } from '../types';

interface EditorUIProps {
  currentGesture: HandGesture;
  currentColor: string;
  onColorChange: (color: string) => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  toggleHelp: () => void;
  isTracking: boolean;
}

const COLORS = [
  '#FF5F5F', '#5FFF5F', '#5F5FFF', '#FFFF5F', '#5FFFFF', '#FF5FFF', 
  '#FFFFFF', '#333333', '#FF9F5F', '#9F5FFF'
];

export const EditorUI: React.FC<EditorUIProps> = ({
  currentGesture,
  currentColor,
  onColorChange,
  onClear,
  onSave,
  onLoad,
  toggleHelp,
  isTracking
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-6 overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
              <Box className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-white font-bold leading-none tracking-tight">VOXEL_VISION</h1>
              <div className="text-[10px] text-white/40 font-mono mt-1 uppercase">
                Status: {isTracking ? <span className="text-emerald-400">Tracking Active</span> : <span className="text-rose-400">Searching for hand...</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={onSave}
            className="p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            title="Save Project"
          >
            <Save size={20} />
          </button>
          <button 
             onClick={onLoad}
             className="p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
             title="Load Project"
          >
            <RotateCcw size={20} />
          </button>
          <button 
             onClick={toggleHelp}
             className="p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      {/* Center - Gesture Indicator */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentGesture !== 'none' && (
            <motion.div
              key={currentGesture}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-full px-8 py-3 flex items-center gap-4"
            >
              <div className="text-cyan-400 font-mono text-sm uppercase tracking-widest font-bold">
                {currentGesture}
              </div>
              <div className="w-px h-4 bg-white/20" />
              {currentGesture === 'pinch' && <Plus className="text-emerald-400" size={20} />}
              {currentGesture === 'open' && <Eraser className="text-rose-400" size={20} />}
              {currentGesture === 'pointing' && <MousePointer2 className="text-cyan-400" size={20} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-between items-end">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 pointer-events-auto max-w-sm">
          <div className="text-[10px] text-white/40 font-mono uppercase mb-3">Color Palette</div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-8 h-8 rounded-md transition-transform hover:scale-110 active:scale-95 border-2 ${currentColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <button 
          onClick={onClear}
          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 px-6 py-3 rounded-lg flex items-center gap-2 font-bold pointer-events-auto transition-all"
        >
          <RotateCcw size={18} />
          CLEAR VOXELS
        </button>
      </div>
    </div>
  );
};
