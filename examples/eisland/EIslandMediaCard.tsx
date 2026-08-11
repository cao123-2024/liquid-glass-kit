import type { ChangeEvent } from "react";

import type { LiquidGlassSettings } from "../../src/core/types";
import { LiquidGlass, LiquidGlassGroup } from "../../src/react";
import "../../src/styles/liquid-glass.css";

export interface EIslandMediaCardProps {
  title: string;
  artist: string;
  playing: boolean;
  volume: number;
  settings?: Partial<LiquidGlassSettings>;
  onTogglePlayback: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (volume: number) => void;
}

export function EIslandMediaCard({
  title,
  artist,
  playing,
  volume,
  settings,
  onTogglePlayback,
  onPrevious,
  onNext,
  onVolumeChange,
}: EIslandMediaCardProps) {
  const handleVolume = (event: ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(Number(event.currentTarget.value));
  };

  return (
    <LiquidGlassGroup className="eisland-liquid-area" settings={settings}>
      <LiquidGlass as="section" glassId="media-card" className="eisland-media-card" aria-label="媒体播放">
        <div className="eisland-media-copy">
          <span>NOW PLAYING</span>
          <strong>{title}</strong>
          <small>{artist}</small>
        </div>

        <div className="eisland-media-actions">
          <LiquidGlass as="button" glassId="previous" type="button" aria-label="上一首" onClick={onPrevious}>
            <svg viewBox="0 0 24 24" role="img" aria-label="上一首图标">
              <path d="M6.5 5v14M18 6.5 9.5 12l8.5 5.5z" fill="none" stroke="currentColor" />
            </svg>
          </LiquidGlass>
          <LiquidGlass
            as="button"
            glassId="playback"
            type="button"
            aria-label={playing ? "暂停" : "播放"}
            onClick={onTogglePlayback}
          >
            <svg viewBox="0 0 24 24" role="img" aria-label={playing ? "暂停图标" : "播放图标"}>
              <path
                d={playing ? "M8.5 6.5v11M15.5 6.5v11" : "m9 6 9 6-9 6z"}
                fill="none"
                stroke="currentColor"
              />
            </svg>
          </LiquidGlass>
          <LiquidGlass as="button" glassId="next" type="button" aria-label="下一首" onClick={onNext}>
            <svg viewBox="0 0 24 24" role="img" aria-label="下一首图标">
              <path d="M17.5 5v14M6 6.5l8.5 5.5L6 17.5z" fill="none" stroke="currentColor" />
            </svg>
          </LiquidGlass>
        </div>

        <label data-liquid-glass-static>
          <span>音量</span>
          <input type="range" min="0" max="100" value={volume} onChange={handleVolume} />
        </label>
      </LiquidGlass>
    </LiquidGlassGroup>
  );
}
