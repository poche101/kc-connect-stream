import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, PictureInPicture2, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError } from "@/lib/app-error";

type Level = { index: number; label: string };

/**
 * Adaptive HLS broadcast player with manual quality control (low-data mode),
 * picture-in-picture and fullscreen. Falls back to an iframe embed when the
 * meeting only provides an embed URL.
 */
export function MeetingPlayer({
  streamUrl,
  embedUrl,
  live,
}: {
  streamUrl: string | null;
  embedUrl: string | null;
  live: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [quality, setQuality] = useState("auto");
  const [muted, setMuted] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels.map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`,
          })),
        );
        void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) showError("The live stream connection dropped. Retrying…", "Stream error");
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    video.src = streamUrl;
    void video.play().catch(() => undefined);
    return undefined;
  }, [streamUrl]);

  // Keep the fullscreen / PiP buttons in sync with the browser's real state.
  useEffect(() => {
    const video = videoRef.current;
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onEnterPip = () => setPipActive(true);
    const onLeavePip = () => setPipActive(false);
    document.addEventListener("fullscreenchange", onFullscreen);
    video?.addEventListener("enterpictureinpicture", onEnterPip);
    video?.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      video?.removeEventListener("enterpictureinpicture", onEnterPip);
      video?.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, [streamUrl]);

  function changeQuality(value: string) {
    setQuality(value);
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = value === "auto" ? -1 : Number(value);
  }

  async function togglePip() {
    const video = videoRef.current;
    if (!video) return;
    if (!("pictureInPictureEnabled" in document) || !document.pictureInPictureEnabled) {
      showError("Picture-in-picture is not available in this browser.", "Not supported");
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      // PiP needs decoded video frames — start playback first.
      if (video.readyState < 1) {
        showError("Picture-in-picture is ready once the broadcast starts playing.", "Not ready yet");
        return;
      }
      if (video.paused) await video.play().catch(() => undefined);
      await video.requestPictureInPicture();
    } catch {
      showError(
        "Picture-in-picture was blocked. Tap the video once, then try again.",
        "Picture-in-picture unavailable",
      );
    }
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (document.pictureInPictureElement) await document.exitPictureInPicture().catch(() => undefined);

      if (shell.requestFullscreen) {
        await shell.requestFullscreen();
        return;
      }
      const legacy = videoRef.current as
        | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        | null;
      if (legacy?.webkitEnterFullscreen) {
        legacy.webkitEnterFullscreen();
        return;
      }
      showError("Fullscreen is not available in this browser.", "Not supported");
    } catch {
      showError(
        "Fullscreen was blocked by the browser. Try again, or use your browser's fullscreen control.",
        "Fullscreen unavailable",
      );
    }
  }

  if (!streamUrl && embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-stage-border bg-stage">
        <iframe
          src={embedUrl}
          title="Live meeting stream"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  if (!streamUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-stage-border bg-stage text-stage-foreground/70">
        <span className="font-display text-lg">
          {live ? "Waiting for the host's stream…" : "The meeting has not started yet"}
        </span>
        <p className="max-w-sm text-center text-sm text-stage-foreground/50">
          This page updates automatically the moment the host goes live.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className="overflow-hidden rounded-2xl border border-stage-border bg-stage"
    >
      <div className={isFullscreen ? "relative h-[calc(100vh-3.5rem)] w-full" : "relative aspect-video w-full"}>
        <video
          ref={videoRef}
          playsInline
          muted={muted}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          className="size-full bg-stage object-contain"
        />
        {buffering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stage/40">
            <Loader2 className="size-7 animate-spin text-stage-foreground/80" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-stage-border px-3 py-2.5">
        <Button variant="stage" size="sm" onClick={() => setMuted((m) => !m)}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {muted ? "Unmute" : "Mute"}
        </Button>
        <Select value={quality} onValueChange={changeQuality}>
          <SelectTrigger className="h-8 w-[132px] border-stage-border bg-stage-muted text-stage-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto quality</SelectItem>
            {levels.map((level) => (
              <SelectItem key={level.index} value={String(level.index)}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="stage" size="sm" onClick={() => void togglePip()}>
            <PictureInPicture2 className="size-4" />
            {pipActive ? "Exit PiP" : "PiP"}
          </Button>
          <Button variant="stage" size="sm" onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
