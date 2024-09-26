import { Responses } from './responses';
import { use } from 'react';

export interface InputComponentProps {
  onSubmit: (formData: FormData) => void;
  useTTS: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
}

export interface PrefilledResultsFormProps {
  responses: Responses;
}

export interface SettingsProps {
  useTTS: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
  useMessageMode: boolean;
  onTTSToggle: () => void;
  onChainModeToggle: () => void;
  onJsonModeToggle: () => void;
  onMessageModeToggle: () => void;
  setTTS: (useTTS: boolean) => void;
  setChainMode: (useChainMode: boolean) => void;
  setJsonMode: (useJsonMode: boolean) => void;
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
  time?: string;
  allQuestionsAnswered?: boolean;
}

export interface PrefilledResultsFormProps {
  sessionId: string | null;
  responses: Responses;
  onConfirm: (updatedResponses: Responses) => void;
}
