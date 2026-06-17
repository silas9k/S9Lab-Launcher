import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export function useJavaProgress() {
  const [progress, setProgress] = useState({
    percent: 0,
    speed: 0,
    stage: "Idle",
  });

useEffect(() => {
  let unlisten: (() => void) | undefined;

  listen("java-progress", (event: any) => {
    const d = event.payload;

    setProgress((prev) => ({
      percent: prev.percent + (d.percent - prev.percent) * 0.15,
      speed: d.speed_mb,
      stage: d.stage,
    }));
  }).then((fn) => {
    unlisten = fn;
  });

  return () => {
    if (unlisten) unlisten();
  };
}, []);

  return progress;
}
