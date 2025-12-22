"use client";

import { useEffect, useRef, useState } from "react";
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
    isSessionActive,
    mood,
  } = useGameStore();
  const { stream, debug } = usePostureMonitor({ debug: isPostureDebugEnabled });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

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
  const phonePenaltyLabel = debug?.phonePenaltyActive ? "Cursed" : "Clear";
  const moodLabel = mood === "demon" ? "INFERNAL" : mood.toUpperCase();
  const calibrationLabel =
    debug?.status === "calibrating"
      ? `Calibrating ${debug.calibrationFrames}/${debug.calibrationTarget}`
      : null;

  return (
    <div className={`posture-debug ${isMinimized ? "minimized" : ""}`}>
      <div className="posture-header">
        <span>Infernal Popout</span>
        <button type="button" onClick={() => setIsMinimized((prev) => !prev)}>
          {isMinimized ? "Expand" : "Minimize"}
        </button>
      </div>
      {isMinimized ? (
        <div className="posture-mini">
          <div className="posture-mascot">
            <div
              className={`companion-container ${mood}`}
              style={{ position: "static", right: "auto", bottom: "auto" }}
            >
              <div className="companion-body">
                <div className="companion-antenna">
                  <div className="antenna-ball" />
                </div>
                <div className="companion-face">
                  <div className="companion-eyes">
                    <div className="eye left">
                      <div className="pupil" />
                    </div>
                    <div className="eye right">
                      <div className="pupil" />
                    </div>
                  </div>
                  <div className="companion-mouth" />
                </div>
                {mood === "demon" && (
                  <div className="demon-tentacles">
                    <div className="tentacle t1" />
                    <div className="tentacle t2" />
                    <div className="tentacle t3" />
                    <div className="tentacle t4" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="posture-mini-info">
            <div className={`mood-pill ${mood}`}>{moodLabel}</div>
            <div className={`status ${status}`}>{statusLabel}</div>
            {debug?.phonePenaltyActive ? (
              <div className="posture-mini-warning">Phone ban</div>
            ) : (
              <div className="posture-mini-ok">Phone clear</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="posture-body">
            <div className="posture-mascot-row">
              <div className="posture-mascot">
                <div
                  className={`companion-container ${mood}`}
                  style={{ position: "static", right: "auto", bottom: "auto" }}
                >
                  <div className="companion-body">
                    <div className="companion-antenna">
                      <div className="antenna-ball" />
                    </div>
                    <div className="companion-face">
                      <div className="companion-eyes">
                        <div className="eye left">
                          <div className="pupil" />
                        </div>
                        <div className="eye right">
                          <div className="pupil" />
                        </div>
                      </div>
                      <div className="companion-mouth" />
                    </div>
                    {mood === "demon" && (
                      <div className="demon-tentacles">
                        <div className="tentacle t1" />
                        <div className="tentacle t2" />
                        <div className="tentacle t3" />
                        <div className="tentacle t4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="posture-mascot-info">
                <div className={`mood-pill ${mood}`}>{moodLabel}</div>
                <div className="posture-mascot-meta">
                  <span className={`status ${status}`}>{statusLabel}</span>
                  <span>{isSessionActive ? "Session active" : "Session paused"}</span>
                  <span className={debug?.phonePenaltyActive ? "lock" : "clear"}>
                    Phone {phonePenaltyLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="posture-video">
              {stream ? (
                <video ref={videoRef} autoPlay playsInline muted />
              ) : (
                <div className="posture-placeholder">Camera inactive</div>
              )}
            </div>
            <div className="posture-stats">
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
              <div className="angles">
                <span>Yaw</span>
                <strong>{formatAngle(debug?.yaw ?? null)}</strong>
                <span>Pitch</span>
                <strong>{formatAngle(debug?.pitch ?? null)}</strong>
                <span>Roll</span>
                <strong>{formatAngle(debug?.roll ?? null)}</strong>
              </div>
              {debug?.yawDelta != null &&
              debug?.pitchDelta != null &&
              debug?.rollDelta != null ? (
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
            <div className="posture-warning">
              Phone ban: cast it aside and raise both hands.
            </div>
          ) : null}
          {debug?.error ? <div className="posture-error">{debug.error}</div> : null}
        </>
      )}
      <style jsx>{`
        .posture-debug {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: 300px;
          background: rgba(16, 9, 10, 0.95);
          border: 1px solid var(--edge);
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
          z-index: 9999;
          font-size: 0.75rem;
          color: var(--foreground);
          backdrop-filter: blur(6px);
        }
        .posture-debug.minimized {
          width: 220px;
        }
        .posture-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid var(--edge);
          font-weight: 700;
        }
        .posture-header button {
          border: none;
          background: #2a1516;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.7rem;
          color: var(--foreground);
          cursor: pointer;
        }
        .posture-mini {
          padding: 10px 12px 12px;
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 10px;
          align-items: center;
        }
        .posture-mini-info {
          display: grid;
          gap: 6px;
          font-size: 0.75rem;
        }
        .posture-mini-warning {
          color: #f97316;
          font-weight: 700;
        }
        .posture-mini-ok {
          color: #facc15;
          font-weight: 700;
        }
        .posture-body {
          padding: 10px 12px;
          display: grid;
          gap: 10px;
        }
        .posture-mascot-row {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 10px;
          align-items: center;
        }
        .posture-mascot {
          transform: scale(0.7);
          transform-origin: top left;
        }
        .posture-mascot .companion-container {
          position: static;
          right: auto;
          bottom: auto;
          z-index: auto;
          gap: 6px;
        }
        .posture-mascot-info {
          display: grid;
          gap: 6px;
        }
        .posture-mascot-meta {
          display: grid;
          gap: 4px;
          color: var(--muted);
          font-size: 0.7rem;
        }
        .posture-mascot-meta .lock {
          color: var(--accent);
          font-weight: 700;
        }
        .posture-mascot-meta .clear {
          color: #facc15;
          font-weight: 700;
        }
        .posture-video {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          background: #050406;
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
          color: rgba(247, 231, 214, 0.7);
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
          color: var(--muted);
        }
        .stat span {
          color: var(--muted);
        }
        .mood-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: #2a1516;
          color: var(--foreground);
        }
        .mood-pill.happy {
          background: #fef08a;
          color: #854d0e;
        }
        .mood-pill.suspicious {
          background: #fdba74;
          color: #9a3412;
        }
        .mood-pill.angry {
          background: #fecaca;
          color: #991b1b;
        }
        .mood-pill.demon {
          background: #1a0f10;
          color: #f87171;
        }
        .status.tracking {
          color: #facc15;
        }
        .status.calibrating {
          color: #f97316;
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
          border-top: 1px solid var(--edge);
          color: #f97316;
          font-weight: 600;
        }
        .posture-error {
          padding: 8px 12px;
          border-top: 1px solid #3a0f12;
          color: #dc2626;
          font-weight: 600;
        }
        .posture-warning {
          padding: 8px 12px;
          border-top: 1px solid #3a1a0d;
          color: #f59e0b;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
