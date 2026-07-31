'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

// 브라우저 호환: Chrome/삼성인터넷 등은 webkitSpeechRecognition, 최신 브라우저는 SpeechRecognition
function getRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function VoiceInputButton({
  onResult,
}: {
  onResult: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  function toggle() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // 이미 시작된 경우 등 예외 무시
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex w-14 shrink-0 items-center justify-center self-stretch rounded-xl border-2 transition-colors ${
        listening
          ? 'border-rose-500 bg-rose-50 text-rose-600 animate-pulse'
          : 'border-ink-200 bg-white text-ink-500'
      }`}
      aria-label="음성으로 입력"
    >
      {listening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
}
