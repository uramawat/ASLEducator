import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Video, StopCircle, RefreshCw } from "lucide-react";
import posthog from "posthog-js";

interface CameraRecorderProps {
    onRecordComplete: (videoBlob: Blob) => void;
    isProcessing: boolean;
}

export const CameraRecorder: React.FC<CameraRecorderProps> = ({ onRecordComplete, isProcessing }) => {
    const webcamRef = useRef<Webcam>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [progress, setProgress] = useState(0);

    const onUserMediaError = useCallback((error: string | DOMException) => {
        console.error("Camera access denied:", error);
        posthog.capture("camera_access_denied", { error: error.toString() });
    }, []);

    const handleStartCaptureClick = useCallback(() => {
        setCapturing(true);
        setRecordedChunks([]);
        setProgress(0);

        if (webcamRef.current && webcamRef.current.stream) {
            mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
                mimeType: "video/webm",
            });
            mediaRecorderRef.current.addEventListener(
                "dataavailable",
                handleDataAvailable
            );
            mediaRecorderRef.current.start();

            // Auto-stop after 3 seconds
            let startTime = Date.now();
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const p = Math.min(100, (elapsed / 3000) * 100);
                setProgress(p);

                if (elapsed >= 3000) {
                    clearInterval(interval);
                    handleStopCaptureClick();
                }
            }, 100);
        }
    }, [webcamRef]);

    const handleDataAvailable = useCallback(
        ({ data }: BlobEvent) => {
            if (data.size > 0) {
                setRecordedChunks((prev) => prev.concat(data));
            }
        },
        [setRecordedChunks]
    );

    const handleStopCaptureClick = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setCapturing(false);
    }, [mediaRecorderRef]);

    // When chunks update, check if we just finished capturing
    React.useEffect(() => {
        if (!capturing && recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, {
                type: "video/webm",
            });
            onRecordComplete(blob);
            setRecordedChunks([]); // Reset for next time
        }
    }, [recordedChunks, capturing, onRecordComplete]);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    onUserMediaError={onUserMediaError}
                    className="w-[640px] h-[480px] object-cover"
                />
                {capturing && (
                    <div className="absolute bottom-0 left-0 h-2 bg-red-500 transition-all duration-100" style={{ width: `${progress}%` }} />
                )}
            </div>

            <div className="flex gap-4">
                {!capturing && !isProcessing && (
                    <button
                        onClick={handleStartCaptureClick}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition-all transform hover:scale-105"
                    >
                        <Video className="w-6 h-6" />
                        Sign Now (3s)
                    </button>
                )}

                {capturing && (
                    <button
                        className="flex items-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-full animate-pulse cursor-default"
                    >
                        <StopCircle className="w-6 h-6" />
                        Recording...
                    </button>
                )}

                {isProcessing && (
                    <button
                        disabled
                        className="flex items-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-full cursor-not-allowed"
                    >
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        Thinking...
                    </button>
                )}
            </div>
        </div>
    );
};
