import { useRef, useState } from 'react';

export function useVoiceRecorder() {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        mediaRecorder.onstart = () => setIsRecording(true);
        mediaRecorder.onstop = () => setIsRecording(false);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
                    chunksRef.current = [];
                    resolve(blob);
                };
                mediaRecorderRef.current.stop();
            } else {
                resolve(new Blob());
            }
        });
    };

    return { isRecording, startRecording, stopRecording };
}
