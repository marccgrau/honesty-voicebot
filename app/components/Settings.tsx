import { config } from '../config';

interface SettingsProps {
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useLudicrousMode: boolean;
  onTTSToggle: () => void;
  onInternetToggle: () => void;
  onPhotosToggle: () => void;
  onLudicrousModeToggle: () => void;
  setTTS: (useTTS: boolean) => void;
  setInternet: (useInternet: boolean) => void;
  setPhotos: (usePhotos: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  useTTS,
  useInternet,
  usePhotos,
  useLudicrousMode,
  onTTSToggle,
  onInternetToggle,
  onPhotosToggle,
  onLudicrousModeToggle,
  setTTS,
  setInternet,
  setPhotos,
}) => {
  const handleLudicrousModeToggle = () => {
    onLudicrousModeToggle();
    if (!useLudicrousMode) {
      setTTS(false);
      setInternet(false);
      setPhotos(false);
    }
  };

  return (
    <div className="animate-slide-up absolute bottom-24 left-7 rounded-md bg-white p-4 shadow-md">
      {config.enabledLudicrousMode && (
        <>
          <div className="mb-1 flex items-center">
            <label htmlFor="ludicrous-mode-toggle" className="flex cursor-pointer items-center">
              <div className="relative">
                <input
                  type="checkbox"
                  id="ludicrous-mode-toggle"
                  className="sr-only"
                  checked={useLudicrousMode}
                  onChange={handleLudicrousModeToggle}
                />
                <div
                  className={`block h-6 w-10 rounded-full ${useLudicrousMode ? 'bg-green-500' : 'bg-gray-300'}`}
                ></div>
                <div
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${useLudicrousMode ? 'translate-x-full transform' : ''}`}
                ></div>
              </div>
              <div className="ml-3 text-sm">Ludicrous Mode</div>
            </label>
          </div>
          <div className="mb-2 text-xs text-gray-500">(Groq Llama3 + Groq Whisper only)</div>
        </>
      )}
      {config.enableTextToSpeechUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="tts-toggle" className="flex cursor-pointer items-center">
            <div className={`relative ${useLudicrousMode ? 'cursor-not-allowed opacity-50' : ''}`}>
              <input
                type="checkbox"
                id="tts-toggle"
                className="sr-only"
                checked={useTTS && !useLudicrousMode}
                onChange={onTTSToggle}
                disabled={useLudicrousMode}
              />
              <div
                className={`block h-6 w-10 rounded-full ${useTTS && !useLudicrousMode ? 'bg-green-500' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${useTTS && !useLudicrousMode ? 'translate-x-full transform' : ''}`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Text-to-Speech</div>
          </label>
        </div>
      )}
      {config.enableInternetResultsUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="internet-toggle" className="flex cursor-pointer items-center">
            <div className={`relative ${useLudicrousMode ? 'cursor-not-allowed opacity-50' : ''}`}>
              <input
                type="checkbox"
                id="internet-toggle"
                className="sr-only"
                checked={useInternet && !useLudicrousMode}
                onChange={onInternetToggle}
                disabled={useLudicrousMode}
              />
              <div
                className={`block h-6 w-10 rounded-full ${useInternet && !useLudicrousMode ? 'bg-green-500' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${useInternet && !useLudicrousMode ? 'translate-x-full transform' : ''}`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use Internet Results</div>
          </label>
        </div>
      )}
      {config.enableUsePhotUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="photos-toggle" className="flex cursor-pointer items-center">
            <div className={`relative ${useLudicrousMode ? 'cursor-not-allowed opacity-50' : ''}`}>
              <input
                type="checkbox"
                id="photos-toggle"
                className="sr-only"
                checked={usePhotos && !useLudicrousMode}
                onChange={onPhotosToggle}
                disabled={useLudicrousMode}
              />
              <div
                className={`block h-6 w-10 rounded-full ${usePhotos && !useLudicrousMode ? 'bg-green-500' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${usePhotos && !useLudicrousMode ? 'translate-x-full transform' : ''}`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use Photos</div>
          </label>
        </div>
      )}
    </div>
  );
};
