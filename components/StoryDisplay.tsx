import React, { useState, useRef, useCallback } from 'react';
import { ProgressBar } from './ProgressBar';
import { generateSpeech } from '../services/geminiService';
import type { StoryDetails } from '../services/geminiService';

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

const StopCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 00-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
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
    const [generatingAudioIndices, setGeneratingAudioIndices] = useState<Set<number>>(new Set());
    const [audioData, setAudioData] = useState<Record<number, string>>({});
    const [globalVoice, setGlobalVoice] = useState<string>('Kore');
    const [globalStyle, setGlobalStyle] = useState<string>('');
    
    // Playback State
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingState, setPlayingState] = useState<{ type: 'main' | 'preview'; key: string | number } | null>(null);
    
    // Preview State
    const [previewAudioCache, setPreviewAudioCache] = useState<Record<string, string>>({});
    const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);

    // Generate All State
    const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
    const [generateAllStatus, setGenerateAllStatus] = useState<string>('');
    const isCancellingAllAudioRef = useRef<boolean>(false);

    const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
    
    const stopAnyAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
        setPlayingState(null);
    }, []);
    
    const playAudio = useCallback(async (base64Data: string, onEnded: () => void) => {
        stopAnyAudio();
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
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

    const generateSingleAudio = async (index: number, text: string) => {
        const voice = globalVoice;
        const style = globalStyle;

        setGeneratingAudioIndices(prev => new Set(prev).add(index));
        try {
            const audioBase64 = await generateSpeech(text, voice, style);
            if (audioBase64) {
                setAudioData(prev => ({ ...prev, [index]: audioBase64 }));
            } else {
                console.error(`Failed to generate audio for chunk ${index}: No data received.`);
            }
        } catch (err) {
            console.error(`Error generating audio for chunk ${index}:`, err);
        } finally {
            setGeneratingAudioIndices(prev => {
                const newSet = new Set(prev);
                newSet.delete(index);
                return newSet;
            });
        }
    };
    
    const handleGenerateAllAudio = async () => {
        setIsGeneratingAll(true);
        isCancellingAllAudioRef.current = false;
        
        for (let i = 0; i < storyChunks.length; i++) {
            if (isCancellingAllAudioRef.current) {
                setGenerateAllStatus('Audio generation cancelled.');
                break;
            }
            if (!audioData[i]) { // Only generate if not already generated
                setGenerateAllStatus(`Generating audio for Kolom ${i + 1} of ${storyChunks.length}...`);
                await generateSingleAudio(i, storyChunks[i]);
            }
        }
        
        if (!isCancellingAllAudioRef.current) {
            setGenerateAllStatus('All audio generation complete!');
        }
        setIsGeneratingAll(false);
        setTimeout(() => setGenerateAllStatus(''), 4000);
    };

    const handleCancelAllAudio = () => {
        isCancellingAllAudioRef.current = true;
    };

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

    const handlePlayMainAudio = (index: number, base64Data: string) => {
        if (playingState?.type === 'main' && playingState.key === index) {
            stopAnyAudio();
        } else {
            setPlayingState({ type: 'main', key: index });
            playAudio(base64Data, () => {
                 if (playingState?.type === 'main' && playingState.key === index) {
                    setPlayingState(null);
                }
            });
        }
    };
    
    const handlePlayPreview = async (voice: string) => {
        if (playingState?.type === 'preview' && playingState.key === voice) {
            stopAnyAudio();
            return;
        }

        stopAnyAudio();

        if (previewAudioCache[voice]) {
            setPlayingState({ type: 'preview', key: voice });
            playAudio(previewAudioCache[voice], () => {
                 if (playingState?.type === 'preview' && playingState.key === voice) {
                    setPlayingState(null);
                }
            });
            return;
        }

        setGeneratingPreview(voice);
        try {
            const audioBase64 = await generateSpeech(voice, voice, '');
            if (audioBase64) {
                setPreviewAudioCache(prev => ({...prev, [voice]: audioBase64}));
                setPlayingState({ type: 'preview', key: voice });
                playAudio(audioBase64, () => {
                    if (playingState?.type === 'preview' && playingState.key === voice) {
                        setPlayingState(null);
                    }
                });
            }
        } catch (err) {
            console.error("Failed to generate voice preview:", err);
        } finally {
            setGeneratingPreview(null);
        }
    };


    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-200">Generated Story</h2>
                {isFinished && (
                    <div className="flex flex-wrap items-center gap-2">
                         {playingState && (
                            <button
                                onClick={stopAnyAudio}
                                className="flex items-center justify-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-300 bg-red-800/50 hover:bg-red-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all"
                                aria-label="Stop current audio"
                            >
                                <StopIcon className="w-5 h-5 mr-2" />
                                Stop Audio
                            </button>
                        )}
                        {isGeneratingAll ? (
                             <button
                                onClick={handleCancelAllAudio}
                                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all"
                            >
                                <StopIcon className="w-5 h-5 mr-2" />
                                Cancel
                            </button>
                        ) : (
                             <button
                                onClick={handleGenerateAllAudio}
                                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-all"
                                disabled={isGeneratingAll || generatingAudioIndices.size > 0}
                            >
                                <SpeakerIcon className="w-5 h-5 mr-2" />
                                Generate All Audio
                            </button>
                        )}
                       
                        <button
                            onClick={onDownload}
                            className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            Download Story
                        </button>
                    </div>
                )}
            </div>
            
            {isFinished && (
                <div className="space-y-4 px-1 pt-4 border-t border-gray-700/60">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Global Voice Selection
                        </label>
                         <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {voices.map(voice => {
                                const isSelected = globalVoice === voice;
                                const isPlayingPreview = playingState?.type === 'preview' && playingState.key === voice;
                                const isGeneratingPreview = generatingPreview === voice;

                                return (
                                    <div key={voice} className="relative">
                                        <button
                                            onClick={() => handlePlayPreview(voice)}
                                            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-600/50 hover:bg-gray-500/50 text-gray-300 hover:text-white transition"
                                            disabled={isGeneratingPreview || isLoading || isGeneratingAll}
                                            aria-label={`Play preview for ${voice}`}
                                        >
                                            {isGeneratingPreview ? <SpinnerIcon className="w-4 h-4" /> :
                                                isPlayingPreview ? <StopCircleIcon className="w-4 h-4" /> :
                                                <PlayIcon className="w-4 h-4" />
                                            }
                                        </button>
                                        <button
                                            onClick={() => setGlobalVoice(voice)}
                                            className={`w-full text-center py-2 pl-8 pr-2 border text-sm rounded-md transition ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'}`}
                                            disabled={isGeneratingAll || generatingAudioIndices.size > 0}
                                        >
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
                        <input
                            id="global-style-input"
                            type="text"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition placeholder-gray-500 disabled:opacity-50"
                            placeholder="e.g., Speak cheerfully, narrate in a serious tone"
                            value={globalStyle}
                            onChange={(e) => setGlobalStyle(e.target.value)}
                            disabled={isGeneratingAll || generatingAudioIndices.size > 0}
                        />
                    </div>
                </div>
            )}
            
            {(isGeneratingAll || generateAllStatus) && (
                <div className="text-center text-indigo-300 py-1 text-sm">
                    {generateAllStatus}
                </div>
            )}

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
                 <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-lg">Your story will appear here.</p>
                </div>
            )}

            {storyChunks.length > 0 && (
                <div className="[transform:rotateX(180deg)]">
                    <div className="flex overflow-x-auto pb-4 space-x-6 [transform:rotateX(180deg)]">
                        {storyChunks.map((chunk, index) => {
                            const isGenerating = generatingAudioIndices.has(index);
                            const audioBase64 = audioData[index];
                            return (
                                <div key={index} className="flex-shrink-0 w-[90vw] max-w-xl h-[38rem] bg-gray-900/70 rounded-lg border border-gray-700 flex flex-col shadow-md">
                                    <div className="flex justify-between items-center p-3 border-b border-gray-700/50">
                                        <h4 className="font-bold text-indigo-400">Kolom {index + 1}</h4>
                                    </div>
                                    <div className="p-4 overflow-y-auto flex-grow">
                                        <p className="text-gray-300 whitespace-pre-wrap font-serif text-base leading-relaxed">
                                            {chunk}
                                        </p>
                                    </div>
                                    <div className="p-3 border-t border-gray-700/50 space-y-3 bg-gray-900/80 min-h-[96px] flex flex-col justify-center">
                                         {audioBase64 ? (
                                            <div className="flex items-center justify-center gap-4">
                                                <button
                                                    onClick={() => handlePlayMainAudio(index, audioBase64)}
                                                    className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all"
                                                >
                                                     {playingState?.type === 'main' && playingState.key === index ? 
                                                        <><StopCircleIcon className="w-5 h-5 mr-2" /> Stop Audio</> : 
                                                        <><PlayIcon className="w-5 h-5 mr-2" /> Play Audio</>
                                                     }
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadAudio(index, audioBase64)}
                                                    className="flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all"
                                                >
                                                    <DownloadIcon className="w-5 h-5 mr-2" /> Download
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {isGenerating ? (
                                                    <div className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-indigo-300 bg-gray-700 cursor-wait">
                                                        <SpinnerIcon className="w-5 h-5 mr-2" />
                                                        Generating...
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => generateSingleAudio(index, chunk)}
                                                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                        disabled={isLoading || isGeneratingAll}
                                                    >
                                                        <SpeakerIcon className="w-5 h-5 mr-2" />
                                                        Generate Audio
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};