
import React, { useState, useEffect, useRef } from 'react';
import { gemini } from './services/geminiService';
import { ToolPreset, StylePreset, PromptResult, ChatMessage, ImageSize, AspectRatio } from './types';
import { Timeline } from './components/Timeline';
import { toast, ToastContainer } from 'react-toastify';

const SUGGESTIONS = {
  camera: ['Wide Shot', 'Extreme Close-up', 'Tracking Shot', 'Low Angle', 'Bird\'s Eye View', 'Dutch Angle', 'Handheld Motion'],
  lighting: ['Golden Hour', 'Volumetric Lighting', 'Neon Glow', 'Soft Diffusion', 'Chiaroscuro', 'High Key', 'Cyberpunk Blue & Pink'],
  vibe: ['Hyper-realistic', 'Epic scale', 'Vintage Film Grain', 'Anamorphic Lens', 'Slow Motion', 'Masterpiece', 'Dreamy Bokeh']
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'chat'>('video');
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  
  // Settings
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  // Video State
  const [videoForm, setVideoForm] = useState({
    concept: '',
    duration: 10,
    style: StylePreset.CINEMATIC,
    aspectRatio: '16:9' as any,
    tool: ToolPreset.SORA
  });
  const [result, setResult] = useState<PromptResult | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Image State
  const [imageForm, setImageForm] = useState({
    prompt: '',
    size: '1K' as ImageSize,
    aspectRatio: '16:9' as AspectRatio
  });
  const [studioImage, setStudioImage] = useState<string | null>(null);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [analysisText, setAnalysisText] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) liveSessionRef.current.close();
    };
  }, []);

  // --- Handlers ---

  const checkVeoKey = async () => {
    if (typeof (window as any).aistudio !== 'undefined') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }
  };

  const handleError = (err: any, toastId?: any) => {
    console.error("Operation Error:", err);
    const message = err.message || "An unexpected error occurred.";
    
    // Special handling for Veo key errors as per guidelines
    if (message.includes("Requested entity was not found.")) {
      if (toastId) {
        toast.update(toastId, { render: "API Key Validation Failed. Please re-select a paid key.", type: "error", isLoading: false, autoClose: 5000 });
      } else {
        toast.error("API Key Validation Failed. Please re-select a paid key.");
      }
      (window as any).aistudio?.openSelectKey();
      return;
    }

    if (toastId) {
      toast.update(toastId, { render: message, type: "error", isLoading: false, autoClose: 5000 });
    } else {
      toast.error(message);
    }
  };

  const handleVideoProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading(videoForm.tool === ToolPreset.VEO ? "Initializing high-fidelity video rendering..." : "Synthesizing directorial script...");
    
    try {
      if (videoForm.tool === ToolPreset.VEO) {
        await checkVeoKey();
        const url = await gemini.generateVeoVideo(videoForm.concept, videoForm.aspectRatio);
        setGeneratedVideoUrl(url);
        toast.update(toastId, { render: "Cinematic sequence rendered successfully!", type: "success", isLoading: false, autoClose: 3000 });
      } else {
        const data = await gemini.generateVideoPrompt({ ...videoForm, useSearch, useThinking });
        setResult({
          id: Date.now().toString(),
          ...videoForm,
          generatedPrompt: data.masterPrompt,
          breakdown: data.breakdown,
          createdAt: Date.now(),
          cameraAnalysis: data.analysis.camera,
          characterAnalysis: data.analysis.character,
          contextAnalysis: data.analysis.context,
          cinematicAnalysis: data.analysis.cinematic
        });
        toast.update(toastId, { render: "Production script ready for review.", type: "success", isLoading: false, autoClose: 3000 });
      }
    } catch (err) {
      handleError(err, toastId);
    } finally {
      setLoading(false);
    }
  };

  const addSuggestion = (text: string) => {
    setVideoForm(prev => ({
      ...prev,
      concept: prev.concept ? `${prev.concept.trim()}, ${text}` : text
    }));
  };

  const handleImageGeneration = async () => {
    setLoading(true);
    const toastId = toast.loading(`Generating ${imageForm.size} cinematic asset...`);
    try {
      const img = await gemini.generateImagePro(imageForm.prompt, imageForm.aspectRatio, imageForm.size);
      setStudioImage(img);
      setImageToEdit(img);
      toast.update(toastId, { render: "Asset generated successfully.", type: "success", isLoading: false, autoClose: 3000 });
    } catch (err) {
      handleError(err, toastId);
    } finally {
      setLoading(false);
    }
  };

  const handleImageAnalysis = async () => {
    if (!studioImage) return;
    setLoading(true);
    const toastId = toast.loading("Analyzing visual composition...");
    try {
      const text = await gemini.analyzeImage(studioImage);
      setAnalysisText(text);
      toast.update(toastId, { render: "Composition analysis complete.", type: "success", isLoading: false, autoClose: 3000 });
    } catch (err) {
      handleError(err, toastId);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimateImage = async () => {
    if (!studioImage) return;
    setLoading(true);
    const toastId = toast.loading("Animating reference frame with Veo...");
    try {
      await checkVeoKey();
      const url = await gemini.generateVeoVideo("Animate this reference frame with cinematic motion.", "16:9", studioImage);
      setGeneratedVideoUrl(url);
      setActiveTab('video');
      toast.update(toastId, { render: "Animation complete!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (err) {
      handleError(err, toastId);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages([...chatMessages, userMsg]);
    setChatInput('');
    setLoading(true);
    try {
      const text = await gemini.sendMessage(chatInput, useThinking);
      setChatMessages(prev => [...prev, { role: 'model', text: text }]);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const startTranscription = async () => {
    setIsTranscribing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        const toastId = toast.loading("Transcribing audio...");
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const text = await gemini.transcribeAudio(base64);
            setChatInput(text);
            toast.update(toastId, { render: "Transcription complete.", type: "success", isLoading: false, autoClose: 2000 });
          } catch (err) {
            handleError(err, toastId);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current.start();
      toast.info("Listening...", { autoClose: 4500 });
      setTimeout(() => mediaRecorderRef.current?.stop(), 5000);
    } catch (err) {
      handleError(err);
      setIsTranscribing(false);
    }
  };

  const toggleLive = async () => {
    if (isLive) {
      liveSessionRef.current?.close();
      setIsLive(false);
      toast.info("Live session ended.");
      return;
    }
    
    const toastId = toast.loading("Establishing Live Neural Connection...");
    try {
      setIsLive(true);
      const sessionPromise = gemini.connectLive({
        onopen: () => {
          toast.update(toastId, { render: "Live Assistant Online.", type: "success", isLoading: false, autoClose: 3000 });
        },
        onmessage: async (msg) => {
          const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio) {
            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const ctx = audioContextRef.current;
            const bytes = gemini.decodeBase64(audio);
            const decoded = await gemini.decodeAudioData(bytes, ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(ctx.destination);
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += decoded.duration;
          }
        },
        onerror: (e) => {
          handleError(e);
          setIsLive(false);
        },
        onclose: () => {
          setIsLive(false);
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      handleError(err, toastId);
      setIsLive(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-slate-950 text-slate-200">
      <ToastContainer theme="dark" position="bottom-right" />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-800 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
                <i className="fa-solid fa-wand-sparkles text-white text-xl"></i>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-signature text-3xl text-white leading-none tracking-tight">Cinematix</span>
              <span className="text-[9px] text-indigo-400 font-black tracking-[0.4em] uppercase opacity-80 mt-0.5 pl-1">Productions</span>
            </div>
          </div>
          
          <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5 shadow-inner">
            <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-clapperboard"></i> <span className="hidden sm:inline">Production Desk</span>
            </button>
            <button onClick={() => setActiveTab('image')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'image' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-palette"></i> <span className="hidden sm:inline">Visual Studio</span>
            </button>
            <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-brain"></i> <span className="hidden sm:inline">Neural Chat</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {activeTab === 'video' && (
          <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
            <div className="lg:col-span-4 space-y-8">
              <section className="bg-slate-900/40 rounded-[32px] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                <header className="mb-8 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white tracking-tight">Director's Controls</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setUseSearch(!useSearch)} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${useSearch ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-white/5 text-slate-500'}`} title="Search Grounding">
                      <i className="fa-solid fa-globe"></i>
                    </button>
                    <button onClick={() => setUseThinking(!useThinking)} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${useThinking ? 'bg-violet-600 border-violet-400 text-white' : 'bg-slate-800 border-white/5 text-slate-500'}`} title="Thinking Mode">
                      <i className="fa-solid fa-microchip"></i>
                    </button>
                  </div>
                </header>

                <form onSubmit={handleVideoProduction} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Core Script / Prompt</label>
                    <textarea 
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-5 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none h-40"
                      placeholder="Input your vision..."
                      value={videoForm.concept}
                      onChange={(e) => setVideoForm({...videoForm, concept: e.target.value})}
                    />

                    {/* Enhanced Suggestions System */}
                    <div className="mt-4 space-y-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Camera Geometry</span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTIONS.camera.map(s => (
                            <button key={s} type="button" onClick={() => addSuggestion(s)} className="text-[9px] px-2.5 py-1.5 bg-slate-800/50 hover:bg-indigo-600/30 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Atmosphere & Light</span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTIONS.lighting.map(s => (
                            <button key={s} type="button" onClick={() => addSuggestion(s)} className="text-[9px] px-2.5 py-1.5 bg-slate-800/50 hover:bg-violet-600/30 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 block">Cinematic Vibe</span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTIONS.vibe.map(s => (
                            <button key={s} type="button" onClick={() => addSuggestion(s)} className="text-[9px] px-2.5 py-1.5 bg-slate-800/50 hover:bg-emerald-600/30 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Engine</label>
                      <select className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white appearance-none" value={videoForm.tool} onChange={(e) => setVideoForm({...videoForm, tool: e.target.value as ToolPreset})}>
                        <option value={ToolPreset.SORA}>Sora (4C Prompt)</option>
                        <option value={ToolPreset.VEO}>Veo (Video Gen)</option>
                        <option value={ToolPreset.RUNWAY}>Runway Gen-3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Aspect</label>
                      <select className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white" value={videoForm.aspectRatio} onChange={(e) => setVideoForm({...videoForm, aspectRatio: e.target.value as any})}>
                        <option value="16:9">16:9 Cinema</option>
                        <option value="9:16">9:16 Portrait</option>
                      </select>
                    </div>
                  </div>

                  <button disabled={loading || !videoForm.concept} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 disabled:opacity-30 text-white rounded-2xl font-black shadow-2xl transition-all">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : videoForm.tool === ToolPreset.VEO ? "Generate Video" : "Generate Script"}
                  </button>
                </form>
              </section>
            </div>

            <div className="lg:col-span-8 space-y-8">
              {generatedVideoUrl ? (
                <div className="bg-black rounded-[40px] border border-white/5 overflow-hidden shadow-2xl aspect-video">
                  <video src={generatedVideoUrl} controls className="w-full h-full object-contain" autoPlay loop />
                </div>
              ) : result ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
                   <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 md:p-10 shadow-2xl relative group">
                      <div className="bg-black/60 p-8 rounded-3xl border border-white/5 font-mono text-sm leading-relaxed text-indigo-100 mb-8">{result.generatedPrompt}</div>
                      <div className="grid md:grid-cols-2 gap-5">
                        {[{l:'Camera',v:result.cameraAnalysis,i:'fa-video',c:'text-blue-400'}, {l:'Character',v:result.characterAnalysis,i:'fa-user',c:'text-purple-400'}, {l:'Context',v:result.contextAnalysis,i:'fa-mountain-sun',c:'text-emerald-400'}, {l:'Cinematic',v:result.cinematicAnalysis,i:'fa-wand-magic',c:'text-amber-400'}].map((x,i)=>(
                          <div key={i} className="bg-slate-950/40 p-5 rounded-2xl border border-white/5">
                            <div className={`flex items-center gap-3 mb-3 ${x.c}`}><i className={`fa-solid ${x.i}`}></i><span className="text-[10px] font-black uppercase tracking-widest">{x.l}</span></div>
                            <p className="text-sm text-slate-300">{x.v || 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                   <Timeline breakdown={result.breakdown} totalDuration={result.duration} />
                </div>
              ) : (
                <div className="h-[500px] border-2 border-dashed border-white/5 rounded-[40px] flex items-center justify-center text-slate-700 bg-slate-900/20">
                  <p className="text-lg font-bold opacity-30">Production Preview Initialized</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <section className="bg-slate-900/40 rounded-[32px] p-8 border border-white/5 shadow-2xl">
                <h2 className="text-2xl font-bold mb-8">Image Studio Pro</h2>
                <div className="space-y-6">
                  <textarea className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-5 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none h-32" placeholder="Describe your cinematic frame..." value={imageForm.prompt} onChange={(e)=>setImageForm({...imageForm, prompt:e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <select className="bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white" value={imageForm.size} onChange={(e)=>setImageForm({...imageForm, size: e.target.value as ImageSize})}>
                      <option value="1K">1K Standard</option>
                      <option value="2K">2K High Res</option>
                      <option value="4K">4K Ultra HD</option>
                    </select>
                    <select className="bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white" value={imageForm.aspectRatio} onChange={(e)=>setImageForm({...imageForm, aspectRatio: e.target.value as AspectRatio})}>
                      <option value="16:9">16:9 Cinema</option>
                      <option value="1:1">1:1 Square</option>
                      <option value="9:16">9:16 Portrait</option>
                      <option value="21:9">21:9 Ultrawide</option>
                    </select>
                  </div>
                  <button onClick={handleImageGeneration} disabled={loading || !imageForm.prompt} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Synthesize Asset"}
                  </button>
                </div>
              </section>

              {studioImage && (
                <section className="bg-slate-900/40 rounded-[32px] p-8 border border-white/5 shadow-2xl space-y-6">
                  <div className="flex gap-4">
                    <button onClick={handleImageAnalysis} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Analyze Frame</button>
                    <button onClick={handleAnimateImage} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">Animate with Veo</button>
                  </div>
                  {analysisText && <div className="p-4 bg-black/40 rounded-xl text-xs text-slate-400 italic border border-white/5">{analysisText}</div>}
                  <div className="pt-4 border-t border-white/5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Neural Edit (Flash)</label>
                    <div className="flex gap-3">
                      <input type="text" className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm" placeholder="e.g. Add a retro filter..." value={editInstruction} onChange={(e)=>setEditInstruction(e.target.value)} />
                      <button onClick={async () => {
                        setLoading(true);
                        const toastId = toast.loading("Synthesizing neural edits...");
                        try {
                          const img = await gemini.editImageFlash(studioImage, editInstruction);
                          setStudioImage(img);
                          toast.update(toastId, { render: "Visual adjustments applied.", type: "success", isLoading: false, autoClose: 3000 });
                        } catch (err) {
                          handleError(err, toastId);
                        } finally {
                          setLoading(false);
                        }
                      }} className="bg-violet-600 px-4 rounded-xl"><i className="fa-solid fa-wand-magic-sparkles"></i></button>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="bg-black rounded-[40px] border border-white/5 aspect-video overflow-hidden shadow-2xl relative flex items-center justify-center">
              {studioImage ? <img src={studioImage} className="w-full h-full object-cover" /> : <i className="fa-solid fa-image text-4xl opacity-10"></i>}
              {loading && <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500"></i></div>}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto flex flex-col h-[70vh] bg-slate-900/40 rounded-[40px] border border-white/5 shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <i className="fa-solid fa-brain"></i>
                </div>
                <div>
                  <h2 className="font-bold text-white">Production Assistant</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Neural Network active</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={toggleLive} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                    <i className="fa-solid fa-microphone"></i> {isLive ? 'Live Voice On' : 'Start Live API'}
                 </button>
                 <button onClick={() => setUseThinking(!useThinking)} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${useThinking ? 'bg-violet-600 border-violet-400 text-white' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                    <i className="fa-solid fa-microchip"></i>
                 </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {chatMessages.length === 0 && <div className="h-full flex items-center justify-center text-slate-600 font-medium italic opacity-50">Ask anything about your cinematic project...</div>}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-5 rounded-3xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'} shadow-lg`}>{msg.text}</div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-slate-800 p-4 rounded-2xl animate-pulse text-xs text-slate-500">Thinking...</div></div>}
            </div>

            <div className="p-6 bg-slate-900/60 border-t border-white/5">
              <div className="flex gap-4">
                <button onClick={startTranscription} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isTranscribing ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  <i className="fa-solid fa-microphone-lines text-xl"></i>
                </button>
                <input type="text" className="flex-1 bg-slate-950/50 border border-white/10 rounded-2xl px-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none" placeholder="Message assistant..." value={chatInput} onChange={(e)=>setChatInput(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && handleSendMessage()} />
                <button onClick={handleSendMessage} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center shadow-xl"><i className="fa-solid fa-paper-plane"></i></button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center mt-12 opacity-40">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em]">Powered by Gemini 3.0 & Veo 3.1 Pro Engine</p>
      </footer>

      <style>{`
        @keyframes progress-custom { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .animate-progress-custom { animation: progress-custom 2s infinite ease-in-out; }
        .font-signature { font-family: 'Sacramento', cursive; }
      `}</style>
    </div>
  );
};

export default App;
