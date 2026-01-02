
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { SceneBreakdown, ToolPreset, ImageSize, AspectRatio } from "../types";

export class GeminiService {
  // Guidelines: Create a new GoogleGenAI instance right before making an API call.
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateVideoPrompt(params: {
    concept: string;
    duration: number;
    style: string;
    aspectRatio: string;
    tool: ToolPreset;
    useSearch?: boolean;
    useThinking?: boolean;
  }): Promise<any> {
    const ai = this.getAI();
    const { concept, duration, style, aspectRatio, tool, useSearch, useThinking } = params;

    let toolGuidance = "";
    if (tool === ToolPreset.SORA || tool === ToolPreset.VEO) {
      toolGuidance = "Use the 4C Model: Camera + Character + Context + Cinematic. Ensure it handles complex physics and narrative.";
    } else if (tool === ToolPreset.RUNWAY) {
      toolGuidance = "Format: 'camera: [motion] | style: [style] | subject: [subject]'.";
    }

    const config: any = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          masterPrompt: { type: Type.STRING },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                duration: { type: Type.NUMBER },
                type: { type: Type.STRING },
                camera: { type: Type.STRING },
                lighting: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["duration", "type", "camera", "lighting", "description"]
            }
          },
          analysis: {
            type: Type.OBJECT,
            properties: {
              camera: { type: Type.STRING },
              character: { type: Type.STRING },
              context: { type: Type.STRING },
              cinematic: { type: Type.STRING }
            }
          }
        },
        required: ["masterPrompt", "breakdown", "analysis"]
      }
    };

    if (useSearch) config.tools = [{ googleSearch: {} }];
    if (useThinking) config.thinkingConfig = { thinkingBudget: 32768 };

    const response = await ai.models.generateContent({
      model: useThinking ? "gemini-3-pro-preview" : "gemini-3-flash-preview",
      contents: `You are a world-class AI Video Director. Generate a high-end video prompt for ${tool} based on: "${concept}".
      Duration: ${duration}s. Style: ${style}. Aspect Ratio: ${aspectRatio}.
      ${toolGuidance}
      Provide: masterPrompt, breakdown (JSON array), and 4C analysis.`,
      config
    });

    return JSON.parse(response.text);
  }

  async generateVeoVideo(prompt: string, aspectRatio: '16:9' | '9:16', imageBase64?: string): Promise<string> {
    const ai = this.getAI();
    const videoConfig: any = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    };

    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: videoConfig
    };

    if (imageBase64) {
      payload.image = {
        imageBytes: imageBase64.split(',')[1],
        mimeType: 'image/png'
      };
    }

    let operation = await ai.models.generateVideos(payload);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async generateImagePro(prompt: string, aspectRatio: AspectRatio, size: ImageSize): Promise<string> {
    const ai = this.getAI();
    const supportedRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const finalRatio = supportedRatios.includes(aspectRatio) ? aspectRatio : "16:9";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: finalRatio as any,
          imageSize: size
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Image generation failed");
  }

  async editImageFlash(base64Image: string, instruction: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
          { text: instruction }
        ]
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Edit failed");
  }

  async analyzeImage(base64Image: string, prompt: string = "Analyze this image for cinematic potential, lighting, and composition."): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
          { text: prompt }
        ]
      }
    });
    return response.text || "No analysis available.";
  }

  async transcribeAudio(audioBase64: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType: 'audio/wav' } },
          { text: "Transcribe the following audio accurately." }
        ]
      }
    });
    return response.text || "";
  }

  async sendMessage(text: string, useThinking: boolean): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: useThinking ? "gemini-3-pro-preview" : "gemini-flash-lite-latest",
      contents: text,
      config: useThinking ? { thinkingConfig: { thinkingBudget: 32768 } } : {}
    });
    return response.text || "";
  }

  // FIXED: Implementation of connectLive with required callbacks and config.
  connectLive(callbacks: {
    onmessage: (msg: LiveServerMessage) => void;
    onopen: () => void;
    onerror: (e: any) => void;
    onclose: (e: any) => void;
  }) {
    const ai = this.getAI();
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: callbacks.onopen,
        onmessage: async (message: LiveServerMessage) => {
          callbacks.onmessage(message);
        },
        onerror: callbacks.onerror,
        onclose: callbacks.onclose,
      },
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });
  }

  // Helper methods required by App.tsx for base64 decoding and audio processing
  decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}

// FIXED: Exporting 'gemini' instance as required by App.tsx
export const gemini = new GeminiService();
