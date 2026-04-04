"use client";

import React, { useEffect, useRef, useState } from "react";

interface VoiceWaveProps {
  analyser: AnalyserNode | null;
}

export function VoiceWave({ analyser }: VoiceWaveProps) {
  const [heights, setHeights] = useState<number[]>([4, 10, 6, 12, 4]);
  const animationRef = useRef<number>(undefined);

  useEffect(() => {
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Extract average volumes from different frequency bands
      // Using small offsets to get varied motion across the bars
      const nextHeights = [
        Math.max(4, (dataArray[5] / 255) * 18),
        Math.max(4, (dataArray[15] / 255) * 22),
        Math.max(4, (dataArray[25] / 255) * 26),
        Math.max(4, (dataArray[35] / 255) * 22),
        Math.max(4, (dataArray[45] / 255) * 18),
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
    <div className="flex items-end gap-[3px] h-5 px-2 bg-red-50 dark:bg-red-950/30 rounded-full border border-red-100 dark:border-red-900/50 pb-[3px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-red-500 rounded-full transition-all duration-100 ease-out"
          style={{ height: `${h}px` }}
        />
      ))}
      <span className="text-[9px] font-black text-red-600 ml-1 uppercase tracking-tighter self-center animate-pulse">
        REC
      </span>
    </div>
  );
}
