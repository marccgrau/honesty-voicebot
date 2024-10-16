'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActions, readStreamableValue } from 'ai/rsc';
import { ClipLoader } from 'react-spinners';
import { type AI } from './action';
import { Settings } from '../components/Settings';
import { AttributionComponent } from '../components/AttributionComponent';
import { MobileNotSupported } from '../components/Mobile';
import InputComponent from '../components/InputComponent';
import DescriptionCard from '../components/DescriptionCard';
import { WeatherData } from '../components/tools/Weather';
import { SpotifyTrack } from '../components/tools/Spotify';
import { ClockComponent } from '../components/tools/Clock';
import { config } from '../lib/config';
import Image from 'next/image';
import { UIComponent, Message } from '../types/components';

const MainContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { action } = useActions<typeof AI>();
  const [useChainMode, setUseChainMode] = useState(true);
  const [useJsonMode, setJsonMode] = useState(true);
  const [useTTS, setUseTTS] = useState(true);
  const [currentTranscription, setCurrentTranscription] = useState<{
    transcription: string;
    responseTime: number;
  } | null>(null);
  const [totalResponseTime, setTotalResponseTime] = useState<number | null>(null);
  const [currentUIComponent, setCurrentUIComponent] = useState<UIComponent | null>(null);
  const [message, setMessage] = useState<{ message: string; responseTime: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationCompleted, setConversationCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [useMessageMode, setMessageMode] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [prolificPid, setProlificPid] = useState<string | null>(null);
  const [ttsVoice, setTtsVoice] = useState(config.ttsVoice);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }
    setSessionId(sessionId);

    // Extract PROLIFIC_PID from the URL
    const prolificPid = searchParams.get('PROLIFIC_PID');
    if (prolificPid) {
      setProlificPid(prolificPid);
      localStorage.setItem('prolificPid', prolificPid);
    }
    if (!prolificPid) {
      setProlificPid('lab');
      localStorage.setItem('prolificPid', 'lab');
    }
    // Extract Qualtrics userId from the URL
    const userId = searchParams.get('USER_ID');
    if (userId) {
      setUserId(userId);
      localStorage.setItem('userId', userId);
    }

    let ttsVoice = localStorage.getItem('ttsVoice');
    if (!ttsVoice) {
      ttsVoice = config.ttsVoice;
      localStorage.setItem('ttsVoice', ttsVoice);
    }
    setTtsVoice(ttsVoice);
  }, [searchParams]);

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  const handleTTSToggle = () => {
    setUseTTS(!useTTS);
  };

  const handleChainModeToggle = () => {
    setUseChainMode(!useChainMode);
  };

  const handleJsonModeToggle = () => {
    setJsonMode(!useJsonMode);
  };

  const handleMessageModeToggle = () => {
    setMessageMode(!useMessageMode);
  };

  const handleSubmit = async (formData: FormData) => {
    const startTime = Date.now();
    const streamableValue = await action(formData);
    let transcriptionResponseTime;
    let transcriptionCompletionTime;
    let messageResponseTime;
    let audioResponseTime;
    setCurrentUIComponent(null);
    setMessage(null);

    for await (const message of readStreamableValue<Message>(streamableValue)) {
      if (message && message.rateLimitReached && typeof message.rateLimitReached === 'string') {
        setMessage({ message: message.rateLimitReached, responseTime: 0 });
      }
      if (message && message.time && typeof message.time === 'string') {
        setCurrentUIComponent({ component: 'time', data: message.time });
      }
      if (message && message.transcription && typeof message.transcription === 'string') {
        transcriptionResponseTime = (Date.now() - startTime) / 1000;
        transcriptionCompletionTime = Date.now();
        setCurrentTranscription({
          transcription: message.transcription,
          responseTime: transcriptionResponseTime,
        });
      }
      if (message && message.result && typeof message.result === 'string') {
        messageResponseTime = (Date.now() - (transcriptionCompletionTime || startTime)) / 1000;
        setMessage({ message: message.result, responseTime: messageResponseTime });
      }
      if (message && message.audio && typeof message.audio === 'string') {
        audioResponseTime = (Date.now() - (transcriptionCompletionTime || startTime)) / 1000;
        const audio = new Audio(message.audio);
        setIsAudioPlaying(true);
        audio.play();
        audio.onended = () => setIsAudioPlaying(false);
      }
      if (message && message.allQuestionsAnswered) {
        console.log('All questions answered');
        setConversationCompleted(true);
      }
    }
    let totalResponseTime = 0;
    if (transcriptionResponseTime) {
      totalResponseTime += transcriptionResponseTime;
    }
    if (messageResponseTime) {
      totalResponseTime += messageResponseTime;
    }
    if (audioResponseTime) {
      totalResponseTime += audioResponseTime;
    }
    setTotalResponseTime(totalResponseTime);

    if (conversationCompleted && sessionId) {
      // Redirect to the validation page with the sessionId as query parameter
      console.log('Redirecting to validation page');
      //router.push(`/validation?sessionId=${sessionId}?prolificPid=${prolificPid}?ttsVoice=${ttsVoice}`);
      router.push('/thankyou');
    }
  };
  useEffect(() => {
    if (conversationCompleted && sessionId) {
      // Redirect to the validation page with the sessionId as query parameter
      //router.push(`/validation?sessionId=${sessionId}?prolificPid=${prolificPid}?ttsVoice=${ttsVoice}`);
      router.push('/thankyou');
    }
  }, [conversationCompleted, sessionId, router]);
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768; // Adjust the breakpoint as needed
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile); // Check on window resize
    return () => {
      window.removeEventListener('resize', checkMobile); // Cleanup the event listener
    };
  }, []);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {isMobile ? (
        <MobileNotSupported />
      ) : (
        <div
          className={`flex flex-1 ${useMessageMode ? 'flex-row' : 'flex-col items-center justify-center'}`}
        >
          <div
            className={`flex ${useMessageMode ? 'w-1/2' : 'w-full'} flex-col items-center justify-center p-4`}
          >
            <div className="flex flex-col items-center justify-center space-y-12">
              <DescriptionCard />
              <InputComponent
                onSubmit={handleSubmit}
                useTTS={useTTS}
                useChainMode={useChainMode}
                useJsonMode={useJsonMode}
              />
              {useTTS && isAudioPlaying && (
                <div className="flex space-x-2">
                  <div className="h-6 w-1 animate-pulse bg-blue-500"></div>
                  <div
                    className="h-6 w-1 animate-pulse bg-blue-500"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="h-6 w-1 animate-pulse bg-blue-500"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="h-6 w-1 animate-pulse bg-blue-500"
                    style={{ animationDelay: '0.3s' }}
                  ></div>
                  <div
                    className="h-6 w-1 animate-pulse bg-blue-500"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              )}
            </div>
          </div>
          {useMessageMode && (
            <div className="mt-4 flex w-1/2 flex-col items-center px-4">
              <div className="w-full max-w-[700px]">
                {message && message.message && (
                  <div className="mb-4 rounded bg-gray-100 p-4 shadow-md">
                    <p>{message.message}</p>
                    {config.enableResponseTimes && (
                      <p className="text-xs text-gray-500">
                        Response time: +{message.responseTime.toFixed(2)} seconds
                      </p>
                    )}
                  </div>
                )}
                {currentTranscription && (
                  <div className="mb-4 rounded bg-gray-100 p-4 shadow-md">
                    <p>{currentTranscription.transcription}</p>
                    {config.enableResponseTimes && (
                      <p className="text-xs text-gray-500">
                        Transcription response time: +{currentTranscription.responseTime.toFixed(2)}{' '}
                        seconds
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {config.enableSettingsUIToggle && (
        <div
          className="absolute bottom-7 left-7 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white shadow-md"
          onClick={handleSettingsClick}
        >
          <Image
            src={
              showSettings
                ? 'https://upload.wikimedia.org/wikipedia/commons/a/a0/OOjs_UI_icon_close.svg'
                : 'https://upload.wikimedia.org/wikipedia/commons/2/20/Factotum_gear_icon.svg'
            }
            alt={showSettings ? 'Close Settings' : 'Settings'}
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </div>
      )}
      {showSettings && (
        <Settings
          useTTS={useTTS}
          useChainMode={useChainMode}
          useJsonMode={useJsonMode}
          useMessageMode={useMessageMode}
          onTTSToggle={handleTTSToggle}
          onChainModeToggle={handleChainModeToggle}
          onJsonModeToggle={handleJsonModeToggle}
          onMessageModeToggle={handleMessageModeToggle}
          setTTS={setUseTTS}
          setChainMode={setUseChainMode}
          setJsonMode={setJsonMode}
          setMessageMode={setMessageMode}
        />
      )}
      {config.useAttributionComponent && (
        <AttributionComponent
          useTTS={useTTS}
          useRateLimiting={config.useRateLimiting}
          useChainMode={useChainMode}
          useJsonMode={useJsonMode}
        />
      )}
    </div>
  );
};

const Main = () => (
  <Suspense
    fallback={
      <div className="flex h-screen w-screen items-center justify-center">
        <ClipLoader size={50} color="#123abc" />
      </div>
    }
  >
    <MainContent />
  </Suspense>
);

export default Main;
