'use client';

import { Play, Sparkles, Volume2 } from 'lucide-react';

type Tone = 'sky' | 'amber' | 'teal';

const toneStyles: Record<
    Tone,
    { border: string; stripe: string; badge: string; button: string }
> = {
    sky: {
        border: 'border-sky-200/80',
        stripe: 'from-sky-500 via-blue-600 to-cyan-400',
        badge: 'border-sky-200 bg-sky-50 text-sky-700',
        button: 'bg-sky-600 text-white hover:bg-sky-700',
    },
    amber: {
        border: 'border-amber-200/80',
        stripe: 'from-amber-400 via-orange-500 to-yellow-400',
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        button: 'bg-amber-500 text-white hover:bg-amber-600',
    },
    teal: {
        border: 'border-teal-200/80',
        stripe: 'from-teal-500 via-emerald-500 to-cyan-400',
        badge: 'border-teal-200 bg-teal-50 text-teal-700',
        button: 'bg-teal-600 text-white hover:bg-teal-700',
    },
};

export default function ResponsePanel({
    title,
    text,
    audio,
    audioMimeType,
    modelUsed,
    tone = 'sky',
}: {
    title: string;
    text: string;
    audio: string | null;
    audioMimeType?: string | null;
    modelUsed?: string | null;
    tone?: Tone;
}) {
    const canUseBrowserSpeech =
        typeof window !== 'undefined' &&
        typeof window.speechSynthesis !== 'undefined' &&
        Boolean(text?.trim());

    const playAudio = () => {
        if (!audio && canUseBrowserSpeech) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.96;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
            return;
        }

        if (!audio) return;

        try {
            const audioData = Uint8Array.from(atob(audio), (char) => char.charCodeAt(0));
            const blob = new Blob([audioData], { type: audioMimeType || 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            new Audio(url).play();
        } catch (e) {
            console.error('Error playing audio', e);
        }
    };

    const style = toneStyles[tone];

    return (
        <div className={`glass-panel relative flex h-full flex-col overflow-hidden rounded-[30px] border ${style.border} p-6`}>
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${style.stripe}`} />

            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${style.badge}`}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Model response
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h3>
                    {modelUsed && (
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                            {modelUsed}
                        </p>
                    )}
                </div>

                <button
                    onClick={playAudio}
                    disabled={!audio && !canUseBrowserSpeech}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${style.button}`}
                >
                    {audio ? <Play className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                    {audio ? 'Play audio' : canUseBrowserSpeech ? 'Read aloud' : 'Audio unavailable'}
                </button>
            </div>

            <div className="mb-4 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                Response transcript
            </div>

            <div className="soft-scrollbar max-h-[340px] flex-1 overflow-y-auto pr-2 text-[15px] leading-7 text-slate-600">
                <p className="whitespace-pre-wrap">{text}</p>
            </div>
        </div>
    );
}
