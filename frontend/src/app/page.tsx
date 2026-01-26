'use client';
import VoiceRecorder from '@/components/VoiceRecorder';
import ComparisonView from '@/components/ComparisonView';
import { useAgentStore } from '@/store/agentStore';

export default function Home() {
    const { error } = useAgentStore();
    return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-12 pt-8">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                        Sunmarke Voice Assistant
                    </h1>
                    <p className="text-gray-600 text-lg">Ask anything about Sunmarke School</p>
                </header>

                <div className="flex flex-col items-center">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8 w-full max-w-xl transition-all hover:shadow-2xl">
                        <VoiceRecorder />
                        {error && (
                            <div className="mt-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg text-center text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <ComparisonView />
            </div>
        </main>
    );
}
