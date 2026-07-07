import { create } from 'zustand';

interface AgentState {
    isRecording: boolean;
    loadingStates: {
        gemini: boolean;
        kimi: boolean;
        deepseek: boolean;
    };
    responses: {
        gemini: any;
        kimi: any;
        deepseek: any;
    } | null;
    error: string | null;
    setRecording: (recording: boolean) => void;
    setLoading: (model: 'gemini' | 'kimi' | 'deepseek', loading: boolean) => void;
    setResponses: (responses: any) => void;
    setModelResponse: (model: 'gemini' | 'kimi' | 'deepseek', data: any) => void;
    setError: (error: string | null) => void;
    resetSession: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
    isRecording: false,
    loadingStates: { gemini: false, kimi: false, deepseek: false },
    responses: null,
    error: null,

    setRecording: (recording) => set({ isRecording: recording }),
    setLoading: (model, loading) => set((state) => ({
        loadingStates: { ...state.loadingStates, [model]: loading }
    })),
    setResponses: (responses) => set({ responses }),
    setModelResponse: (model, data) => set((state) => ({
        responses: {
            ...(state.responses || {
                gemini: null,
                kimi: null,
                deepseek: null
            }),
            [model]: data
        }
    })),
    setError: (error) => set({ error }),
    resetSession: () => set({
        responses: null,
        error: null,
        loadingStates: { gemini: false, kimi: false, deepseek: false },
    }),
}));
