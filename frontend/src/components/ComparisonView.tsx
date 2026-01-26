'use client';
import ResponsePanel from './ResponsePanel';
import { useAgentStore } from '@/store/agentStore';

export default function ComparisonView() {
    const { responses, loadingStates } = useAgentStore();

    if (!responses && !loadingStates.gemini && !loadingStates.kimi && !loadingStates.deepseek) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full pb-12">
            <ModelSection
                title="Gemini"
                data={responses?.gemini}
                isLoading={loadingStates.gemini}
            />
            <ModelSection
                title="Kimi"
                data={responses?.kimi}
                isLoading={loadingStates.kimi}
            />
            <ModelSection
                title="DeepSeek"
                data={responses?.deepseek}
                isLoading={loadingStates.deepseek}
            />
        </div>
    );
}

function ModelSection({ title, data, isLoading }: any) {
    return (
        <div className="flex flex-col min-h-[200px]">
            {isLoading ? (
                <div className="flex-1 p-6 bg-white/50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-xs text-gray-400">Thinking...</p>
                </div>
            ) : data ? (
                <ResponsePanel title={title} text={data.text} audio={data.audio} />
            ) : (
                <div className="flex-1 p-6 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-center">
                    <p className="text-xs text-gray-300">Awaiting input...</p>
                </div>
            )}
        </div>
    );
}
