"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { useGameStore } from "@/store/gameStore";
import { useVoice } from "@/hooks/useVoice";

const RAD_TO_DEG = 180 / Math.PI;

const DETECTION_INTERVAL_MS = 350;
const CALIBRATION_FRAMES = 12;

const POSTURE_ALERT_MS = 3 * 60 * 1000;
const GAZE_ALERT_MS = 3 * 60 * 1000;
const LOOKING_DOWN_ALERT_MS = 20 * 1000;
const PHONE_ALERT_MS = 5 * 1000;
const ALERT_REPEAT_MS = 15 * 1000;

const THRESHOLDS = {
  yawAwayDeg: 24,
  pitchAwayDeg: 18,
  rollSlouchDeg: 18,
  pitchSlouchDeg: 18,
  pitchDownDeg: 20,
  ratioDownDelta: 0.08,
};

const PHONE_LABELS = new Set(["cell phone", "phone", "mobile phone", "smartphone"]);

type NormalizedLandmark = { x: number; y: number; z: number };
type FaceLandmarkerResult = {
  faceLandmarks?: NormalizedLandmark[][];
  facialTransformationMatrixes?: { data: Float32Array | number[] }[];
};
type ObjectDetectorResult = {
  detections?: { categories?: { categoryName?: string; score?: number }[] }[];
};

type HeadAngles = { yaw: number; pitch: number; roll: number };
type Baseline = HeadAngles & { noseRatio: number };

const VISION_WASM_PATH =
  process.env.NEXT_PUBLIC_VISION_WASM_PATH ||
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const FACE_MODEL_PATH =
  process.env.NEXT_PUBLIC_FACE_MODEL_PATH ||
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const OBJECT_MODEL_PATH =
  process.env.NEXT_PUBLIC_OBJECT_MODEL_PATH ||
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

function getHeadAngles(matrixData: Float32Array | number[]): HeadAngles {
  const m00 = matrixData[0];
  const m10 = matrixData[1];
  const m02 = matrixData[8];
  const m12 = matrixData[9];
  const m22 = matrixData[10];

  const forwardX = m02;
  const forwardY = m12;
  const forwardZ = m22;

  const yaw = Math.atan2(forwardX, forwardZ) * RAD_TO_DEG;
  const pitch =
    Math.atan2(-forwardY, Math.sqrt(forwardX * forwardX + forwardZ * forwardZ)) *
    RAD_TO_DEG;
  const roll = Math.atan2(m10, m00) * RAD_TO_DEG;

  return { yaw, pitch, roll };
}

function getNoseRatio(landmarks: NormalizedLandmark[]): number | null {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];
  const chin = landmarks[152];

  if (!leftEye || !rightEye || !nose || !chin) return null;

  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeToChin = chin.y - eyeMidY;
  if (eyeToChin <= 0) return null;

  return (nose.y - eyeMidY) / eyeToChin;
}

function averageBaseline(samples: Baseline[]): Baseline {
  const total = samples.reduce(
    (acc, sample) => ({
      yaw: acc.yaw + sample.yaw,
      pitch: acc.pitch + sample.pitch,
      roll: acc.roll + sample.roll,
      noseRatio: acc.noseRatio + sample.noseRatio,
    }),
    { yaw: 0, pitch: 0, roll: 0, noseRatio: 0 }
  );

  return {
    yaw: total.yaw / samples.length,
    pitch: total.pitch / samples.length,
    roll: total.roll / samples.length,
    noseRatio: total.noseRatio / samples.length,
  };
}

function hasPhoneDetection(result: ObjectDetectorResult | null): boolean {
  if (!result?.detections) return false;
  return result.detections.some((detection) =>
    detection.categories?.some((category) => {
      const label = category.categoryName?.toLowerCase() || "";
      const score = category.score ?? 0;
      return score > 0.5 && PHONE_LABELS.has(label);
    })
  );
}

export function usePostureMonitor() {
  const { isSessionActive, isMonitoringEnabled, isPostureMonitoringEnabled, addDistraction } =
    useGameStore();
  const { speak } = useVoice();

  const speakRef = useRef(speak);
  const addDistractionRef = useRef(addDistraction);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const objectDetectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  const baselineRef = useRef<Baseline | null>(null);
  const calibrationRef = useRef<Baseline[]>([]);

  const postureBadSinceRef = useRef<number | null>(null);
  const gazeAwaySinceRef = useRef<number | null>(null);
  const lookingDownSinceRef = useRef<number | null>(null);
  const phoneSinceRef = useRef<number | null>(null);
  const lastAlertRef = useRef<number>(0);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    addDistractionRef.current = addDistraction;
  }, [addDistraction]);

  useEffect(() => {
    if (!isSessionActive || !isMonitoringEnabled || !isPostureMonitoringEnabled) {
      return;
    }

    let cancelled = false;

    const resetState = () => {
      baselineRef.current = null;
      calibrationRef.current = [];
      postureBadSinceRef.current = null;
      gazeAwaySinceRef.current = null;
      lookingDownSinceRef.current = null;
      phoneSinceRef.current = null;
      lastAlertRef.current = 0;
    };

    const cleanup = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (faceLandmarkerRef.current?.close) {
        faceLandmarkerRef.current.close();
      }
      if (objectDetectorRef.current?.close) {
        objectDetectorRef.current.close();
      }
      faceLandmarkerRef.current = null;
      objectDetectorRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }

      resetState();
    };

    const updateTimer = (ref: MutableRefObject<number | null>, condition: boolean) => {
      const now = Date.now();
      if (condition) {
        if (ref.current === null) {
          ref.current = now;
        }
      } else {
        ref.current = null;
      }
    };

    const maybeAlert = (message: string) => {
      const now = Date.now();
      if (now - lastAlertRef.current < ALERT_REPEAT_MS) return;
      lastAlertRef.current = now;
      speakRef.current(message, true);
      addDistractionRef.current();
    };

    const startDetection = () => {
      const detect = () => {
        if (cancelled || !videoRef.current || !faceLandmarkerRef.current) {
          return;
        }

        const now = Date.now();
        if (now - lastFrameRef.current < DETECTION_INTERVAL_MS) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }
        lastFrameRef.current = now;

        const video = videoRef.current;
        if (video.readyState < 2) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        let faceResult: FaceLandmarkerResult | null = null;
        let objectResult: ObjectDetectorResult | null = null;
        try {
          faceResult = faceLandmarkerRef.current.detectForVideo(
            video,
            performance.now()
          ) as FaceLandmarkerResult;
          if (objectDetectorRef.current) {
            objectResult = objectDetectorRef.current.detectForVideo(
              video,
              performance.now()
            ) as ObjectDetectorResult;
          }
        } catch {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        const hasPhone = hasPhoneDetection(objectResult);
        updateTimer(phoneSinceRef, hasPhone);

        const faceLandmarks = faceResult?.faceLandmarks?.[0] || null;
        const transformMatrix = faceResult?.facialTransformationMatrixes?.[0]?.data;

        if (!faceLandmarks || !transformMatrix) {
          updateTimer(gazeAwaySinceRef, true);
          updateTimer(postureBadSinceRef, false);
          updateTimer(lookingDownSinceRef, false);
        } else {
          const noseRatio = getNoseRatio(faceLandmarks);
          const angles = getHeadAngles(transformMatrix as Float32Array);

          if (!baselineRef.current) {
            if (noseRatio !== null) {
              calibrationRef.current.push({ ...angles, noseRatio });
              if (calibrationRef.current.length >= CALIBRATION_FRAMES) {
                baselineRef.current = averageBaseline(calibrationRef.current);
                calibrationRef.current = [];
              }
            }
          } else if (noseRatio !== null) {
            const baseline = baselineRef.current;
            const pitchDelta = angles.pitch - baseline.pitch;
            const yawDelta = angles.yaw - baseline.yaw;
            const rollDelta = angles.roll - baseline.roll;
            const ratioDown = baseline.noseRatio - noseRatio > THRESHOLDS.ratioDownDelta;

            const isLookingForward =
              Math.abs(yawDelta) < THRESHOLDS.yawAwayDeg &&
              Math.abs(pitchDelta) < THRESHOLDS.pitchAwayDeg;
            const isSittingStraight =
              Math.abs(rollDelta) < THRESHOLDS.rollSlouchDeg &&
              Math.abs(pitchDelta) < THRESHOLDS.pitchSlouchDeg;
            const isLookingDown =
              pitchDelta < -THRESHOLDS.pitchDownDeg || ratioDown;

            updateTimer(gazeAwaySinceRef, !isLookingForward);
            updateTimer(postureBadSinceRef, !isSittingStraight);
            updateTimer(lookingDownSinceRef, isLookingDown);
          }
        }

        const nowTime = Date.now();
        const phoneAlert =
          phoneSinceRef.current && nowTime - phoneSinceRef.current > PHONE_ALERT_MS;
        const downAlert =
          lookingDownSinceRef.current &&
          nowTime - lookingDownSinceRef.current > LOOKING_DOWN_ALERT_MS;
        const gazeAlert =
          gazeAwaySinceRef.current && nowTime - gazeAwaySinceRef.current > GAZE_ALERT_MS;
        const postureAlert =
          postureBadSinceRef.current &&
          nowTime - postureBadSinceRef.current > POSTURE_ALERT_MS;

        if (phoneAlert) {
          maybeAlert("Put the phone away.");
        } else if (downAlert) {
          maybeAlert("Stop looking down. Eyes on the screen.");
        } else if (gazeAlert) {
          maybeAlert("Look at the screen. Stay locked in.");
        } else if (postureAlert) {
          maybeAlert("Sit up straight. Focus.");
        }

        rafRef.current = requestAnimationFrame(detect);
      };

      rafRef.current = requestAnimationFrame(detect);
    };

    const setup = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = document.createElement("video");
        videoRef.current = video;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        await video.play();

        const { FaceLandmarker, ObjectDetector, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );
        const resolver = await FilesetResolver.forVisionTasks(VISION_WASM_PATH);

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: FACE_MODEL_PATH },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });

        objectDetectorRef.current = await ObjectDetector.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: OBJECT_MODEL_PATH },
          runningMode: "VIDEO",
          scoreThreshold: 0.5,
          maxResults: 5,
        });

        if (cancelled) {
          cleanup();
          return;
        }

        resetState();
        startDetection();
      } catch (error) {
        console.warn("Posture monitoring unavailable:", error);
        cleanup();
      }
    };

    setup();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [isSessionActive, isMonitoringEnabled, isPostureMonitoringEnabled]);
}
