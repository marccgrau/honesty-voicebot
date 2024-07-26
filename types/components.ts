import { Responses } from './responses';
import { use } from 'react';

export interface InputComponentProps {
  onSubmit: (formData: FormData) => void;
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
  useAgentMode: boolean;
  prolificPid: string;
}

export interface PrefilledResultsFormProps {
  responses: Responses;
}

export interface SettingsProps {
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
  useAgentMode: boolean;
  useMessageMode: boolean;
  onTTSToggle: () => void;
  onInternetToggle: () => void;
  onPhotosToggle: () => void;
  onChainModeToggle: () => void;
  onJsonModeToggle: () => void;
  onAgentModeToggle: () => void;
  onMessageModeToggle: () => void;
  setTTS: (useTTS: boolean) => void;
  setInternet: (useInternet: boolean) => void;
  setPhotos: (usePhotos: boolean) => void;
  setChainMode: (useChainMode: boolean) => void;
  setJsonMode: (useJsonMode: boolean) => void;
  setAgentMode: (useAgentMode: boolean) => void;
  setMessageMode: (useMessageMode: boolean) => void;
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
  allQuestionsAnswered?: boolean;
}

export interface PrefilledResultsFormProps {
  sessionId: string | null;
  responses: Responses;
  onConfirm: (updatedResponses: Responses) => void;
}
