import { use } from 'react';
import { config } from '../lib/config';
import { SettingsProps } from '../types/components';

export const Settings: React.FC<SettingsProps> = ({
  useTTS,
  useChainMode,
  useJsonMode,
  useMessageMode,
  onTTSToggle,
  onChainModeToggle,
  onJsonModeToggle,
  onMessageModeToggle,
  setTTS,
  setChainMode,
  setJsonMode,
  setMessageMode,
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
      {config.enableChainModeUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="chainmode-toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="chainmode-toggle"
                className="sr-only"
                checked={useChainMode}
                onChange={onChainModeToggle}
              />
              <div
                className={`block h-6 w-10 rounded-full ${
                  useChainMode ? 'bg-green-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                  useChainMode ? 'translate-x-full transform' : ''
                }`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use Chain Mode</div>
          </label>
        </div>
      )}
      {config.enableJsonModeUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="jsonmode-toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="jsonmode-toggle"
                className="sr-only"
                checked={useJsonMode}
                onChange={onJsonModeToggle}
              />
              <div
                className={`block h-6 w-10 rounded-full ${
                  useJsonMode ? 'bg-green-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                  useJsonMode ? 'translate-x-full transform' : ''
                }`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use JSON Mode</div>
          </label>
        </div>
      )}
      {config.enableMessageModeUIToggle && (
        <div className="mb-2 flex items-center">
          <label htmlFor="messagemode-toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="messagemode-toggle"
                className="sr-only"
                checked={useMessageMode}
                onChange={onMessageModeToggle}
              />
              <div
                className={`block h-6 w-10 rounded-full ${
                  useMessageMode ? 'bg-green-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                  useMessageMode ? 'translate-x-full transform' : ''
                }`}
              ></div>
            </div>
            <div className="ml-3 text-sm">Use Message Mode</div>
          </label>
        </div>
      )}
    </div>
  );
};
