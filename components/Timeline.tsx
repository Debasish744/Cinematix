
import React from 'react';
import { SceneBreakdown } from '../types';

interface TimelineProps {
  breakdown: SceneBreakdown[];
  totalDuration: number;
}

export const Timeline: React.FC<TimelineProps> = ({ breakdown, totalDuration }) => {
  return (
    <div className="w-full bg-slate-900/50 rounded-xl p-6 border border-slate-800">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <i className="fa-solid fa-timeline mr-2 text-indigo-400"></i>
        Production Timeline
      </h3>
      <div className="relative h-32 flex items-stretch gap-1">
        {breakdown.map((scene, idx) => {
          const widthPercent = (scene.duration / totalDuration) * 100;
          return (
            <div 
              key={idx}
              className="group relative flex flex-col justify-end"
              style={{ width: `${widthPercent}%` }}
            >
              <div className="bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-lg p-2 h-full flex flex-col justify-center items-center overflow-hidden border border-indigo-300/20 hover:scale-[1.02] transition-transform cursor-help">
                <span className="text-[10px] font-bold text-white uppercase tracking-tighter opacity-80">
                  {scene.type.replace('_', ' ')}
                </span>
                <span className="text-sm font-bold text-white">
                  {scene.duration}s
                </span>
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="text-xs font-semibold text-indigo-300 mb-1">{scene.camera}</div>
                <div className="text-[10px] text-slate-300 leading-relaxed line-clamp-3">
                  {scene.description}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-r border-b border-slate-700 rotate-45"></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        <span>0s</span>
        <span>{totalDuration}s</span>
      </div>
    </div>
  );
};
