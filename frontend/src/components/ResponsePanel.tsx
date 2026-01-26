'use client';
import { useState } from 'react';

export default function ResponsePanel({ title, text, audio }: any) {
    const playAudio = () => {
        if (!audio) return;
        try {
            const audioData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
            const blob = new Blob([audioData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            new Audio(url).play();
        } catch (e) {
            console.error("Error playing audio", e);
        }
    };

    return (
        <div className="flex-1 p-6 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <button
                    onClick={playAudio}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-full transition-colors flex items-center gap-2"
                >
                    <span>▶</span> Play
                </button>
            </div>
            <div className="prose prose-sm max-w-none text-gray-600 overflow-y-auto max-h-[300px]">
                <p className="whitespace-pre-wrap">{text}</p>
            </div>
        </div>
    );
}
