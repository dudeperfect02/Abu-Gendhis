import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { generateSpeech, generateIllustration, createImagePromptFromChunk, generateStylePreviewImage } from '../services/geminiService';
import type { StoryDetails } from '../services/geminiService';
import JSZip from 'jszip';


interface StoryDisplayProps {
    storyChunks: string[];
    storyDetails: StoryDetails | null;
    isLoading: boolean;
    progress: number;
    statusMessage: string;
    error: string | null;
    onDownload: () => void;
}

// --- SVG Icons ---

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06l2.755-2.754a.75.75 0 011.06 0l3.078 3.077a.75.75 0 001.06 0l2.409-2.408a.75.75 0 011.06 0l4.18 4.181V6H3v10.06zM21 17.03l-4.18-4.18-2.409 2.408a.75.75 0 01-1.06 0L10.273 12.2l-3.078-3.077a.75.75 0 00-1.06 0L3 12.193V6h18v11.03z" clipRule="evenodd" />
      <path d="M10.5 10.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
);

const SpeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm9 0a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const StopIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
    </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M17.663 3.118c.225.225.338.52.338.815V8.25a.75.75 0 01-1.5 0V5.168L7.34 14.34a3 3 0 00-.815 1.748V20.25a.75.75 0 01-1.5 0v-3.935a4.5 4.5 0 011.223-2.622l9.172-9.172h-3.082a.75.75 0 010-1.5h4.418c.295 0 .59.113.815.338z" clipRule="evenodd" />
        <path d="M5.25 3A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V11.25a.75.75 0 011.5 0v7.5A3.75 3.75 0 0118.75 22.5H5.25A3.75 3.75 0 011.5 18.75V5.25A3.75 3.75 0 015.25 1.5h7.5a.75.75 0 010 1.5h-7.5z" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
    </svg>
);

const ExclamationTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-4.518a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h5.25a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-.008a.75.75 0 00-.75.75v4.518l-1.903-1.903a9 9 0 00-15.057 4.036.75.75 0 001.43.184z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M19.245 13.941a7.5 7.5 0 01-12.548 3.364l-1.903-1.903h4.518a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75h-5.25a.75.75 0 00-.75.75v5.25a.75.75 0 00.75.75h.008a.75.75 0 00.75-.75v-4.518l1.903 1.903a9 9 0 0015.057-4.036.75.75 0 00-1.43-.184z" clipRule="evenodd" />
    </svg>
);

const MagnifyingGlassPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5zm8.25-3.75a.75.75 0 01.75.75v2.25h2.25a.75.75 0 010 1.5h-2.25v2.25a.75.75 0 01-1.5 0v-2.25H7.5a.75.75 0 010-1.5h2.25V7.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113C21.182 17.022 16.97 20.25 12.001 20.25c-4.97 0-9.185-3.223-10.675-7.69a.998.998 0 010-1.113zM12.001 18C16.42 18 20.28 15.125 21.6 12c-1.32-3.125-5.18-6-9.6-6-4.42 0-8.28 2.875-9.6 6 1.32 3.125 5.18 6 9.6 6z" clipRule="evenodd" />
  </svg>
);

const PlusCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
    </svg>
);


// --- WAV Header & Audio Helpers ---

function addWavHeader(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Uint8Array {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    new Uint8Array(buffer, 44).set(pcmData);
    return new Uint8Array(buffer);
}

const decodePcmData = (base64String: string): Uint8Array => {
    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const createAudioBuffer = async (pcmData: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(pcmData.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
};

const imageStyles = [
    { key: 'watercolour', name: 'Watercolor' }, { key: 'anime', name: 'Anime' }, { key: '3D', name: '3D' },
    { key: 'cartoon', name: 'Cartoon' }, { key: 'illustrated', name: 'Illustrated' }, { key: 'cinema', name: 'Cinematic' },
    { key: 'realistic', name: 'Realistic' }, { key: 'paper', name: 'Paper Art' }, { key: 'low-poly', name: 'Low-Poly' },
    { key: 'goth', name: 'Goth' }, { key: 'art deco', name: 'Art Deco' }, { key: 'glowly', name: 'Glowing' },
    { key: 'sweets', name: 'Sweets' }, { key: 'dreamy', name: 'Dreamy' }, { key: 'dark', name: 'Dark' },
    { key: 'sunset', name: 'Sunset' }, { key: 'bright', name: 'Bright' }, { key: 'cool', name: 'Cool Tones' },
    { key: 'pink', name: 'Pink Hues' }, { key: 'lavender', name: 'Lavender Hues' }, { key: 'earthy', name: 'Earthy Tones' },
    { key: 'orange', name: 'Orange Hues' },
];

export const StoryDisplay: React.FC<StoryDisplayProps> = ({
    storyChunks,
    storyDetails,
    isLoading,
    progress,
    statusMessage,
    error,
    onDownload,
}) => {
    const isFinished = progress === 100 && !isLoading && storyChunks.length > 0;
    
    // Audio State
    const [audioData, setAudioData] = useState<Record<number, string>>({});
    const [globalVoice, setGlobalVoice] = useState<string>('Zephyr');
    const [globalStyle, setGlobalStyle] = useState<string>("Narrate in a soft, gentle, and soothing voice, like a bedtime story.");
    const [stylePresets, setStylePresets] = useState<string[]>([]);
    const [audioStatus, setAudioStatus] = useState<Record<number, 'generating' | 'complete' | 'error' | 'idle'>>({});
    const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState<boolean>(false);
    const [generateAllAudioStatus, setGenerateAllAudioStatus] = useState<string>('');
    const isCancellingAllAudioRef = useRef<boolean>(false);
    
    // Playback State
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingState, setPlayingState] = useState<{ type: 'main' | 'voice_preview' | 'style_preview'; key: string | number, status: 'playing' | 'paused' } | null>(null);

    
    // Preview State
    const [voicePreviewAudioCache, setVoicePreviewAudioCache] = useState<Record<string, string>>({});
    const [generatingVoicePreview, setGeneratingVoicePreview] = useState<string | null>(null);
    const [stylePreviewAudioCache, setStylePreviewAudioCache] = useState<Record<string, string>>({});
    const [generatingStylePreviewAudio, setGeneratingStylePreviewAudio] = useState<string | null>(null);


    // Illustration State
    const [illustrations, setIllustrations] = useState<Record<number, string>>({});
    const [generatingIllustrationIndices, setGeneratingIllustrationIndices] = useState<Set<number>>(new Set());
    const [failedIllustrationIndices, setFailedIllustrationIndices] = useState<Set<number>>(new Set());
    const [isGeneratingAllIllustrations, setIsGeneratingAllIllustrations] = useState<boolean>(false);
    const [generateAllIllustrationsStatus, setGenerateAllIllustrationsStatus] = useState<string>('');
    const isCancellingAllIllustrationsRef = useRef<boolean>(false);
    const [globalImageStyle, setGlobalImageStyle] = useState<string>('watercolour');
    const [stylePreviewCache, setStylePreviewCache] = useState<Record<string, string>>({});
    const [generatingStylePreview, setGeneratingStylePreview] = useState<string | null>(null);
    const [isDownloadingAllImages, setIsDownloadingAllImages] = useState<boolean>(false);
    const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
    
    // Copy State
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

     // Load presets from localStorage on component mount
    useEffect(() => {
        try {
            const savedPresets = localStorage.getItem('stylePresets');
            if (savedPresets) {
                setStylePresets(JSON.parse(savedPresets));
            } else {
                const defaultPresets = [
                    'Narrate in a soft, gentle, and soothing voice, like a bedtime story.',
                    'Speak cheerfully', 
                    'Narrate in a serious tone', 
                    'Whisper softly', 
                    'Use a booming, epic voice',
                    'Sound like a classic radio announcer'
                ];
                setStylePresets(defaultPresets);
            }
        } catch (error) {
            console.error("Failed to load presets from localStorage", error);
            setStylePresets([
                'Narrate in a soft, gentle, and soothing voice, like a bedtime story.',
                'Speak cheerfully', 
                'Narrate in a serious tone', 
                'Whisper softly', 
                'Use a booming, epic voice',
                'Sound like a classic radio announcer'
            ]);
        }
    }, []);

    // Save presets to localStorage when they change
    useEffect(() => {
        if (stylePresets.length > 0) {
            localStorage.setItem('stylePresets', JSON.stringify(stylePresets));
        }
    }, [stylePresets]);

    const handleSavePreset = () => {
        const trimmedStyle = globalStyle.trim();
        if (trimmedStyle && !stylePresets.includes(trimmedStyle)) {
            setStylePresets(prev => [...prev, trimmedStyle]);
        }
    };
    
    const stopAnyAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            try { audioSourceRef.current.stop(); } catch (e) {}
            audioSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {});
        }
        setPlayingState(null);
    }, []);
    
    const playAudio = useCallback(async (base64Data: string, onEnded: () => void) => {
        stopAnyAudio();
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        
        const pcmData = decodePcmData(base64Data);
        const audioBuffer = await createAudioBuffer(pcmData, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
            if (audioSourceRef.current === source) {
                onEnded();
            }
        };
        source.start();
        audioSourceRef.current = source;
    }, [stopAnyAudio]);

    const pauseAudio = useCallback(async () => {
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
            await audioContextRef.current.suspend();
        }
    }, []);

    const resumeAudio = useCallback(async () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    }, []);

    const handleDownloadAudio = (index: number, base64Data: string) => {
        const pcmData = decodePcmData(base64Data);
        const wavData = addWavHeader(pcmData, 24000, 1, 16);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kolom-${index + 1}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleGenerateAudioForChunk = useCallback(async (index: number, text: string) => {
        setAudioStatus(prev => ({ ...prev, [index]: 'generating' }));

        try {
            const audioBase64 = await generateSpeech(text, globalVoice, globalStyle);
            if (audioBase64) {
                setAudioData(prev => ({ ...prev, [index]: audioBase64 }));
                setAudioStatus(prev => ({ ...prev, [index]: 'complete' }));
            } else {
                console.error(`Failed to generate audio for chunk ${index}: No data received.`);
                setAudioStatus(prev => ({ ...prev, [index]: 'error' }));
            }
        } catch (err) {
            console.error(`Error generating audio for chunk ${index}:`, err);
            setAudioStatus(prev => ({ ...prev, [index]: 'error' }));
        }
    }, [globalVoice, globalStyle]);
    
     const handleGenerateAllAudio = async () => {
        setIsGeneratingAllAudio(true);
        isCancellingAllAudioRef.current = false;
        const delayBetweenRequests = 1000;

        for (let i = 0; i < storyChunks.length; i++) {
            if (isCancellingAllAudioRef.current) {
                setGenerateAllAudioStatus('Audio generation cancelled.');
                break;
            }
            if (!audioData[i]) {
                setGenerateAllAudioStatus(`Generating audio for column ${i + 1} of ${storyChunks.length}...`);
                await handleGenerateAudioForChunk(i, storyChunks[i]);
                if (!isCancellingAllAudioRef.current && i < storyChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
                }
            }
        }
        if (!isCancellingAllAudioRef.current) {
             setGenerateAllAudioStatus('All audio generation complete!');
        }
        setIsGeneratingAllAudio(false);
        setTimeout(() => setGenerateAllAudioStatus(''), 4000);
    };

    const handleCancelAllAudio = () => {
        isCancellingAllAudioRef.current = true;
    };

    const handlePlayOrResumeMainAudio = async (index: number, base64Data: string) => {
        const isCurrentlyPaused = playingState?.type === 'main' && playingState.key === index && playingState.status === 'paused';
        
        if (isCurrentlyPaused) {
            await resumeAudio();
            setPlayingState(prev => prev ? { ...prev, status: 'playing' } : null);
        } else {
            setPlayingState({ type: 'main', key: index, status: 'playing' });
            await playAudio(base64Data, () => setPlayingState(null));
        }
    };

    const handlePauseMainAudio = async (index: number) => {
        const isCurrentlyPlaying = playingState?.type === 'main' && playingState.key === index && playingState.status === 'playing';
        if (isCurrentlyPlaying) {
            await pauseAudio();
            setPlayingState(prev => prev ? { ...prev, status: 'paused' } : null);
        }
    };
    
    const handlePlayVoicePreview = async (voice: string) => {
        const isCurrentlyPlaying = playingState?.type === 'voice_preview' && playingState.key === voice;
        
        if (isCurrentlyPlaying) {
             if (playingState.status === 'playing') {
                await pauseAudio();
                setPlayingState(prev => prev ? { ...prev, status: 'paused' } : null);
                return;
            } else { // paused
                await resumeAudio();
                setPlayingState(prev => prev ? { ...prev, status: 'playing' } : null);
                return;
            }
        }

        stopAnyAudio();

        if (voicePreviewAudioCache[voice]) {
            setPlayingState({ type: 'voice_preview', key: voice, status: 'playing' });
            await playAudio(voicePreviewAudioCache[voice], () => setPlayingState(null));
            return;
        }

        setGeneratingVoicePreview(voice);
        try {
            const audioBase64 = await generateSpeech(voice, voice, '');
            if (audioBase64) {
                setVoicePreviewAudioCache(prev => ({...prev, [voice]: audioBase64}));
                setPlayingState({ type: 'voice_preview', key: voice, status: 'playing' });
                await playAudio(audioBase64, () => setPlayingState(null));
            }
        } catch (err) {
            console.error("Failed to generate voice preview:", err);
        } finally {
            setGeneratingVoicePreview(null);
        }
    };

    const handlePlayStylePreview = async () => {
        const style = globalStyle.trim();
        if (!style) return;

        const isCurrentlyPlaying = playingState?.type === 'style_preview' && playingState.key === style;
        
        if (isCurrentlyPlaying) {
             if (playingState.status === 'playing') {
                await pauseAudio();
                setPlayingState(prev => prev ? { ...prev, status: 'paused' } : null);
                return;
            } else { // paused
                await resumeAudio();
                setPlayingState(prev => prev ? { ...prev, status: 'playing' } : null);
                return;
            }
        }

        stopAnyAudio();

        if (stylePreviewAudioCache[style]) {
            setPlayingState({ type: 'style_preview', key: style, status: 'playing' });
            await playAudio(stylePreviewAudioCache[style], () => setPlayingState(null));
            return;
        }

        setGeneratingStylePreviewAudio(style);
        try {
            const sampleText = "This is a preview of the selected voice and style.";
            const audioBase64 = await generateSpeech(sampleText, globalVoice, style);
            if (audioBase64) {
                setStylePreviewAudioCache(prev => ({...prev, [style]: audioBase64}));
                setPlayingState({ type: 'style_preview', key: style, status: 'playing' });
                await playAudio(audioBase64, () => setPlayingState(null));
            }
        } catch (err) {
            console.error("Failed to generate style preview:", err);
        } finally {
            setGeneratingStylePreviewAudio(null);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleDownloadDetails = () => {
        if (!storyDetails) return;

        const { synopsis, hashtags, tags } = storyDetails;

        let content = `Deskripsi\n---\n${synopsis}\n\n`;
        content += `Hashtag\n---\n${hashtags.join(' ')}\n\n`;
        content += `Tag\n---\n${tags.join(', ')}\n`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rincian-cerita.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const generateSingleIllustration = async (index: number, text: string) => {
        setFailedIllustrationIndices(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
        setGeneratingIllustrationIndices(prev => new Set(prev).add(index));
        try {
            const visualPrompt = await createImagePromptFromChunk(text);
            if (visualPrompt) {
                const imageBase64 = await generateIllustration(visualPrompt, globalImageStyle);
                if (imageBase64) {
                     setIllustrations(prev => ({ ...prev, [index]: imageBase64 }));
                } else {
                     console.error(`Failed to generate illustration for chunk ${index}: No image data.`);
                     setFailedIllustrationIndices(prev => new Set(prev).add(index));
                }
            } else {
                 console.error(`Failed to create visual prompt for chunk ${index}.`);
                 setFailedIllustrationIndices(prev => new Set(prev).add(index));
            }
        } catch (err) {
            console.error(`Error generating illustration for chunk ${index}:`, err);
            setFailedIllustrationIndices(prev => new Set(prev).add(index));
        } finally {
            setGeneratingIllustrationIndices(prev => {
                const newSet = new Set(prev);
                newSet.delete(index);
                return newSet;
            });
        }
    };

    const handleGenerateAllIllustrations = async () => {
        setIsGeneratingAllIllustrations(true);
        isCancellingAllIllustrationsRef.current = false;
        const delayBetweenRequests = 5000; // 5-second delay to respect rate limits

        for (let i = 0; i < storyChunks.length; i++) {
            if (isCancellingAllIllustrationsRef.current) {
                setGenerateAllIllustrationsStatus('Illustration generation cancelled.');
                break;
            }
            if (!illustrations[i]) {
                setGenerateAllIllustrationsStatus(`Generating illustration ${i + 1} of ${storyChunks.length}...`);
                await generateSingleIllustration(i, storyChunks[i]);
                
                // Add a delay before the next request, but not for the last one, and only if not cancelled.
                if (!isCancellingAllIllustrationsRef.current && i < storyChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
                }
            }
        }

        if (!isCancellingAllIllustrationsRef.current) {
            setGenerateAllIllustrationsStatus('All illustrations generated!');
        }
        setIsGeneratingAllIllustrations(false);
        setTimeout(() => setGenerateAllIllustrationsStatus(''), 4000);
    };

    const handleCancelAllIllustrations = () => {
        isCancellingAllIllustrationsRef.current = true;
    };
    
    const handleDownloadIllustration = (base64Data: string, index: number) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = `gambar ${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAllIllustrations = async () => {
        setIsDownloadingAllImages(true);
        try {
            const zip = new JSZip();
            for (const indexStr in illustrations) {
                const index = parseInt(indexStr, 10);
                const base64Data = illustrations[index];
                zip.file(`gambar ${index + 1}.png`, base64Data, { base64: true });
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'cerita-ai-ilustrasi.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to create illustration zip file:", err);
        } finally {
            setIsDownloadingAllImages(false);
        }
    };

    const handleGenerateStylePreview = async (styleKey: string) => {
        setGeneratingStylePreview(styleKey);
        try {
            const imageBase64 = await generateStylePreviewImage(styleKey);
            if (imageBase64) {
                setStylePreviewCache(prev => ({ ...prev, [styleKey]: imageBase64 }));
            }
        } catch (err) {
            console.error("Failed to generate style preview:", err);
        } finally {
            setGeneratingStylePreview(null);
        }
    };


    const isAllIllustrationsGenerated = storyChunks.length > 0 && Object.keys(illustrations).length === storyChunks.length;

    const isPlayingThisStylePreview = playingState?.type === 'style_preview' && playingState.key === globalStyle.trim();
    const isGeneratingThisStylePreview = generatingStylePreviewAudio === globalStyle.trim();

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 space-y-8">
            <div className="flex justify-between items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-200">Generated Story</h2>
                 {isFinished && playingState && (
                    <button
                        onClick={stopAnyAudio}
                        className="flex items-center justify-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-300 bg-red-800/50 hover:bg-red-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all"
                        aria-label="Stop current audio"
                    >
                        <StopIcon className="w-5 h-5 mr-2" />
                        Stop Audio
                    </button>
                )}
            </div>
            
            {(isLoading || (progress > 0 && !isFinished)) && (
                <div className="space-y-3 px-2">
                    <p className="text-indigo-300 animate-pulse text-sm sm:text-base">{statusMessage}</p>
                    <ProgressBar progress={progress} />
                </div>
            )}

            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md">
                    <p className="font-bold">An Error Occurred</p>
                    <p className="mt-1 text-sm">{error}</p>
                </div>
            )}

            {!isLoading && !error && storyChunks.length === 0 && (
                 <div className="text-center text-gray-500 py-16 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-lg">Your story will appear here.</p>
                </div>
            )}
            
            {isFinished && (
                <div className="space-y-6 p-1">
                    <div className="border border-gray-700/80 rounded-lg p-6 space-y-6 bg-gray-900/30">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                             <div>
                                <h3 className="text-lg font-bold text-gray-200 whitespace-nowrap">Global Audio Controls</h3>
                                {(isGeneratingAllAudio || generateAllAudioStatus) && (
                                    <p className="text-sm text-indigo-300 mt-1">{generateAllAudioStatus}</p>
                                )}
                             </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end w-full">
                               {isGeneratingAllAudio ? (
                                    <button onClick={handleCancelAllAudio} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all">
                                        <StopIcon className="w-5 h-5 mr-2" /> Cancel
                                    </button>
                                ) : (
                                    <button onClick={handleGenerateAllAudio} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={isGeneratingAllAudio}>
                                        <SpeakerIcon className="w-5 h-5 mr-2" /> Generate All Audio
                                    </button>
                                )}
                                <button onClick={onDownload} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all">
                                    <DownloadIcon className="w-5 h-5 mr-2" /> Download Story Text
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Global Voice Selection
                            </label>
                             <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {voices.map(voice => {
                                    const isSelected = globalVoice === voice;
                                    const isPlayingThisPreview = playingState?.type === 'voice_preview' && playingState.key === voice;
                                    const isGeneratingThisPreview = generatingVoicePreview === voice;

                                    return (
                                        <div key={voice} className="relative">
                                            <button onClick={() => handlePlayVoicePreview(voice)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-600/50 hover:bg-gray-500/50 text-gray-300 hover:text-white transition" disabled={isGeneratingThisPreview || isLoading} aria-label={`Play preview for ${voice}`}>
                                                {isGeneratingThisPreview ? <SpinnerIcon className="w-4 h-4" /> :
                                                    (isPlayingThisPreview && playingState?.status === 'playing') ? <PauseIcon className="w-4 h-4" /> :
                                                    <PlayIcon className="w-4 h-4" />
                                                }
                                            </button>
                                            <button onClick={() => setGlobalVoice(voice)} className={`w-full text-center py-2 pl-8 pr-2 border text-sm rounded-md transition ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                                                {voice}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="global-style-input" className="block text-sm font-medium text-gray-400 mb-2">
                                Global Style Instruction
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePlayStylePreview}
                                    disabled={!globalStyle.trim() || isGeneratingThisStylePreview}
                                    className="flex-shrink-0 p-2 text-gray-400 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    aria-label="Preview style instruction"
                                    title="Preview style instruction with selected voice"
                                >
                                    {isGeneratingThisStylePreview ? (
                                        <SpinnerIcon className="w-5 h-5" />
                                    ) : isPlayingThisStylePreview && playingState?.status === 'playing' ? (
                                        <PauseIcon className="w-5 h-5" />
                                    ) : (
                                        <PlayIcon className="w-5 h-5" />
                                    )}
                                </button>
                                <input
                                    id="global-style-input"
                                    type="text"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition placeholder-gray-500"
                                    placeholder="e.g., Speak cheerfully, narrate in a serious tone"
                                    value={globalStyle}
                                    onChange={(e) => setGlobalStyle(e.target.value)}
                                />
                                <button
                                    onClick={handleSavePreset}
                                    disabled={!globalStyle.trim() || stylePresets.includes(globalStyle.trim())}
                                    className="flex-shrink-0 p-2 text-gray-400 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    aria-label="Save as preset"
                                    title="Save current text as a preset"
                                >
                                    <PlusCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                            {stylePresets.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {stylePresets.map((preset, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setGlobalStyle(preset)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                                                globalStyle === preset
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-gray-100'
                                            }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {storyChunks.length > 0 && (
                <div className="flex overflow-x-auto pb-4 space-x-6">
                    {storyChunks.map((chunk, index) => {
                        const status = audioStatus[index];
                        const audioBase64 = audioData[index];
                        const isPlayingThis = playingState?.type === 'main' && playingState.key === index;
                        const isCopied = copiedIndex === index;

                        return (
                            <div key={index} className="flex-shrink-0 w-[90vw] max-w-2xl h-[42rem] bg-gray-900/70 rounded-lg border border-gray-700 flex flex-col shadow-md">
                                <div className="flex justify-between items-center p-3 border-b border-gray-700/50">
                                    <h4 className="font-bold text-indigo-400">Kolom {index + 1}</h4>
                                    <button onClick={() => handleCopy(chunk, index)} className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors" aria-label="Copy text">
                                        {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto flex-grow">
                                    <p className="text-gray-300 whitespace-pre-wrap font-serif text-base leading-relaxed">
                                        {chunk}
                                    </p>
                                </div>
                                <div className="p-3 border-t border-gray-700/50 space-y-3 bg-gray-900/80 min-h-[96px] flex flex-col justify-center text-sm font-medium text-center">
                                    {(!status || status === 'idle') && (
                                         <button onClick={() => handleGenerateAudioForChunk(index, chunk)} className="flex items-center justify-center flex-grow px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={isGeneratingAllAudio}>
                                            <SpeakerIcon className="w-5 h-5 mr-2" />
                                            Generate Audio
                                        </button>
                                    )}
                                     {status === 'generating' && (
                                        <div className="flex items-center justify-center text-indigo-300">
                                            <SpinnerIcon className="w-5 h-5 mr-2" /> Generating audio...
                                        </div>
                                    )}
                                    {status === 'error' && (
                                        <div className="flex flex-col items-center justify-center text-red-400 gap-2">
                                            <div className="flex items-center">
                                               <ExclamationTriangleIcon className="w-5 h-5 mr-2" /> Audio generation failed.
                                            </div>
                                            <button onClick={() => handleGenerateAudioForChunk(index, chunk)} className="flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all">
                                                <RefreshIcon className="w-4 h-4 mr-1.5" />
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                    {status === 'complete' && audioBase64 && (
                                        <>
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handlePlayOrResumeMainAudio(index, audioBase64)} className="flex items-center justify-center flex-grow px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all" disabled={isPlayingThis && playingState?.status === 'playing'}>
                                                    <PlayIcon className="w-5 h-5 mr-2" /> 
                                                    {isPlayingThis && playingState?.status === 'paused' ? 'Resume' : 'Play Audio'}
                                                </button>
                                                
                                                {isPlayingThis && playingState?.status === 'playing' && (
                                                    <button onClick={() => handlePauseMainAudio(index)} className="flex items-center justify-center flex-grow px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all">
                                                        <PauseIcon className="w-5 h-5 mr-2" /> Pause
                                                    </button>
                                                )}

                                                <button onClick={() => handleDownloadAudio(index, audioBase64)} className="flex items-center justify-center p-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all" aria-label="Download Audio">
                                                    <DownloadIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                             <div className="flex items-center justify-center text-green-400 text-xs mt-1">
                                                <CheckIcon className="w-4 h-4 mr-1" /> Audio ready.
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isFinished && storyDetails && (
                <div className="border-t border-gray-700/60 pt-8 mt-8 space-y-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-200">Story Details</h3>
                         <button onClick={handleDownloadDetails} className="flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all" aria-label="Download story details">
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download Details
                        </button>
                    </div>
                    
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-400 mb-2">Description</h4>
                        <p className="text-gray-400 text-sm bg-gray-900/50 p-4 rounded-md border border-gray-700">
                            {storyDetails.synopsis}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-indigo-400 mb-2">Hashtags</h4>
                        <div className="flex flex-wrap gap-2">
                            {storyDetails.hashtags.map((hashtag, index) => (
                                <span key={`hashtag-${index}`} className="px-3 py-1 text-xs font-medium text-cyan-200 bg-cyan-900/60 rounded-full border border-cyan-800">
                                    {hashtag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-indigo-400 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {storyDetails.tags.map((tag, index) => (
                                <span key={`tag-${index}`} className="px-3 py-1 text-xs font-medium text-purple-200 bg-purple-900/60 rounded-full border border-purple-800">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isFinished && (
                <div className="border-t border-gray-700/60 pt-8 mt-8 space-y-6">
                     <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-200">Story Illustrations</h3>
                         <div className="flex flex-wrap items-center gap-2 justify-end w-full">
                            {isGeneratingAllIllustrations ? (
                                <button onClick={handleCancelAllIllustrations} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all">
                                    <StopIcon className="w-5 h-5 mr-2" /> Cancel
                                </button>
                            ) : (
                                <button onClick={handleGenerateAllIllustrations} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all" disabled={isGeneratingAllIllustrations || generatingIllustrationIndices.size > 0}>
                                    <ImageIcon className="w-5 h-5 mr-2" /> Generate All Illustrations
                                </button>
                            )}
                            <button onClick={handleDownloadAllIllustrations} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={!isAllIllustrationsGenerated || isDownloadingAllImages || isGeneratingAllIllustrations}>
                               {isDownloadingAllImages ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <DownloadIcon className="w-5 h-5 mr-2" />}
                               {isDownloadingAllImages ? 'Zipping...' : 'Download All Images'}
                            </button>
                        </div>
                    </div>
                     {(isGeneratingAllIllustrations || generateAllIllustrationsStatus) && (
                        <div className="text-center text-purple-300 py-1 text-sm">
                            {generateAllIllustrationsStatus}
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-400">
                            Global Image Style
                        </label>
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {imageStyles.map(style => {
                                const isSelected = globalImageStyle === style.key;
                                const isGenerating = generatingStylePreview === style.key;
                                const imageBase64 = stylePreviewCache[style.key];

                                return (
                                    <div key={style.key}
                                        className={`relative group aspect-video rounded-lg border-2 overflow-hidden transition-all duration-300 ${isSelected ? 'border-purple-500 scale-105 shadow-lg shadow-purple-900/30' : 'border-gray-700 hover:border-gray-500'}`}
                                        onClick={() => {
                                            if (!isGenerating) setGlobalImageStyle(style.key)
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center cursor-pointer">
                                            {isGenerating ? (
                                                <div className="flex flex-col items-center text-purple-300">
                                                    <SpinnerIcon className="w-8 h-8" />
                                                </div>
                                            ) : imageBase64 ? (
                                                <img src={`data:image/png;base64,${imageBase64}`} alt={`${style.name} style preview`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-gray-600 text-center p-2">
                                                    <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-100 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                            <h3 className="text-white text-sm font-bold truncate">{style.name}</h3>
                                        </div>

                                        {!isGenerating && !imageBase64 && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleGenerateStylePreview(style.key); }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white text-xs rounded-full backdrop-blur-sm hover:bg-white/30 disabled:opacity-50"
                                                    disabled={generatingStylePreview != null}
                                                    title={`Generate preview for ${style.name}`}
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    Preview
                                                </button>
                                            </div>
                                        )}

                                        {imageBase64 && (
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleGenerateStylePreview(style.key); }}
                                                    className="p-1.5 bg-black/40 text-white text-xs rounded-full backdrop-blur-sm hover:bg-black/60 disabled:opacity-50"
                                                    title="Regenerate Preview"
                                                    disabled={generatingStylePreview != null}
                                                >
                                                    <RefreshIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {storyChunks.map((_, index) => {
                            const isGenerating = generatingIllustrationIndices.has(index);
                            const hasFailed = failedIllustrationIndices.has(index);
                            const imageBase64 = illustrations[index];

                            return (
                                <div key={`illustration-${index}`} className="aspect-video bg-gray-900/50 rounded-lg border border-gray-700 flex items-center justify-center relative overflow-hidden group">
                                    {isGenerating ? (
                                        <div className="flex flex-col items-center text-purple-300">
                                            <SpinnerIcon className="w-8 h-8" />
                                            <span className="mt-2 text-sm">Generating...</span>
                                        </div>

                                    ) : imageBase64 ? (
                                        <>
                                            <img 
                                                src={`data:image/png;base64,${imageBase64}`} 
                                                alt={`Illustration for story column ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button 
                                                    onClick={() => setPreviewModalImage(imageBase64)}
                                                    className="flex items-center justify-center p-3 border border-transparent text-sm font-medium rounded-full text-black bg-gray-200 hover:bg-white"
                                                    aria-label="Preview image"
                                                    title="Preview image"
                                                >
                                                    <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadIllustration(imageBase64, index)}
                                                    className="flex items-center justify-center p-3 border border-transparent text-sm font-medium rounded-full text-black bg-gray-200 hover:bg-white"
                                                    aria-label="Download image"
                                                    title="Download image"
                                                >
                                                    <DownloadIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    ) : hasFailed ? (
                                        <div className="text-red-400 text-center p-2 flex flex-col items-center">
                                            <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-2" />
                                            <span className="text-sm font-semibold">Generation Failed</span>
                                            <button
                                                onClick={() => generateSingleIllustration(index, storyChunks[index])}
                                                className="mt-4 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all"
                                            >
                                                <RefreshIcon className="w-5 h-5 mr-2" />
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-center p-2">
                                            <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                                            <span className="text-sm">Ilustrasi untuk Kolom {index+1}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewModalImage && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setPreviewModalImage(null)}
                    aria-modal="true"
                    role="dialog"
                >
                    <button 
                        onClick={() => setPreviewModalImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                        aria-label="Close image preview"
                    >
                        <XMarkIcon className="w-8 h-8" />
                    </button>
                    <div 
                        className="relative max-w-4xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking on the image
                    >
                        <img 
                            src={`data:image/png;base64,${previewModalImage}`} 
                            alt="Illustration preview" 
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};