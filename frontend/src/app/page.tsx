'use client';

import VoiceRecorder from '@/components/VoiceRecorder';
import ComparisonView from '@/components/ComparisonView';
import { useAgentStore } from '@/store/agentStore';
import {
    AudioLines,
    GraduationCap,
} from 'lucide-react';

export default function Home() {
    const { error, responses, loadingStates } = useAgentStore();
    const hasActivity = Boolean(responses) || Object.values(loadingStates).some(Boolean);

    return (
        <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-drift absolute -left-16 top-8 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl" />
                <div className="animate-drift absolute right-8 top-20 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl [animation-delay:1s]" />
                <div className="animate-drift absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-teal-200/20 blur-3xl [animation-delay:2s]" />
            </div>

            <div className="relative mx-auto max-w-6xl">
                <section className="animate-rise-in pt-6">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-700 shadow-sm backdrop-blur">
                        <GraduationCap className="h-4 w-4 text-amber-500" />
                        Sunmarke Voice Assistant
                    </div>

                    <div className="mx-auto mt-8 max-w-3xl text-center">
                        <h1 className="display-title text-5xl leading-[0.98] text-slate-900 sm:text-6xl">
                            Sunmarke Voice Assistant
                        </h1>
                        <p className="mt-4 text-lg text-slate-600">
                            Ask anything about Sunmarke School
                        </p>
                    </div>

                    <div className="glass-panel relative mt-10 overflow-hidden rounded-[38px] p-3 sm:p-4">
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-sky-500/15 via-transparent to-amber-300/15" />
                        <div className="relative rounded-[32px] border border-slate-200/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,255,0.92))] p-7 sm:p-10 lg:p-12">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                    <AudioLines className="h-3.5 w-3.5 text-sky-600" />
                                    Voice recording and transcription
                                </div>
                            </div>

                            <VoiceRecorder />

                            {error && (
                                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-14 pb-12">
                    <div className="mb-6 flex items-end justify-between">
                        <div>
                            <h2 className="text-3xl font-semibold text-slate-900">
                                {hasActivity ? 'Responses' : 'Outputs'}
                            </h2>
                        </div>
                    </div>

                    <ComparisonView />
                </section>
            </div>
        </main>
    );
}
