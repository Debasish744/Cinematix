
import React, { useState, useEffect } from 'react';
import { gemini } from './services/geminiService';
import { ToolPreset, StylePreset, PromptResult } from './types';
import { Timeline } from './components/Timeline';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');
  const [loading, setLoading] = useState(false);
  
  // Video Prompt State
  const [videoForm, setVideoForm] = useState({
    concept: '',
    duration: 10,
    style: StylePreset.CINEMATIC,
    aspectRatio: '16:9',
    tool: ToolPreset.SORA
  });
  const [result, setResult] = useState<PromptResult | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<PromptResult[]>([]);

  // Image Studio State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [studioImage, setStudioImage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cinematix_prompts');
    if (saved) setSavedPrompts(JSON.parse(saved));
  }, []);

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.concept) return;
    
    setLoading(true);
    try {
      const data = await gemini.generateVideoPrompt(videoForm);
      const newResult: PromptResult = {
        id: Date.now().toString(),
        ...videoForm,
        generatedPrompt: data.masterPrompt,
        breakdown: data.breakdown,
        createdAt: Date.now(),
        cameraAnalysis: data.analysis.camera,
        characterAnalysis: data.analysis.character,
        contextAnalysis: data.analysis.context,
        cinematicAnalysis: data.analysis.cinematic
      };
      setResult(newResult);
      const updated = [newResult, ...savedPrompts].slice(0, 10);
      setSavedPrompts(updated);
      localStorage.setItem('cinematix_prompts', JSON.stringify(updated));
    } catch (err) {
      alert("Error generating prompt. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncToImageStudio = async () => {
    if (!result) return;
    setActiveTab('image');
    setImagePrompt(result.concept);
    setLoading(true);
    try {
      const img = await gemini.generateImage(result.generatedPrompt, result.aspectRatio);
      setStudioImage(img);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setLoading(true);
    try {
      const img = await gemini.generateImage(imagePrompt, videoForm.aspectRatio);
      setStudioImage(img);
      setImageToEdit(img);
    } catch (err) {
      alert("Error generating image.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageEdit = async () => {
    if (!imageToEdit || !editInstruction) return;
    setLoading(true);
    try {
      const resultImg = await gemini.editImage(imageToEdit, editInstruction);
      setStudioImage(resultImg);
      setImageToEdit(resultImg);
    } catch (err) {
      alert("Error editing image.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setImageToEdit(res);
        setStudioImage(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Prompt copied to clipboard!");
  };

  return (
    <div className="min-h-screen font-sans bg-slate-950 text-slate-200">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          {/* Enhanced Signature Logo */}
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 group-hover:rotate-6 transition-transform duration-500">
                <i className="fa-solid fa-wand-sparkles text-white text-xl"></i>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-signature text-3xl text-white leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(99,102,241,0.5)]">
                Cinematix
              </span>
              <span className="text-[9px] text-indigo-400 font-black tracking-[0.4em] uppercase opacity-80 pl-1 mt-0.5">
                Productions
              </span>
            </div>
          </div>
          
          <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5 shadow-inner">
            <button 
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${activeTab === 'video' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="fa-solid fa-video"></i> <span className="hidden sm:inline">Video Studio</span><span className="sm:hidden">Video</span>
            </button>
            <button 
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${activeTab === 'image' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="fa-solid fa-image"></i> <span className="hidden sm:inline">Visual Reference</span><span className="sm:hidden">Image</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {activeTab === 'video' ? (
          <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
            {/* Control Panel */}
            <div className="lg:col-span-4 space-y-8">
              <section className="bg-slate-900/40 rounded-[32px] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <header className="mb-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Director's Desk</h2>
                    <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">4C Pipeline</span>
                  </div>
                </header>

                <form onSubmit={handleVideoSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Core Concept</label>
                    <textarea 
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-5 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none shadow-inner"
                      rows={4}
                      placeholder="e.g. Extreme slow-motion physics of a water droplet hitting a hot pan..."
                      value={videoForm.concept}
                      onChange={(e) => setVideoForm({...videoForm, concept: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Platform</label>
                      <select 
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none shadow-inner"
                        value={videoForm.tool}
                        onChange={(e) => setVideoForm({...videoForm, tool: e.target.value as ToolPreset})}
                      >
                        <option value={ToolPreset.SORA}>OpenAI Sora (4C)</option>
                        <option value={ToolPreset.RUNWAY}>Runway Gen-3</option>
                        <option value={ToolPreset.PIKA}>Pika Art 2.0</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Style</label>
                      <select 
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                        value={videoForm.style}
                        onChange={(e) => setVideoForm({...videoForm, style: e.target.value as StylePreset})}
                      >
                        {Object.values(StylePreset).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Duration: {videoForm.duration}s</label>
                      <input 
                        type="range" min="5" max="30" step="5"
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        value={videoForm.duration}
                        onChange={(e) => setVideoForm({...videoForm, duration: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <select 
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                        value={videoForm.aspectRatio}
                        onChange={(e) => setVideoForm({...videoForm, aspectRatio: e.target.value})}
                      >
                        <option value="16:9">16:9 Cinema</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="1:1">1:1 Square</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !videoForm.concept}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 disabled:opacity-30 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 group"
                  >
                    {loading ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-clapperboard group-hover:scale-110 transition-transform"></i>
                        Initiate Production
                      </>
                    )}
                  </button>
                </form>
              </section>

              {/* Saved History */}
              <div className="space-y-4 px-2">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                   <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                   Recent Logs
                </h3>
                <div className="grid gap-3">
                  {savedPrompts.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setResult(p)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-300 ${result?.id === p.id ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg' : 'bg-slate-900/20 border-white/5 hover:border-white/10'}`}
                    >
                      <p className="text-sm font-bold text-white line-clamp-1 opacity-90">{p.concept}</p>
                      <div className="flex gap-3 mt-2">
                        <span className="text-[9px] text-slate-500 font-mono uppercase font-bold tracking-widest">{p.tool}</span>
                        <span className="text-[9px] text-indigo-400 font-mono font-bold">#{p.style}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Production Preview */}
            <div className="lg:col-span-8 space-y-8">
              {result ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                  <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 md:p-10 overflow-hidden relative group shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div className="flex flex-col">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Production Asset</h2>
                        <h3 className="text-xl font-bold text-white tracking-tight">Master Generation Script</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={syncToImageStudio}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center gap-2 group/btn"
                        >
                          <i className="fa-solid fa-sparkles group-hover/btn:rotate-12 transition-transform"></i> Magic Sync
                        </button>
                        <button 
                          onClick={() => copyToClipboard(result.generatedPrompt)}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2"
                        >
                          <i className="fa-regular fa-copy"></i> Copy
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-black/60 p-8 md:p-10 rounded-3xl border border-white/5 font-mono text-sm md:text-base leading-relaxed text-indigo-100 group-hover:border-indigo-500/20 transition-all shadow-inner relative">
                       <div className="absolute top-4 right-4 text-indigo-500/20 text-4xl pointer-events-none">
                         <i className="fa-solid fa-quote-right"></i>
                       </div>
                      {result.generatedPrompt}
                    </div>

                    {/* Refined 4C Analysis Display */}
                    <div className="mt-12">
                      <div className="flex items-center gap-4 mb-8">
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] shrink-0">4C Structural Analysis</h3>
                         <div className="h-px w-full bg-gradient-to-r from-slate-800 to-transparent"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                          { label: 'Camera', val: result.cameraAnalysis, icon: 'fa-video', color: 'from-blue-500/15', border: 'border-blue-500/20', text: 'text-blue-400' },
                          { label: 'Character', val: result.characterAnalysis, icon: 'fa-user', color: 'from-purple-500/15', border: 'border-purple-500/20', text: 'text-purple-400' },
                          { label: 'Context', val: result.contextAnalysis, icon: 'fa-mountain-sun', color: 'from-emerald-500/15', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                          { label: 'Cinematic', val: result.cinematicAnalysis, icon: 'fa-wand-magic', color: 'from-amber-500/15', border: 'border-amber-500/20', text: 'text-amber-400' }
                        ].map((c, i) => (
                          <div key={i} className={`relative bg-gradient-to-br ${c.color} to-slate-900/50 p-6 rounded-2xl border ${c.border} transition-all hover:scale-[1.02] hover:shadow-xl`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-10 h-10 rounded-xl bg-slate-950/60 flex items-center justify-center ${c.text} shadow-lg`}>
                                <i className={`fa-solid ${c.icon} text-lg`}></i>
                              </div>
                              <span className={`text-xs font-black uppercase tracking-[0.2em] ${c.text}`}>{c.label}</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium opacity-90">
                              {c.val || 'Advanced structural analysis is specifically calibrated for Sora-class models.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Timeline breakdown={result.breakdown} totalDuration={result.duration} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[32px] flex items-center gap-6 shadow-xl">
                       <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner shrink-0">
                         <i className="fa-solid fa-bolt-lightning text-2xl"></i>
                       </div>
                       <div>
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Motion Profile</h4>
                         <p className="text-white text-base md:text-lg font-bold">{result.tool === ToolPreset.RUNWAY ? 'Dynamic Tracking' : 'Narrative Pacing'}</p>
                       </div>
                    </div>
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[32px] flex items-center gap-6 shadow-xl">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                         <i className="fa-solid fa-microchip text-2xl"></i>
                       </div>
                       <div>
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Neural Core</h4>
                         <p className="text-white text-base md:text-lg font-bold uppercase">{result.tool} Optimized</p>
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] md:min-h-[600px] border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center text-slate-700 bg-slate-900/20 p-12 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent"></div>
                  <div className="w-24 h-24 bg-slate-800/50 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl relative z-10">
                    <i className="fa-solid fa-layer-group text-4xl opacity-20"></i>
                  </div>
                  <p className="text-2xl font-bold opacity-30 relative z-10 tracking-tight">System Ready for Creative input</p>
                  <p className="text-sm opacity-20 mt-4 max-w-sm relative z-10 leading-relaxed font-medium">Input your core concept into the Director's Desk to begin the automated production pipeline.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-700">
            <section className="bg-slate-900/40 rounded-[48px] p-6 sm:p-10 md:p-16 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/5 blur-[100px] rounded-full"></div>
              <div className="text-center mb-16 relative z-10">
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">Visual Studio</h2>
                <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">Synthesize high-fidelity visual references and storyboard frames for your production workflow.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start relative z-10">
                {/* Generation Area */}
                <div className="space-y-8 order-1">
                  <div className="bg-slate-950/40 p-8 md:p-10 rounded-[32px] border border-white/5 shadow-2xl space-y-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-5 pl-1">Generate From Text</label>
                      <div className="flex flex-col gap-4">
                        <textarea 
                          className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm md:text-base shadow-inner resize-none"
                          rows={3}
                          placeholder="Describe the cinematic frame in detail..."
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                        />
                        <button 
                          onClick={handleGenerateImage}
                          disabled={loading || !imagePrompt}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 group"
                        >
                          <i className="fa-solid fa-magic-wand-sparkles group-hover:rotate-12 transition-transform"></i>
                          <span>Generate Frame</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.5em] font-black">
                        <span className="bg-[#111827] px-6 text-slate-600">Assets</span>
                      </div>
                    </div>

                    <div className="relative border-2 border-dashed border-white/10 rounded-[28px] p-10 flex flex-col items-center justify-center bg-slate-950/40 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all duration-500 cursor-pointer group">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl text-slate-600 group-hover:text-indigo-400 transition-colors"></i>
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-300">Upload Reference</span>
                    </div>
                  </div>

                  {studioImage && (
                    <div className="bg-slate-950/40 p-8 md:p-10 rounded-[32px] border border-white/5 shadow-2xl space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 pl-1">Neural Refinement</label>
                      <div className="flex flex-col gap-4">
                        <input 
                          type="text" 
                          className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm shadow-inner"
                          placeholder="Refine the image (e.g. 'Golden hour lighting')..."
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                        />
                        <button 
                          onClick={handleImageEdit}
                          disabled={loading || !editInstruction}
                          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-30 w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3"
                        >
                          <i className="fa-solid fa-dna"></i>
                          <span>Neural Edit</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                         {['Hyper-realistic', 'Vivid', 'Cyberpunk', 'Film noir', 'Anamorphic'].map(tag => (
                           <button key={tag} onClick={() => setEditInstruction(tag)} className="text-[9px] font-black px-4 py-2 bg-slate-900/80 hover:bg-indigo-500 hover:text-white border border-white/5 text-slate-500 rounded-full transition-all uppercase tracking-[0.2em] shadow-sm">{tag}</button>
                         ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas Display */}
                <div className="relative group order-2 w-full flex flex-col">
                  <div className="bg-black rounded-[40px] border border-white/5 overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.15)] aspect-video flex items-center justify-center relative w-full border-8 border-slate-900/50">
                    {studioImage ? (
                      <img src={studioImage} alt="Production Output" className="w-full h-full object-cover animate-in fade-in zoom-in-105 duration-1000" />
                    ) : (
                      <div className="text-center p-12">
                        <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                          <i className="fa-solid fa-film text-4xl opacity-10"></i>
                        </div>
                        <p className="text-lg font-black uppercase tracking-[0.3em] opacity-20">Canvas Initialized</p>
                      </div>
                    )}
                    
                    {loading && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center z-20 p-8 text-center">
                         <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-6 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 w-full animate-progress-custom"></div>
                         </div>
                         <p className="text-xs font-black uppercase tracking-[0.5em] text-indigo-400 animate-pulse">Processing Tensors...</p>
                      </div>
                    )}
                  </div>
                  
                  {studioImage && (
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch gap-4">
                      <a href={studioImage} download="cinematix-asset.png" className="bg-slate-100 hover:bg-white text-slate-950 px-8 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] transition-all text-center flex items-center justify-center gap-3 shadow-xl transform active:scale-[0.98]">
                        <i className="fa-solid fa-cloud-arrow-down text-lg"></i>
                        Download Asset
                      </a>
                      <button onClick={() => {setStudioImage(null); setImageToEdit(null);}} className="bg-slate-900/80 hover:bg-red-500/10 text-slate-500 hover:text-red-500 border border-white/5 transition-all px-8 py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98]">
                        <i className="fa-solid fa-trash-can"></i>
                        <span className="text-[10px] font-black uppercase tracking-widest">Wipe Canvas</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 text-center mt-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
        <div className="flex justify-center gap-10 mb-12">
          <i className="fa-brands fa-discord text-slate-700 hover:text-indigo-400 text-2xl cursor-pointer transition-all hover:scale-125"></i>
          <i className="fa-brands fa-x-twitter text-slate-700 hover:text-white text-2xl cursor-pointer transition-all hover:scale-125"></i>
          <i className="fa-brands fa-github text-slate-700 hover:text-white text-2xl cursor-pointer transition-all hover:scale-125"></i>
        </div>
        <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] mb-4 text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600">Architected for the age of generative cinema</p>
        <p className="text-slate-800 text-[10px] font-mono tracking-widest uppercase">Stable // Gen-V // Rev_311025</p>
      </footer>

      <style>{`
        @keyframes progress-custom {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-custom {
          animation: progress-custom 2s infinite ease-in-out;
        }
        @media (max-width: 400px) {
          .xs\:hidden { display: none; }
          .xs\:inline { display: inline; }
        }
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1em;
        }
      `}</style>
    </div>
  );
};

export default App;