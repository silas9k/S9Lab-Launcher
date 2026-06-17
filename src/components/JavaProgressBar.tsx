import React from "react";
import { useJavaProgress } from "../hooks/useJavaProgress";

export default function JavaProgressBar() {
  const { percent, speed, stage } = useJavaProgress();

  return (
    <div style={{
      width: "100%",
      padding: "12px",
      borderRadius: "8px",
      background: "#111",
      color: "white"
    }}>
      <div style={{ marginBottom: 8 }}>{stage}</div>

      <div style={{
        width: "100%",
        height: 10,
        background: "#222",
        borderRadius: 5,
        overflow: "hidden"
      }}>
        <div style={{
          width: `${percent}%`,
          height: "100%",
          background: "#4ade80",
          transition: "width 0.2s ease"
        }} />
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        {percent.toFixed(1)}% • {speed.toFixed(2)} MB/s
      </div>
    </div>
  );
}
