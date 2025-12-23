"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const popupVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream && !isPoppedOut) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream, isPoppedOut]);

  // Update popup window content
  useEffect(() => {
    if (!isPoppedOut || !popupRef.current || popupRef.current.closed) return;
    
    const popup = popupRef.current;
    const doc = popup.document;
    
    // Update status values
    const statusEl = doc.getElementById("status");
    const faceEl = doc.getElementById("face");
    const postureEl = doc.getElementById("posture");
    const gazeEl = doc.getElementById("gaze");
    const downEl = doc.getElementById("down");
    const phoneEl = doc.getElementById("phone");
    const handsEl = doc.getElementById("hands");
    const handsUpEl = doc.getElementById("handsUp");
    const moodEl = doc.getElementById("mood");
    const yawEl = doc.getElementById("yaw");
    const pitchEl = doc.getElementById("pitch");
    const rollEl = doc.getElementById("roll");
    const dyEl = doc.getElementById("dy");
    const dpEl = doc.getElementById("dp");
    const drEl = doc.getElementById("dr");
    const warningEl = doc.getElementById("warning");
    const calibrationEl = doc.getElementById("calibration");

    if (statusEl) statusEl.textContent = STATUS_LABELS[debug?.status ?? "inactive"] ?? debug?.status ?? "inactive";
    if (faceEl) faceEl.textContent = debug?.hasFace ? "Yes" : "No";
    if (postureEl) postureEl.textContent = debug?.isSittingStraight === null ? "--" : debug?.isSittingStraight ? "Straight" : "Slouching";
    if (gazeEl) gazeEl.textContent = debug?.isLookingForward === null ? "--" : debug?.isLookingForward ? "On screen" : "Away";
    if (downEl) downEl.textContent = debug?.isLookingDown === null ? "--" : debug?.isLookingDown ? "Yes" : "No";
    if (phoneEl) phoneEl.textContent = debug?.hasPhone ? "Yes" : "No";
    if (handsEl) handsEl.textContent = debug ? String(debug.handsDetected) : "--";
    if (handsUpEl) handsUpEl.textContent = debug?.handsUp === null ? "--" : debug?.handsUp ? "Yes" : "No";
    if (moodEl) {
      moodEl.textContent = mood === "demon" ? "INFERNAL" : mood.toUpperCase();
      moodEl.className = `mood-pill ${mood}`;
    }
    if (yawEl) yawEl.textContent = formatAngle(debug?.yaw ?? null);
    if (pitchEl) pitchEl.textContent = formatAngle(debug?.pitch ?? null);
    if (rollEl) rollEl.textContent = formatAngle(debug?.roll ?? null);
    if (dyEl) dyEl.textContent = formatAngle(debug?.yawDelta ?? null);
    if (dpEl) dpEl.textContent = formatAngle(debug?.pitchDelta ?? null);
    if (drEl) drEl.textContent = formatAngle(debug?.rollDelta ?? null);
    if (warningEl) warningEl.style.display = debug?.phonePenaltyActive ? "block" : "none";
    if (calibrationEl) {
      calibrationEl.style.display = debug?.status === "calibrating" ? "block" : "none";
      calibrationEl.textContent = `Calibrating ${debug?.calibrationFrames ?? 0}/${debug?.calibrationTarget ?? 12}`;
    }

    // Update body class for mood
    doc.body.className = `mood-${mood}`;
  }, [debug, mood, isPoppedOut]);

  // Set up video in popup
  useEffect(() => {
    if (!isPoppedOut || !popupRef.current || popupRef.current.closed || !stream) return;
    
    const popup = popupRef.current;
    const video = popup.document.getElementById("video") as HTMLVideoElement;
    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [stream, isPoppedOut]);

  const handlePopOut = useCallback(() => {
    if (isPoppedOut && popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const popup = window.open(
      "",
      "PostureMonitor",
      "width=420,height=650,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no"
    );
    
    if (!popup) {
      alert("Please allow popups for this site");
      return;
    }

    popupRef.current = popup;
    setIsPoppedOut(true);

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>👁️ Infernal Eye</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --bg: #0a0506;
            --surface: rgba(16, 9, 10, 0.95);
            --edge: rgba(139, 69, 69, 0.25);
            --foreground: #f7e7d6;
            --muted: rgba(247, 231, 214, 0.6);
            --accent: #dc2626;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--foreground);
            min-height: 100vh;
            padding: 16px;
          }
          body.mood-demon { background: linear-gradient(180deg, #1a0506 0%, #0a0203 100%); }
          body.mood-angry { background: linear-gradient(180deg, #1a0808 0%, #0a0303 100%); }
          body.mood-suspicious { background: linear-gradient(180deg, #1a0f06 0%, #0a0603 100%); }
          body.mood-happy { background: linear-gradient(180deg, #0f1a0a 0%, #050a03 100%); }
          
          .container {
            background: var(--surface);
            border: 1px solid var(--edge);
            border-radius: 16px;
            overflow: hidden;
            backdrop-filter: blur(10px);
          }
          .header {
            padding: 14px 16px;
            border-bottom: 1px solid var(--edge);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 1rem;
          }
          .header-icon { font-size: 1.2rem; margin-right: 8px; }
          .body { padding: 16px; display: grid; gap: 14px; }
          
          .video-container {
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            background: #050406;
            aspect-ratio: 4 / 3;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
          }
          
          .mood-pill {
            display: inline-flex;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            background: #2a1516;
            color: var(--foreground);
          }
          .mood-pill.happy { background: #fef08a; color: #854d0e; }
          .mood-pill.suspicious { background: #fdba74; color: #9a3412; }
          .mood-pill.angry { background: #fecaca; color: #991b1b; }
          .mood-pill.demon { background: #1a0f10; color: #f87171; animation: pulse 2s infinite; }
          
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(248, 113, 113, 0.5); }
            50% { box-shadow: 0 0 25px rgba(248, 113, 113, 0.8); }
          }
          
          .stats { display: grid; gap: 8px; }
          .stat {
            display: grid;
            grid-template-columns: 1fr auto;
            padding: 8px 12px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            font-size: 0.85rem;
          }
          .stat span { color: var(--muted); }
          .stat strong { color: var(--foreground); }
          
          .angles-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .angle {
            text-align: center;
            padding: 8px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            font-size: 0.75rem;
          }
          .angle span { display: block; color: var(--muted); margin-bottom: 4px; }
          .angle strong { color: var(--foreground); }
          
          .warning {
            padding: 12px;
            background: rgba(249, 115, 22, 0.15);
            border: 1px solid rgba(249, 115, 22, 0.3);
            border-radius: 8px;
            color: #f97316;
            font-weight: 600;
            text-align: center;
            animation: warningPulse 1.5s infinite;
          }
          @keyframes warningPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          .calibration {
            padding: 10px;
            background: rgba(249, 115, 22, 0.1);
            border-radius: 8px;
            color: #f97316;
            font-weight: 600;
            text-align: center;
          }
        </style>
      </head>
      <body class="mood-${mood}">
        <div class="container">
          <div class="header">
            <span><span class="header-icon">👁️</span>Infernal Eye</span>
            <span id="mood" class="mood-pill ${mood}">${mood === "demon" ? "INFERNAL" : mood.toUpperCase()}</span>
          </div>
          <div class="body">
            <div class="video-container">
              <video id="video" autoplay playsinline muted></video>
            </div>
            <div id="calibration" class="calibration" style="display:none;">Calibrating...</div>
            <div id="warning" class="warning" style="display:none;">⚠️ PHONE DETECTED - Put it away & raise both hands!</div>
            <div class="stats">
              <div class="stat"><span>Status</span><strong id="status">--</strong></div>
              <div class="stat"><span>Face Detected</span><strong id="face">--</strong></div>
              <div class="stat"><span>Posture</span><strong id="posture">--</strong></div>
              <div class="stat"><span>Gaze</span><strong id="gaze">--</strong></div>
              <div class="stat"><span>Looking Down</span><strong id="down">--</strong></div>
              <div class="stat"><span>Phone Detected</span><strong id="phone">--</strong></div>
              <div class="stat"><span>Hands Visible</span><strong id="hands">--</strong></div>
              <div class="stat"><span>Hands Up</span><strong id="handsUp">--</strong></div>
            </div>
            <div class="angles-row">
              <div class="angle"><span>Yaw</span><strong id="yaw">--</strong></div>
              <div class="angle"><span>Pitch</span><strong id="pitch">--</strong></div>
              <div class="angle"><span>Roll</span><strong id="roll">--</strong></div>
            </div>
            <div class="angles-row">
              <div class="angle"><span>ΔYaw</span><strong id="dy">--</strong></div>
              <div class="angle"><span>ΔPitch</span><strong id="dp">--</strong></div>
              <div class="angle"><span>ΔRoll</span><strong id="dr">--</strong></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    popup.document.close();

    // Handle popup close
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setIsPoppedOut(false);
        popupRef.current = null;
      }
    }, 500);

    // Set video stream
    setTimeout(() => {
      if (stream && !popup.closed) {
        const video = popup.document.getElementById("video") as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => {});
        }
      }
    }, 100);
  }, [isPoppedOut, stream, mood]);

  // Clean up popup on unmount
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  if (!isPostureMonitoringEnabled || !isPostureDebugEnabled) {
    return null;
  }

  // If popped out, show minimal indicator
  if (isPoppedOut) {
    return (
      <div className="posture-debug minimized popped-out">
        <div className="posture-header">
          <span>👁️ Popped Out</span>
          <button type="button" onClick={handlePopOut}>
            Focus
          </button>
        </div>
        <style jsx>{`
          .posture-debug {
            position: fixed;
            right: 18px;
            bottom: 18px;
            width: 160px;
            background: rgba(16, 9, 10, 0.95);
            border: 1px solid var(--edge);
            border-radius: 14px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
            z-index: 9999;
            font-size: 0.75rem;
            color: var(--foreground);
            backdrop-filter: blur(6px);
          }
          .posture-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
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
          .posture-header button:hover {
            background: #3a2526;
          }
        `}</style>
      </div>
    );
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
        <span>👁️ Infernal Eye</span>
        <div className="header-buttons">
          <button type="button" className="popout-btn" onClick={handlePopOut} title="Pop out to separate window">
            ↗
          </button>
          <button type="button" onClick={() => setIsMinimized((prev) => !prev)}>
            {isMinimized ? "+" : "−"}
          </button>
        </div>
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
        .header-buttons {
          display: flex;
          gap: 6px;
        }
        .posture-header button {
          border: none;
          background: #2a1516;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.7rem;
          color: var(--foreground);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .posture-header button:hover {
          background: #3a2526;
          transform: scale(1.05);
        }
        .popout-btn {
          font-size: 0.85rem !important;
          padding: 3px 8px !important;
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
