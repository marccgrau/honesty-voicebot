import { config } from '../config';

interface SettingsProps {
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  onTTSToggle: () => void;
  onInternetToggle: () => void;
  onPhotosToggle: () => void;
  setTTS: (useTTS: boolean) => void;
  setInternet: (useInternet: boolean) => void;
  setPhotos: (usePhotos: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  useTTS,
  useInternet,
  usePhotos,
  onTTSToggle,
  onInternetToggle,
  onPhotosToggle,
  setTTS,
  setInternet,
  setPhotos,
}) => {
  return (
    <div className="animate-slide-up absolute bottom-24 left-7 rounded-md bg-white p-4 shadow-md">
      {config.enableTextToSpeechUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="tts-toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="tts-toggle"
                className="sr-only"
                checked={useTTS}
                onChange={onTTSToggle}
              />
              <div
                className={`block h-6 w-10 rounded-full ${useTTS ? 'bg-green-500' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                  useTTS ? 'translate-x-full transform' : ''
                }`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Text-to-Speech</div>
          </label>
        </div>
      )}
      {config.enableInternetResultsUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="internet-toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="internet-toggle"
                className="sr-only"
                checked={useInternet}
                onChange={onInternetToggle}
              />
              <div
                className={`block h-6 w-10 rounded-full ${
                  useInternet ? 'bg-green-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                  useInternet ? 'translate-x-full transform' : ''
                }`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use Internet Results</div>
          </label>
        </div>
      )}
      {config.enableUsePhotUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="photos-toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="photos-toggle"
                className="sr-only"
                checked={usePhotos}
                onChange={onPhotosToggle}
              />
              <div
                className={`block h-6 w-10 rounded-full ${
                  usePhotos ? 'bg-green-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                  usePhotos ? 'translate-x-full transform' : ''
                }`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use Photos</div>
          </label>
        </div>
      )}
    </div>
  );
};
