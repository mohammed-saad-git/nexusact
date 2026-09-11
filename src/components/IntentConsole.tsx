import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ImagePlus, X, Sparkles, AlertCircle, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IntentConsoleProps {
  input: string;
  onChangeInput: (val: string) => void;
  onAnalyze: (text: string, image?: { data: string; mimeType: string; name: string }) => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export const IntentConsole: React.FC<IntentConsoleProps> = ({
  input,
  onChangeInput,
  onAnalyze,
  isAnalyzing,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [attachedImage, setAttachedImage] = useState<{
    data: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check speech recognition capability
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser environment.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          onChangeInput(input ? `${input} ${transcript}` : transcript);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech Recognition error:', err);
        setSpeechError(`Voice input error: ${err.error || 'Check microphone permissions'}`);
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Speech initialization error:', e);
      setSpeechError('Could not access microphone.');
      setIsListening(false);
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setAttachedImage({
        data: base64Data,
        mimeType: file.type,
        name: file.name,
        previewUrl: base64String,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setAttachedImage({
          data: base64Data,
          mimeType: file.type,
          name: file.name,
          previewUrl: base64String,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isAnalyzing || disabled) return;

    onAnalyze(
      input.trim(),
      attachedImage
        ? {
            data: attachedImage.data,
            mimeType: attachedImage.mimeType,
            name: attachedImage.name,
          }
        : undefined
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      id="intent-console-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="relative w-full rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm backdrop-blur-md transition-all sm:p-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Console Top Bar */}
      <div className="mb-3.5 flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-600 animate-pulse"></div>
          <span className="text-xs font-bold tracking-wider text-stone-800 uppercase">
            INTENT CONSOLE
          </span>
          <span className="hidden text-xs text-stone-500 sm:inline font-medium">
            — Unstructured real-world telemetry ingest
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-500 font-medium">
          {input.length > 0 && <span>{input.length} characters</span>}
          <span className="hidden text-stone-300 sm:inline">|</span>
          <span className="hidden text-stone-500 sm:inline flex items-center gap-1 font-mono text-[11px]">
            Press ⌘+Enter to analyze <CornerDownLeft className="h-3 w-3 inline" />
          </span>
        </div>
      </div>

      {/* Voice feedback banner */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600"></span>
              </span>
              <span className="font-semibold">LISTENING FOR VOICE INTENT... Speak naturally.</span>
            </div>
            <button
              onClick={toggleVoiceInput}
              className="rounded-lg bg-rose-200/80 px-2.5 py-1 font-mono text-[11px] font-bold hover:bg-rose-300 text-rose-900 cursor-pointer transition-colors"
            >
              Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {speechError && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Main Command Input Area */}
      <div className="relative">
        <textarea
          id="intent-input-textarea"
          ref={textareaRef}
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isAnalyzing}
          rows={4}
          placeholder="Describe any messy real-world situation... (e.g. 'My elderly neighbor is trapped near the flooded underpass. The water is rising and their phone is almost dead.')"
          className="w-full resize-none rounded-xl border border-stone-200/90 bg-[#faf8f5] p-4 font-sans text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 sm:text-base transition-all shadow-inner"
        />

        {input.length > 0 && !isAnalyzing && (
          <button
            onClick={() => onChangeInput('')}
            className="absolute top-3.5 right-3.5 rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 cursor-pointer transition-colors"
            title="Clear text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Attached Image Preview */}
      <AnimatePresence>
        {attachedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-2.5 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <img
                src={attachedImage.previewUrl}
                alt="Uploaded context"
                className="h-11 w-11 rounded-lg border border-stone-300 object-cover shadow-xs"
              />
              <div className="text-xs">
                <p className="font-semibold text-stone-900">{attachedImage.name}</p>
                <p className="text-[11px] text-amber-800 font-medium">Multimodal context attached</p>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-800 cursor-pointer"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console Bottom Action Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3.5">
        {/* Attachment & Voice Controls */}
        <div className="flex items-center gap-2">
          {/* Real Voice Input Button */}
          <motion.button
            id="btn-voice-input"
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleVoiceInput}
            disabled={disabled || isAnalyzing}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              isListening
                ? 'border-rose-300 bg-rose-50 text-rose-700 ring-2 ring-rose-400/30'
                : 'border-stone-200 bg-white text-stone-700 shadow-xs hover:border-stone-300 hover:bg-stone-50'
            }`}
            title={speechSupported ? 'Record voice input (Web Speech API)' : 'Speech recognition not supported'}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-rose-600 animate-pulse" />
            ) : (
              <Mic className="h-4 w-4 text-stone-600" />
            )}
            <span>{isListening ? 'Stop Recording' : 'Voice Input'}</span>
          </motion.button>

          {/* Real Image Attachment Button */}
          <motion.button
            id="btn-image-attach"
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isAnalyzing}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition-colors hover:border-stone-300 hover:bg-stone-50 cursor-pointer"
            title="Attach image or photo of hazard/situation"
          >
            <ImagePlus className="h-4 w-4 text-stone-600" />
            <span>{attachedImage ? 'Replace Image' : 'Attach Photo'}</span>
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
        </div>

        {/* Analyze Primary Action Button */}
        <motion.button
          id="btn-analyze-intent"
          type="button"
          whileHover={input.trim() && !isAnalyzing && !disabled ? { scale: 1.02 } : {}}
          whileTap={input.trim() && !isAnalyzing && !disabled ? { scale: 0.97 } : {}}
          onClick={() => handleSubmit()}
          disabled={!input.trim() || isAnalyzing || disabled}
          className={`flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
            input.trim() && !isAnalyzing && !disabled
              ? 'border border-amber-900 bg-amber-800 text-white shadow-md shadow-amber-950/10 hover:bg-amber-900 active:scale-[0.98]'
              : 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400'
          }`}
        >
          {isAnalyzing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-amber-300"></span>
              <span className="font-mono uppercase tracking-wider">SYNTHESIZING INTENT...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span className="uppercase tracking-wider">ANALYZE INTENT</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
