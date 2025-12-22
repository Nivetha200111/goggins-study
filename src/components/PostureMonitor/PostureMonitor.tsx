"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { usePostureMonitor } from "@/hooks/usePostureMonitor";

const STATUS_LABELS: Record<string, string> = {
  inactive: "Inactive",
  initializing: "Starting",
  calibrating: "Calibrating",
  tracking: "Tracking",
  "no-face": "No Face",
  error: "Error",
};

function formatAngle(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)} deg`;
}

export function PostureMonitor() {
  const {
    isPostureMonitoringEnabled,
    isPostureDebugEnabled,
    togglePostureDebug,
    isSessionActive,
  } = useGameStore();
  const { stream, debug } = usePostureMonitor({ debug: isPostureDebugEnabled });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  if (!isPostureMonitoringEnabled || !isPostureDebugEnabled) {
    return null;
  }

  const status = debug?.status ?? "inactive";
  const statusLabel = STATUS_LABELS[status] ?? status;
  const faceLabel = debug?.hasFace ? "Yes" : "No";
  const postureLabel =
    debug?.isSittingStraight === null
      ? "--"
      : debug?.isSittingStraight
        ? "Straight"
        : "Slouching";
  const gazeLabel =
    debug?.isLookingForward === null
      ? "--"
      : debug?.isLookingForward
        ? "On screen"
        : "Away";
  const downLabel =
    debug?.isLookingDown === null ? "--" : debug?.isLookingDown ? "Yes" : "No";
  const phoneLabel = debug?.hasPhone ? "Yes" : "No";
  const handsLabel = debug ? String(debug.handsDetected) : "--";
  const handsUpLabel =
    debug?.handsUp === null ? "--" : debug?.handsUp ? "Yes" : "No";
  const phonePenaltyLabel = debug?.phonePenaltyActive ? "Active" : "Clear";
  const calibrationLabel =
    debug?.status === "calibrating"
      ? `Calibrating ${debug.calibrationFrames}/${debug.calibrationTarget}`
      : null;

  return (
    <div className="posture-debug">
      <div className="posture-header">
        <span>Posture Debug</span>
        <button type="button" onClick={togglePostureDebug}>
          Hide
        </button>
      </div>
      <div className="posture-body">
        <div className="posture-video">
          {stream ? (
            <video ref={videoRef} autoPlay playsInline muted />
          ) : (
            <div className="posture-placeholder">Camera inactive</div>
          )}
        </div>
        <div className="posture-stats">
          <div className="stat">
            <span>Status</span>
            <strong className={`status ${status}`}>{statusLabel}</strong>
          </div>
          <div className="stat">
            <span>Session</span>
            <strong>{isSessionActive ? "Active" : "Paused"}</strong>
          </div>
          <div className="stat">
            <span>Face</span>
            <strong>{faceLabel}</strong>
          </div>
          <div className="stat">
            <span>Posture</span>
            <strong>{postureLabel}</strong>
          </div>
          <div className="stat">
            <span>Gaze</span>
            <strong>{gazeLabel}</strong>
          </div>
          <div className="stat">
            <span>Down</span>
            <strong>{downLabel}</strong>
          </div>
          <div className="stat">
            <span>Phone</span>
            <strong>{phoneLabel}</strong>
          </div>
          <div className="stat">
            <span>Hands</span>
            <strong>{handsLabel}</strong>
          </div>
          <div className="stat">
            <span>Hands Up</span>
            <strong>{handsUpLabel}</strong>
          </div>
          <div className="stat">
            <span>Phone Lock</span>
            <strong className={debug?.phonePenaltyActive ? "status error" : undefined}>
              {phonePenaltyLabel}
            </strong>
          </div>
          <div className="angles">
            <span>Yaw</span>
            <strong>{formatAngle(debug?.yaw ?? null)}</strong>
            <span>Pitch</span>
            <strong>{formatAngle(debug?.pitch ?? null)}</strong>
            <span>Roll</span>
            <strong>{formatAngle(debug?.roll ?? null)}</strong>
          </div>
          {debug?.yawDelta != null && debug?.pitchDelta != null && debug?.rollDelta != null ? (
            <div className="angles">
              <span>Dy</span>
              <strong>{formatAngle(debug.yawDelta)}</strong>
              <span>Dp</span>
              <strong>{formatAngle(debug.pitchDelta)}</strong>
              <span>Dr</span>
              <strong>{formatAngle(debug.rollDelta)}</strong>
            </div>
          ) : null}
        </div>
      </div>
      {calibrationLabel ? <div className="posture-note">{calibrationLabel}</div> : null}
      {debug?.phonePenaltyActive ? (
        <div className="posture-warning">Phone lock: put it away and raise both hands.</div>
      ) : null}
      {debug?.error ? <div className="posture-error">{debug.error}</div> : null}
      <style jsx>{`
        .posture-debug {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: 280px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          z-index: 9999;
          font-size: 0.75rem;
          color: #1a1d2f;
          backdrop-filter: blur(6px);
        }
        .posture-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid #eef2f7;
          font-weight: 700;
        }
        .posture-header button {
          border: none;
          background: #f3f4f6;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.7rem;
          cursor: pointer;
        }
        .posture-body {
          padding: 10px 12px;
          display: grid;
          gap: 10px;
        }
        .posture-video {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          background: #0f172a;
          aspect-ratio: 4 / 3;
        }
        .posture-video video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .posture-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5f5;
          font-weight: 600;
        }
        .posture-stats {
          display: grid;
          gap: 6px;
        }
        .stat,
        .angles {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .angles {
          grid-template-columns: repeat(6, auto);
          gap: 6px;
          font-size: 0.7rem;
          color: #334155;
        }
        .stat span {
          color: #64748b;
        }
        .status.tracking {
          color: #16a34a;
        }
        .status.calibrating {
          color: #2563eb;
        }
        .status.no-face,
        .status.initializing {
          color: #f59e0b;
        }
        .status.error {
          color: #dc2626;
        }
        .posture-note {
          padding: 8px 12px;
          border-top: 1px solid #eef2f7;
          color: #2563eb;
          font-weight: 600;
        }
        .posture-error {
          padding: 8px 12px;
          border-top: 1px solid #fee2e2;
          color: #dc2626;
          font-weight: 600;
        }
        .posture-warning {
          padding: 8px 12px;
          border-top: 1px solid #fde68a;
          color: #92400e;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
