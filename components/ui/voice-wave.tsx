"use client";

import React, { useEffect, useRef, useState } from "react";

interface VoiceWaveProps {
  analyser: AnalyserNode | null;
}

export function VoiceWave({ analyser }: VoiceWaveProps) {
  const [heights, setHeights] = useState<number[]>([4, 10, 6, 12, 8, 10, 4]);
  const animationRef = useRef<number>(undefined);

  useEffect(() => {
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Extract average volumes from different frequency bands
      // Using indices that spread across the vocal range
      const nextHeights = [
        Math.max(4, (dataArray[2] / 255) * 16),
        Math.max(6, (dataArray[8] / 255) * 20),
        Math.max(4, (dataArray[15] / 255) * 24),
        Math.max(8, (dataArray[25] / 255) * 28),
        Math.max(4, (dataArray[40] / 255) * 24),
        Math.max(6, (dataArray[60] / 255) * 20),
        Math.max(4, (dataArray[80] / 255) * 16),
      ];
      
      setHeights(nextHeights);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  return (
    <div className="flex items-center gap-[4px] px-3 py-1 bg-red-50/80 dark:bg-red-950/20 rounded-full border border-red-200/50 dark:border-red-800/30 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)] backdrop-blur-sm h-8">
      <div className="flex items-end gap-[3px] h-5 mr-1">
        {heights.map((h, i) => (
          <div
            key={i}
            className="w-[3px] bg-gradient-to-t from-red-600 to-red-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_8px_rgba(239,68,68,0.4)]"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-l border-red-200 dark:border-red-800/50 pl-2 ml-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
        <span className="text-[10px] font-black text-red-600 dark:text-red-500 uppercase tracking-wider animate-pulse">
          REC
        </span>
      </div>
    </div>
  );
}
