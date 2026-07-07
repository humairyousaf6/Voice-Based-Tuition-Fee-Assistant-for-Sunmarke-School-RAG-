import { useRef, useState } from 'react';

export function useVoiceRecorder() {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType =
            [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
            ].find((type) => MediaRecorder.isTypeSupported(type)) || '';

        const mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);

        chunksRef.current = [];
        streamRef.current = stream;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };
        mediaRecorder.onstart = () => setIsRecording(true);
        mediaRecorder.onstop = () => {
            setIsRecording(false);
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;

            if (!recorder) {
                resolve(new Blob());
                return;
            }

            const finalize = () => {
                recorder.removeEventListener('stop', finalize);
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || 'audio/webm',
                });
                chunksRef.current = [];
                resolve(blob);
            };

            recorder.addEventListener('stop', finalize, { once: true });

            if (recorder.state !== 'inactive') {
                recorder.stop();
            } else {
                finalize();
            }
        });
    };

    return { isRecording, startRecording, stopRecording };
}
