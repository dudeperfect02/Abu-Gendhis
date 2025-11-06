import React from 'react';

interface StoryInputProps {
    prompt: string;
    setPrompt: (value: string) => void;
    storyLength: 'very short' | 'short' | 'medium' | 'long';
    setStoryLength: (value: 'very short' | 'short' | 'medium' | 'long') => void;
    onGenerate: () => void;
    onStop: () => void;
    isLoading: boolean;
}

const QuillIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
    </svg>
);

const StopIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
    </svg>
);


export const StoryInput: React.FC<StoryInputProps> = ({ prompt, setPrompt, storyLength, setStoryLength, onGenerate, onStop, isLoading }) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <label htmlFor="story-prompt" className="block text-lg font-medium text-gray-300 mb-2">
                Your Story Idea
            </label>
            <textarea
                id="story-prompt"
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-gray-500"
                placeholder="e.g., A detective in a cyberpunk city investigates a case that leads to a conspiracy involving rogue AI..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
            />

            <div className="mt-4 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Story Length</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <label className="flex items-center text-gray-300 cursor-pointer p-3 rounded-md bg-gray-900/50 border border-gray-700 hover:border-indigo-500 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-900/30 transition-all">
                            <input type="radio" name="story-length" value="very short" checked={storyLength === 'very short'} onChange={() => setStoryLength('very short')} className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500" disabled={isLoading} />
                             <span className="ml-3 text-sm">
                                <span className="font-bold">Very Short</span>
                                <span className="block text-xs text-gray-400">~1,000 characters / 1 column</span>
                            </span>
                        </label>
                        <label className="flex items-center text-gray-300 cursor-pointer p-3 rounded-md bg-gray-900/50 border border-gray-700 hover:border-indigo-500 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-900/30 transition-all">
                            <input type="radio" name="story-length" value="short" checked={storyLength === 'short'} onChange={() => setStoryLength('short')} className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500" disabled={isLoading} />
                             <span className="ml-3 text-sm">
                                <span className="font-bold">Short Story</span>
                                <span className="block text-xs text-gray-400">~10,000 characters / 2 columns</span>
                            </span>
                        </label>
                        <label className="flex items-center text-gray-300 cursor-pointer p-3 rounded-md bg-gray-900/50 border border-gray-700 hover:border-indigo-500 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-900/30 transition-all">
                            <input type="radio" name="story-length" value="medium" checked={storyLength === 'medium'} onChange={() => setStoryLength('medium')} className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500" disabled={isLoading} />
                             <span className="ml-3 text-sm">
                                <span className="font-bold">Medium Story</span>
                                <span className="block text-xs text-gray-400">~50,000 characters / 5 columns</span>
                            </span>
                        </label>
                        <label className="flex items-center text-gray-300 cursor-pointer p-3 rounded-md bg-gray-900/50 border border-gray-700 hover:border-indigo-500 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-900/30 transition-all">
                            <input type="radio" name="story-length" value="long" checked={storyLength === 'long'} onChange={() => setStoryLength('long')} className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500" disabled={isLoading} />
                            <span className="ml-3 text-sm">
                                <span className="font-bold">Long Story</span>
                                <span className="block text-xs text-gray-400">~200,000 characters / 20 columns</span>
                            </span>
                        </label>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={isLoading ? onStop : onGenerate}
                        disabled={!isLoading && !prompt.trim()}
                        className={`flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-300 transform hover:scale-105 disabled:scale-100 ${
                            isLoading 
                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                            : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 focus:ring-indigo-500'
                        }`}
                    >
                        {isLoading ? (
                            <>
                               <StopIcon className="w-5 h-5 mr-2" />
                               Stop Generating
                            </>
                        ) : (
                            <>
                               <QuillIcon className="w-5 h-5 mr-2" />
                               Weave Story
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
