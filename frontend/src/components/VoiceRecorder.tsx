'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAgentStore } from '@/store/agentStore';
import { AudioLines, Mic, Sparkles, Square, Waves } from 'lucide-react';
import { useState } from 'react';

export default function VoiceRecorder() {
    const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
    const { setLoading, setModelResponse, setError, resetSession } = useAgentStore();
    const [transcript, setTranscript] = useState('');

    const getExtension = (mimeType: string) => {
        if (mimeType.includes('mp4')) return 'm4a';
        if (mimeType.includes('wav')) return 'wav';
        return 'webm';
    };

    const handleRecord = async () => {
        if (!isRecording) {
            resetSession();
            setError(null);
            setTranscript('');
            try {
                await startRecording();
            } catch (e: any) {
                setError(e.message || 'Microphone access failed');
            }
        } else {
            try {
                const audioBlob = await stopRecording();
                const formData = new FormData();
                formData.append('audio', audioBlob, `recording.${getExtension(audioBlob.type)}`);

                const transcribeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/transcribe`, {
                    method: 'POST',
                    body: formData,
                });

                if (!transcribeRes.ok) {
                    const errorData = await transcribeRes.json().catch(() => null);
                    throw new Error(errorData?.error || 'Transcription failed');
                }

                const data = await transcribeRes.json();
                if (!data.transcript?.trim()) {
                    throw new Error('No speech detected');
                }
                setTranscript(data.transcript);

                const fetchModel = async (model: 'gemini' | 'kimi' | 'deepseek') => {
                    setLoading(model, true);
                    try {
                        const agentRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/query/${model}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: data.transcript }),
                        });

                        if (!agentRes.ok) {
                            const errorData = await agentRes.json().catch(() => null);
                            throw new Error(errorData?.error || `${model} query failed`);
                        }

                        const result = await agentRes.json();
                        setModelResponse(model, result);
                    } catch (e: any) {
                        console.error(e);
                        setModelResponse(model, { text: `Error: ${e.message}`, audio: null });
                    } finally {
                        setLoading(model, false);
                    }
                };

                await Promise.all([
                    fetchModel('gemini'),
                    fetchModel('kimi'),
                    fetchModel('deepseek'),
                ]);
            } catch (e: any) {
                setError(e.message || 'Something went wrong');
                console.error(e);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'animate-pulse bg-rose-500' : 'bg-emerald-500'}`} />
                {isRecording ? 'Listening now' : 'Microphone ready'}
            </div>

            <button
                onClick={handleRecord}
                className="group relative flex h-32 w-32 items-center justify-center"
            >
                <span
                    className={`absolute inset-0 rounded-full transition duration-300 ${
                        isRecording ? 'animate-ping bg-rose-300/40' : 'bg-sky-400/15 blur-xl group-hover:scale-110'
                    }`}
                />
                <span
                    className={`relative inline-flex h-24 w-24 items-center justify-center rounded-full border text-white shadow-2xl transition duration-300 group-hover:scale-105 ${
                        isRecording
                            ? 'border-rose-400 bg-[linear-gradient(135deg,#fb7185,#e11d48)] shadow-rose-300/40'
                            : 'border-sky-500 bg-[linear-gradient(135deg,#0f172a,#2563eb)] shadow-sky-300/40'
                    }`}
                >
                    {isRecording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-8 w-8" />}
                </span>
            </button>

            <div className="grid w-full gap-5 lg:grid-cols-[0.82fr_1.18fr]">
                <div className="rounded-[30px] border border-slate-200 bg-white/75 p-6 text-left shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                        <Mic className="h-3.5 w-3.5" />
                        Voice recording
                    </div>
                    <div className="mt-5 rounded-[24px] bg-slate-950 px-5 py-5 text-sm leading-6 text-slate-200">
                        {isRecording ? 'Recording is active. Speak clearly.' : 'Press once to record. Press again to stop.'}
                    </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white/82 p-6 text-left shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        <AudioLines className="h-3.5 w-3.5 text-sky-600" />
                        Transcription
                    </div>

                    <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
                        <Waves className={`h-4 w-4 ${transcript ? 'text-emerald-500' : 'text-slate-300'}`} />
                        {transcript ? 'Transcript ready' : 'Waiting for transcript'}
                    </div>

                    <div className="mt-4 min-h-[220px] rounded-[26px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.92))] p-6">
                        {transcript ? (
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Transcript
                                </div>
                                <p className="mt-4 text-base leading-7 text-slate-700">"{transcript}"</p>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col justify-center">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Waiting for speech</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
