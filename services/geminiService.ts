import { GoogleGenAI, Type, Modality } from "@google/genai";
import React from 'react';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("The API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface StoryDetails {
    synopsis: string;
    hashtags: string[];
    tags: string[];
}

interface ProgressUpdate {
    percentage: number;
    chunk?: string;
    status: string;
    details?: StoryDetails;
}

// --- Audio Generation Helpers ---

function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function splitText(text: string, maxLength: number): string[] {
    const sentences = text.match(/([^\.!\?]+[\.!\?]*)/g) || [];

    if (sentences.length === 0) {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += maxLength) {
            chunks.push(text.substring(i, i + maxLength));
        }
        return chunks;
    }

    const chunks: string[] = [];
    let currentChunk = '';
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    
    const finalChunks: string[] = [];
    chunks.forEach(chunk => {
        if(chunk.length > maxLength) {
            for (let i = 0; i < chunk.length; i += maxLength) {
                finalChunks.push(chunk.substring(i, i + maxLength));
            }
        } else {
            finalChunks.push(chunk);
        }
    });

    return finalChunks;
}

const TTS_CHUNK_LIMIT = 4500; // Safe character limit for each TTS API call

export const generateSpeech = async (
    text: string,
    voice: string,
    style: string
): Promise<string | null> => {
    if (!text.trim()) {
        console.warn("generateSpeech was called with empty text.");
        return null;
    }
    try {
        const textChunks = splitText(text, TTS_CHUNK_LIMIT);

        // Run TTS requests in parallel for faster processing
        const audioGenerationPromises = textChunks.map(async (chunk) => {
            const trimmedChunk = chunk.trim();
            if (!trimmedChunk) {
                return null; // Skip empty or whitespace-only chunks
            }
            const promptText = style.trim() ? `${style.trim()}: ${trimmedChunk}` : trimmedChunk;
            
            let attempt = 0;
            const maxRetries = 3;
            
            while(attempt < maxRetries) {
                try {
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash-preview-tts",
                        contents: [{ parts: [{ text: promptText }] }],
                        config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: voice },
                                },
                            },
                        },
                    });
                    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) {
                        return decodeBase64(base64Audio); // Success!
                    }
                    console.warn(`No audio data received for chunk: "${trimmedChunk.substring(0, 50)}...". Attempt ${attempt + 1}/${maxRetries}`);
                } catch (err) {
                     console.error(`API error on TTS for chunk: "${trimmedChunk.substring(0, 50)}..." (Attempt ${attempt + 1}/${maxRetries})`, err);
                }
                
                attempt++;
                if (attempt < maxRetries) {
                    const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            console.error(`Failed to generate audio for chunk after ${maxRetries} attempts: "${trimmedChunk.substring(0, 50)}..."`);
            return null;
        });
        
        const audioDataChunks = (await Promise.all(audioGenerationPromises)).filter((data): data is Uint8Array => data !== null);

        if (audioDataChunks.length === 0) {
            throw new Error("No audio data was generated for any text chunk.");
        }

        // Concatenate all Uint8Arrays into a single audio stream
        const totalLength = audioDataChunks.reduce((acc, arr) => acc + arr.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of audioDataChunks) {
            combined.set(arr, offset);
            offset += arr.length;
        }

        return encodeBase64(combined);

    } catch (error) {
        console.error("Failed to generate speech:", error);
        return null;
    }
};


// --- Illustration Generation ---

const getStylePromptPrefix = (style: string): string => {
    const styleMap: Record<string, string> = {
        '3d': 'A cinematic, high-detail 3D render of',
        'anime': 'A vibrant, high-quality anime style illustration of',
        'paper': 'An intricate, multi-layered paper cut-out art style of',
        'illustrated': 'A classic, beautifully detailed storybook illustration of',
        'low-poly': 'A stylized, geometric low-poly art piece of',
        'watercolour': 'A beautiful, detailed watercolor painting of',
        'cartoon': 'A fun, expressive cartoon style drawing of',
        'goth': 'A dark, gothic, and moody illustration of',
        'art deco': 'An elegant, geometric Art Deco style representation of',
        'cinema': 'A dramatic, cinematic shot of',
        'realistic': 'A photorealistic, high-detail, 8k resolution, cinematic photo of',
        'glowly': 'A glowing, ethereal, neon-lit image of',
        'sweets': 'A cute, candy-themed illustration of, with frosting and sprinkles, depicting',
        'dreamy': 'A soft, ethereal, and dreamy fantasy illustration of',
        'dark': 'A dark, shadowy, and mysterious artwork of',
        'sunset': 'A scene bathed in the warm, golden light of a sunset, showing',
        'bright': 'A bright, vibrant, and cheerful illustration of',
        'cool': 'A scene dominated by cool tones (blues, greens, purples) of',
        'pink': 'A scene dominated by pink hues, showing',
        'lavender': 'A scene dominated by lavender and purple hues, showing',
        'earthy': 'A scene with a natural, earthy color palette (browns, greens, ochre) of',
        'orange': 'A scene dominated by warm orange and yellow hues, showing'
    };
    return styleMap[style.toLowerCase()] || `A digital painting in the style of ${style}, depicting`; // Fallback
}


export const createImagePromptFromChunk = async (chunk: string): Promise<string | null> => {
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Summarize the following text into a single, concise sentence that describes the main visual scene for an illustration. Focus on characters, setting, and key actions. Ignore dialogue and internal thoughts.
            
                Text: "${chunk}"`,
            });
            return response.text.trim(); // Success
        } catch (error) {
            attempt++;
            const isRetryable = error.toString().includes('500') || error.toString().includes('429');
            if (isRetryable && attempt < maxRetries) {
                const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
                console.warn(`Image prompt generation failed. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("Failed to create image prompt from chunk:", error);
                return null; // Final failure
            }
        }
    }
    return null; // Should not be reached
};


export const generateIllustration = async (visualPrompt: string, style: string): Promise<string | null> => {
    let attempt = 0;
    const maxRetries = 3;
    const initialDelay = 20000; // 20 seconds
    const maxDelay = 60000; // 60 seconds

    while (attempt < maxRetries) {
        try {
            const fullPrompt = `${getStylePromptPrefix(style)}: ${visualPrompt}`;
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/png',
                  aspectRatio: '16:9',
                },
            });
            const base64ImageBytes = response.generatedImages[0]?.image?.imageBytes;
            return base64ImageBytes ?? null; // Success, exit loop
        } catch (error: any) {
            attempt++;
            const isRateLimitError = error?.toString().includes('RESOURCE_EXHAUSTED') || error?.toString().includes('429');
            
            if (isRateLimitError && attempt < maxRetries) {
                const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
                console.warn(`Rate limit hit on generateIllustration. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("Failed to generate illustration:", error);
                return null; // Failed after retries or for a non-retryable error
            }
        }
    }
    return null; // Should only be reached if all retries fail
};

export const generateStylePreviewImage = async (style: string): Promise<string | null> => {
    try {
        const previewPrompt = "a cute, fluffy cat sitting in a cozy library";
        return await generateIllustration(previewPrompt, style);
    } catch (error) {
        console.error(`Failed to generate preview for style ${style}:`, error);
        return null;
    }
};


// --- Story Generation ---

const detectLanguage = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Identify the primary language of the following text. Respond with only the name of the language (e.g., "English", "Indonesian").\n\nText: "${text.slice(0, 1000)}"`,
        });
        const language = response.text.trim();
        // Basic validation to ensure it's a single word, likely a language.
        if (language && !language.includes(' ') && language.length < 20) {
            return language;
        }
        return 'English'; // Fallback
    } catch (e) {
        console.error("Language detection failed, defaulting to English.", e);
        return 'English'; // Fallback on error
    }
};

const generateStoryDetails = async (fullStory: string): Promise<StoryDetails | null> => {
    try {
        const language = await detectLanguage(fullStory);

        const prompt = `Based on the following story, please generate a brief synopsis, a list of relevant social media hashtags, and a list of keywords/tags for categorization. IMPORTANT: Generate all content in ${language}.

Story:
---
${fullStory.slice(0, 150000)}
---

Please provide the output in JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        synopsis: { type: Type.STRING, description: `A brief summary of the story in ${language}.` },
                        hashtags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: `An array of social media hashtags in ${language} (e.g., #ScienceFiction).`
                        },
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: `An array of keyword tags in ${language} (e.g., Cyberpunk).`
                        }
                    },
                    required: ["synopsis", "hashtags", "tags"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StoryDetails;

    } catch (error) {
        console.error("Failed to generate story details:", error);
        return null;
    }
};

export const generateStory = async (
    initialPrompt: string,
    onProgress: (update: ProgressUpdate) => void,
    isCancelledRef: React.MutableRefObject<boolean>,
    storyLength: 'very short' | 'short' | 'medium' | 'long'
): Promise<void> => {
    let TARGET_CHAR_COUNT: number;
    let NUM_CHUNKS: number;

    switch (storyLength) {
        case 'very short':
            TARGET_CHAR_COUNT = 1000;
            NUM_CHUNKS = 1;
            break;
        case 'short':
            TARGET_CHAR_COUNT = 10000;
            NUM_CHUNKS = 2;
            break;
        case 'medium':
            TARGET_CHAR_COUNT = 50000;
            NUM_CHUNKS = 5;
            break;
        case 'long':
        default:
            TARGET_CHAR_COUNT = 200000;
            NUM_CHUNKS = 20;
            break;
    }

    const CHARS_PER_CHUNK = TARGET_CHAR_COUNT / NUM_CHUNKS;
    let fullStory = "";

    const systemInstruction = `You are a world-class novelist. Your task is to write a coherent and engaging story based on a user's prompt. The story must be detailed, realistic, and avoid repetition. You will be writing the story in parts. I will provide you with the story written so far, and you must continue it seamlessly. IMPORTANT: Begin your response directly with the story text. Do not add any introductory phrases, conversational filler, or greetings like 'Tentu,', 'Here is the next part,', or similar preamble. Go straight to the point and continue the narrative.`;

    for (let i = 0; i < NUM_CHUNKS; i++) {
        if (isCancelledRef.current) {
            onProgress({
                percentage: (i / NUM_CHUNKS) * 100,
                status: "Generation stopped by user."
            });
            break; // Exit the loop
        }

        let currentPrompt = "";
        const contextStory = fullStory.slice(-50000); // Use last 50k chars for context

        if (NUM_CHUNKS === 1) {
            currentPrompt = `Here is the story idea: "${initialPrompt}". Write a complete short story of approximately ${CHARS_PER_CHUNK} characters based on this idea. The story should have a clear beginning, middle, and a conclusive end.`;
        } else if (i === 0) {
            currentPrompt = `Here is the story idea: "${initialPrompt}". Begin writing the first part of the story. Write approximately ${CHARS_PER_CHUNK} characters. Do not write the whole story, just the beginning.`;
        } else if (i === NUM_CHUNKS - 1) {
            // Last chunk: prompt for a conclusion
            currentPrompt = `Here is the original story idea: "${initialPrompt}".
Here is the story so far:
---
${contextStory}
---
This is the final part of the story. Please bring the narrative to a satisfying and conclusive end. Resolve the main plot, complete character arcs, and provide a definitive resolution. Write this final part to complete the story.`;
        } else {
            // Middle chunks: prompt for continuation
            currentPrompt = `Here is the original story idea: "${initialPrompt}".
Here is the story so far:
---
${contextStory}
---
Please continue the story from where it left off. Introduce new plot points, deepen character development, and maintain a realistic and engaging narrative. Do not repeat previous events or descriptions. Write the next part of the story, approximately ${CHARS_PER_CHUNK} characters long. Do not summarize or end the story. Just write the next part.`;
        }
        
        let attempt = 0;
        const maxRetries = 3;
        let success = false;
        let generatedText = '';

        while(attempt < maxRetries && !success) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: currentPrompt,
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.85,
                        topP: 0.95,
                        topK: 40,
                    }
                });
                generatedText = response.text;
                success = true; // Mark as successful to exit the retry loop
            } catch (error) {
                attempt++;
                const isRetryable = error.toString().includes('500') || error.toString().includes('429');
                if (isRetryable && attempt < maxRetries) {
                    const delay = 5000 * Math.pow(2, attempt - 1); // 5s, 10s
                    const status = `Network error. Retrying in ${delay / 1000}s...`;
                    console.warn(`Story generation chunk failed. ${status} (Attempt ${attempt})`);
                    onProgress({ percentage: (i / NUM_CHUNKS) * 100, status });
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error("Error generating story chunk:", error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                    onProgress({
                        percentage: (i / NUM_CHUNKS) * 100,
                        status: `Error: ${errorMessage}. Please check your API key and network connection.`
                    });
                    return; // Exit the entire function on final failure
                }
            }
        }
        
        if (!success) continue; // If all retries failed, skip to the next chunk (or end)

        let newChunk = '';

        // For all but the last chunk, try to truncate at a sentence end.
        if (i < NUM_CHUNKS - 1 && generatedText.length > CHARS_PER_CHUNK) {
            const cutText = generatedText.substring(0, CHARS_PER_CHUNK);
            const lastSentenceEnd = Math.max(
                cutText.lastIndexOf('.'),
                cutText.lastIndexOf('!'),
                cutText.lastIndexOf('?')
            );

            // Use the sentence end if it's found and is reasonably far in
            if (lastSentenceEnd > CHARS_PER_CHUNK * 0.8) {
                newChunk = cutText.substring(0, lastSentenceEnd + 1);
            } else {
                newChunk = cutText; // Fallback to hard cut if no good sentence end is found
            }
        } else {
            // For the last chunk, don't truncate. Let it finish the story.
            newChunk = generatedText;
        }


        if (newChunk) {
            fullStory += newChunk;
            const percentage = ((i + 1) / NUM_CHUNKS) * 100;
            const status = i === NUM_CHUNKS - 1 ? "Finishing the story..." : `Weaving part ${i + 2} of ${NUM_CHUNKS}...`;
            onProgress({ percentage, chunk: newChunk, status });
        }
    }

    if (fullStory.trim().length > 0 && !isCancelledRef.current) {
        onProgress({
            percentage: 100,
            status: "Generating story details..."
        });

        const details = await generateStoryDetails(fullStory);

        onProgress({
           percentage: 100,
           status: "Story generation complete!",
           details: details ?? undefined,
       });
    }
};
