'use client';

import ResponsePanel from './ResponsePanel';
import { useAgentStore } from '@/store/agentStore';

type SectionKey = 'gemini' | 'kimi' | 'deepseek';
type Tone = 'sky' | 'amber' | 'teal';

const sections: { key: SectionKey; title: string; tone: Tone }[] = [
    { key: 'gemini', title: 'Model 1', tone: 'sky' },
    { key: 'kimi', title: 'Model 2', tone: 'amber' },
    { key: 'deepseek', title: 'Model 3', tone: 'teal' },
];

const loadingStyles: Record<Tone, string> = {
    sky: 'border-sky-200/80 bg-white/70',
    amber: 'border-amber-200/80 bg-white/70',
    teal: 'border-teal-200/80 bg-white/70',
};

export default function ComparisonView() {
    const { responses, loadingStates } = useAgentStore();

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {sections.map(({ key, title, tone }) => (
                <ModelSection
                    key={key}
                    title={title}
                    data={responses?.[key]}
                    isLoading={loadingStates[key]}
                    tone={tone}
                />
            ))}
        </div>
    );
}

function ModelSection({
    title,
    data,
    isLoading,
    tone,
}: {
    title: string;
    data: any;
    isLoading: boolean;
    tone: Tone;
}) {
    return (
        <div className="flex min-h-[240px] flex-col">
            {isLoading ? (
                <div className={`glass-panel flex flex-1 flex-col justify-between rounded-[28px] border p-6 ${loadingStyles[tone]}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Model response</p>
                            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
                        </div>
                        <div className="h-11 w-11 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                    </div>

                    <div className="space-y-3">
                        <div className="h-4 w-full rounded-full bg-slate-200/70" />
                        <div className="h-4 w-11/12 rounded-full bg-slate-200/60" />
                        <div className="h-4 w-8/12 rounded-full bg-slate-200/50" />
                    </div>

                    <p className="text-sm text-slate-500">Thinking through the school context and generating audio...</p>
                </div>
            ) : data ? (
                <ResponsePanel
                    title={title}
                    text={data.text}
                    audio={data.audio}
                    audioMimeType={data.audioMimeType}
                    modelUsed={data.modelUsed}
                    tone={tone}
                />
            ) : (
                <div className="glass-panel flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-slate-300/80 p-6 text-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Output pending</p>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{title} answer will appear here.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
