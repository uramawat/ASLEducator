import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Holistic, HAND_CONNECTIONS, POSE_CONNECTIONS } from '@mediapipe/holistic';
import type { Results as HolisticResults } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

interface Props {
  onReady: () => void;
  onSignComplete: (frames: number[][]) => void;
  isActive: boolean;
}

export interface MediaPipeCanvasRef {
  stopAndEmit: () => void;
}

export const MediaPipeCanvas = forwardRef<MediaPipeCanvasRef, Props>(({ onReady, onSignComplete, isActive }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const savedFrames = useRef<number[][]>([]);
  const isRecording = useRef<boolean>(false);
  
  const cameraRef = useRef<Camera | null>(null);
  const holisticRef = useRef<Holistic | null>(null);

  useImperativeHandle(ref, () => ({
    stopAndEmit: () => {
        const finalFrames = [...savedFrames.current];
        savedFrames.current = [];
        isRecording.current = false;
        
        if (finalFrames.length > 5) {
            onSignComplete(finalFrames);
        } else {
            console.warn("Sign was too short to measure.");
            onSignComplete(finalFrames); // Fire it anyway so parent state updates
        }
    }
  }));

  useEffect(() => {
    if (!isActive) {
        if (cameraRef.current) {
            cameraRef.current.stop();
        }
        return;
    }

    const holistic = new Holistic({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      refineFaceLandmarks: false, 
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    holistic.onResults(onResults);
    holisticRef.current = holistic;

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && holisticRef.current) {
            await holisticRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });
      camera.start().then(() => {
         onReady();
      });
      cameraRef.current = camera;
    }

    return () => {
      holistic.close();
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, [isActive]);

  const onResults = (results: HolisticResults) => {
    if (!canvasRef.current || !videoRef.current) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasCtx.globalAlpha = 0.3;
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.globalAlpha = 1.0;

    if (results.poseLandmarks) {
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#10B98150', lineWidth: 4 });
      drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#04785750', lineWidth: 2 });
    }
    if (results.leftHandLandmarks) {
      drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#3B82F6', lineWidth: 5 });
      drawLandmarks(canvasCtx, results.leftHandLandmarks, { color: '#93C5FD', lineWidth: 2, radius: 3 });
    }
    if (results.rightHandLandmarks) {
      drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#EF4444', lineWidth: 5 });
      drawLandmarks(canvasCtx, results.rightHandLandmarks, { color: '#FCA5A5', lineWidth: 2, radius: 3 });
    }
    
    canvasCtx.restore();

    const extractPoint = (res: any, hasVis: boolean) => {
       if (!res) return [];
       return res.flatMap((pt: any) => hasVis ? [pt.x, pt.y, pt.z, pt.visibility || 0] : [pt.x, pt.y, pt.z]);
    };

    const pose = results.poseLandmarks ? extractPoint(results.poseLandmarks, true) : new Array(33 * 4).fill(0);
    const face = results.faceLandmarks ? extractPoint(results.faceLandmarks, false) : new Array(468 * 3).fill(0);
    const lh = results.leftHandLandmarks ? extractPoint(results.leftHandLandmarks, false) : new Array(21 * 3).fill(0);
    const rh = results.rightHandLandmarks ? extractPoint(results.rightHandLandmarks, false) : new Array(21 * 3).fill(0);

    const frameFeatures = [...pose, ...face, ...lh, ...rh];

    const handsDetected = results.leftHandLandmarks || results.rightHandLandmarks;

    if (handsDetected) {
       isRecording.current = true;
       savedFrames.current.push(frameFeatures);
    } else {
       if (isRecording.current) {
          // Keep recording even if hands are temporarily out of frame,
          // allowing for complex signs where hands might leave the detection zone.
          savedFrames.current.push(frameFeatures);
       }
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <video ref={videoRef} className="hidden" playsInline></video>
      <canvas ref={canvasRef} className="w-full h-full object-cover transform -scale-x-100"></canvas>
      <div className="absolute top-6 right-6 flex items-center gap-3 bg-gray-900/60 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full z-10 text-white font-semibold text-sm shadow-xl">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.9)]"></div>
        Observing Motion
      </div>
    </div>
  );
});
