import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HandTrackingState, HandGesture } from '../types';

const HandTrackingContext = createContext<HandTrackingState | null>(null);

export const useHandTracking = () => useContext(HandTrackingContext);

export const HandTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HandTrackingState>({
    isTracking: false,
    landmarks: null,
    gesture: 'none',
    pointer2D: { x: 0, y: 0 },
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsRef = useRef<Hands | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.style.display = 'none';
    video.playsInline = true;
    videoRef.current = video;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (!canvasRef.current || !videoRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Draw debug landmarks
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });

        // Gesture Detection
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const wrist = landmarks[0];

        // 2D Pointer (Normalized screen coordinates for Raycasting)
        // Flip X because video is usually mirrored
        const pointer2D = {
          x: (indexTip.x * 2) - 1,
          y: -(indexTip.y * 2) + 1
        };

        // Pinch Detection
        const distPinch = Math.sqrt(
          Math.pow(indexTip.x - thumbTip.x, 2) + 
          Math.pow(indexTip.y - thumbTip.y, 2) +
          Math.pow(indexTip.z - thumbTip.z, 2)
        );
        const isPinching = distPinch < 0.05;

        // Open Hand Detection
        const fingerTips = [8, 12, 16, 20];
        const areFingersExtended = fingerTips.every(tipIdx => {
           const tip = landmarks[tipIdx];
           const base = landmarks[tipIdx - 2]; 
           return tip.y < base.y; // Simple vertical check for extended fingers
        });
        
        let gesture: HandGesture = 'none';
        if (isPinching) gesture = 'pinch';
        else if (areFingersExtended) gesture = 'open';
        else gesture = 'pointing';

        setState({
          isTracking: true,
          landmarks,
          gesture,
          pointer2D
        });
      } else {
        setState(prev => ({ ...prev, isTracking: false }));
      }
    });

    handsRef.current = hands;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          processVideo();
        };
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    const processVideo = async () => {
      if (video.readyState >= 2) {
        await hands.send({ image: video });
      }
      requestAnimationFrame(processVideo);
    };

    startCamera();

    return () => {
      hands.close();
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <HandTrackingContext.Provider value={state}>
      {children}
      <div className="fixed bottom-4 right-4 w-48 aspect-video bg-black/50 border border-white/20 rounded-lg overflow-hidden pointer-events-none z-50">
        <canvas ref={canvasRef} width={640} height={480} className="w-full h-full scale-x-[-1]" />
      </div>
    </HandTrackingContext.Provider>
  );
};
