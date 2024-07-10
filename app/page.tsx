"use client";
import { useState, useEffect } from 'react';
import { useActions, readStreamableValue } from 'ai/rsc';
import { type AI } from './action';
import { Settings } from './components/Settings';
import { AttributionComponent } from './components/AttributionComponent';
import { MobileNotSupported } from './components/Mobile';
import InputComponent from './components/InputComponent';
import { WeatherData } from './components/tools/Weather';
import { SpotifyTrack } from './components/tools/Spotify';
import { ClockComponent } from './components/tools/Clock';
import { config } from './config';

interface Message {
  rateLimitReached: any;
  transcription?: string;
  audio?: string;
  result?: string;
  weather?: string;
  spotify?: string;
  time?: string;
}

interface UIComponent {
  component: string;
  data: any;
}

const Main = () => {
  const { action } = useActions<typeof AI>();
  const [useLudicrousMode, setUseLudicrousMode] = useState(false);
  const [useTTS, setUseTTS] = useState(false);
  const [useInternet, setUseInternet] = useState(false);
  const [usePhotos, setUsePhotos] = useState(false);
  const [useSpotify, setUseSpotify] = useState('');
  const [currentTranscription, setCurrentTranscription] = useState<{ transcription: string, responseTime: number } | null>(null);
  const [totalResponseTime, setTotalResponseTime] = useState<number | null>(null);
  const [currentUIComponent, setCurrentUIComponent] = useState<UIComponent | null>(null);
  const [message, setMessage] = useState<{ message: string; responseTime: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  const handleTTSToggle = () => {
    setUseTTS(!useTTS);
  };

  const handleInternetToggle = () => {
    setUseInternet(!useInternet);
  };

  const handleLudicrousModeToggle = () => {
    setUseLudicrousMode(!useLudicrousMode);
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
        setCurrentTranscription({ transcription: message.transcription, responseTime: transcriptionResponseTime });
      }
      if (message && message.weather && typeof message.weather === 'string') {
        setCurrentUIComponent({ component: 'weather', data: JSON.parse(message.weather) });
      }
      if (message && message.result && typeof message.result === 'string') {
        messageResponseTime = (Date.now() - (transcriptionCompletionTime || startTime)) / 1000;
        setMessage({ message: message.result, responseTime: messageResponseTime });
      }
      if (message && message.audio && typeof message.audio === 'string') {
        audioResponseTime = (Date.now() - (transcriptionCompletionTime || startTime)) / 1000;
        const audio = new Audio(message.audio);
        audio.play();
      }
      if (message && message.spotify && typeof message.spotify === 'string') {
        setUseSpotify(message.spotify);
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
  };
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
    <div className="flex flex-col min-h-screen bg-white">
      {isMobile ? (
        <MobileNotSupported />
      ) : (
        <div className="flex flex-1">
          <div className="w-1/2 flex justify-center items-center">
            <InputComponent
              onSubmit={handleSubmit}
              useTTS={useTTS}
              useInternet={useInternet}
              usePhotos={usePhotos}
              useLudicrousMode={useLudicrousMode}
            />
          </div>
          <div className="w-1/2 flex flex-col items-center px-4 mt-4">
            <div className="max-w-[700px] w-full">
              {message && message.message && (
                <div className="bg-gray-100 p-4 rounded shadow-md mb-4">
                  <p>{message.message}</p>
                  {config.enableResponseTimes && (
                    <p className="text-xs text-gray-500">Response time: +{message.responseTime.toFixed(2)} seconds</p>
                  )}
                </div>
              )}
              {currentTranscription && (
                <div className="bg-gray-100 p-4 rounded shadow-md mb-4">
                  <p>{currentTranscription.transcription}</p>
                  {config.enableResponseTimes && (
                    <p className="text-xs text-gray-500">Transcription response time: +{currentTranscription.responseTime.toFixed(2)} seconds</p>
                  )}
                </div>
              )}
              {currentUIComponent && currentUIComponent.component === 'weather' && (
                <WeatherData data={currentUIComponent.data} />
              )}
              {currentUIComponent && currentUIComponent.component === 'time' && (
                <ClockComponent />
              )}
              {useSpotify && (
                <SpotifyTrack trackId={useSpotify} width={300} height={80} />
              )}
            </div>
          </div>
        </div>
      )}
      {config.enableSettingsUIToggle && (
        <div
          className="absolute bottom-7 left-7 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer"
          onClick={handleSettingsClick}
        >
          <img
            src={showSettings ? "https://upload.wikimedia.org/wikipedia/commons/a/a0/OOjs_UI_icon_close.svg" : "https://upload.wikimedia.org/wikipedia/commons/2/20/Factotum_gear_icon.svg"}
            alt={showSettings ? "Close Settings" : "Settings"}
            className="w-6 h-6"
          />
        </div>
      )}
      {showSettings && (
        <Settings
          useLudicrousMode={useLudicrousMode}
          useTTS={useTTS}
          useInternet={useInternet}
          usePhotos={usePhotos}
          onLudicrousModeToggle={handleLudicrousModeToggle}
          onTTSToggle={handleTTSToggle}
          onInternetToggle={handleInternetToggle}
          onPhotosToggle={() => setUsePhotos(!usePhotos)}
          setTTS={setUseTTS}
          setInternet={setUseInternet}
          setPhotos={setUsePhotos}
        />
      )}
      {config.useAttributionComponent && (
        <AttributionComponent usePhotos={usePhotos} useInternet={useInternet} useTTS={useTTS} useRateLimiting={config.useRateLimiting} />
      )}
    </div>
  );
};
export default Main;