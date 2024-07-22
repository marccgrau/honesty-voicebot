export interface InputComponentProps {
  onSubmit: (formData: FormData) => void;
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
  useAgentMode: boolean;
}

export interface PrefilledResultsFormProps {
  sessionId: string;
}

export interface SettingsProps {
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
  useAgentMode: boolean;
  onTTSToggle: () => void;
  onInternetToggle: () => void;
  onPhotosToggle: () => void;
  onChainModeToggle: () => void;
  onJsonModeToggle: () => void;
  onAgentModeToggle: () => void;
  setTTS: (useTTS: boolean) => void;
  setInternet: (useInternet: boolean) => void;
  setPhotos: (usePhotos: boolean) => void;
  setChainMode: (useChainMode: boolean) => void;
  setJsonMode: (useJsonMode: boolean) => void;
  setAgentMode: (useAgentMode: boolean) => void;
}

export interface UIComponent {
  component: string;
  data: any;
}

export interface Message {
  rateLimitReached: any;
  transcription?: string;
  audio?: string;
  result?: string;
  weather?: string;
  spotify?: string;
  time?: string;
}
