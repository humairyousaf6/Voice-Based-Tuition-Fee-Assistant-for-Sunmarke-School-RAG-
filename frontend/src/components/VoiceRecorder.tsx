'use client';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAgentStore } from '@/store/agentStore';
import { useState } from 'react';

export default function VoiceRecorder() {
    const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
    const { setLoading, setModelResponse, setError } = useAgentStore();
    const [transcript, setTranscript] = useState('');

    const handleRecord = async () => {
        if (!isRecording) {
            setError(null);
            startRecording();
        } else {
            try {
                const audioBlob = await stopRecording();
                const formData = new FormData();
                formData.append('audio', audioBlob);

                const transcribeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/transcribe`, {
                    method: 'POST',
                    body: formData
                });

                if (!transcribeRes.ok) throw new Error('Transcription failed');

                const data = await transcribeRes.json();
                setTranscript(data.transcript);

                // Fetch all 3 models in parallel for independent loading
                const fetchModel = async (model: 'gemini' | 'kimi' | 'deepseek') => {
                    setLoading(model, true);
                    try {
                        const agentRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/query/${model}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: data.transcript })
                        });

                        if (!agentRes.ok) throw new Error(`${model} query failed`);

                        const result = await agentRes.json();
                        setModelResponse(model, result);
                    } catch (e: any) {
                        console.error(e);
                        setModelResponse(model, { text: `Error: ${e.message}`, audio: null });
                    } finally {
                        setLoading(model, false);
                    }
                };

                // Trigger all three
                Promise.all([
                    fetchModel('gemini'),
                    fetchModel('kimi'),
                    fetchModel('deepseek')
                ]);

            } catch (e: any) {
                setError(e.message);
                console.error(e);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6">
            <button
                onClick={handleRecord}
                className={`px-6 py-3 rounded text-white font-semibold ${isRecording ? 'bg-red-500' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
            >
                {isRecording ? '⏹ Stop' : '🎤 Record'}
            </button>
            {transcript && <p className="text-gray-800 text-lg text-center font-medium italic">"{transcript}"</p>}
        </div>
    );
}
