import React from 'react';
import { config } from '../lib/config';

interface AttributionComponentProps {
  useTTS: boolean;
  useRateLimiting: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
}

export const AttributionComponent: React.FC<AttributionComponentProps> = ({
  useTTS,
  useRateLimiting,
  useChainMode,
  useJsonMode,
}) => {
  const {
    whisperModelProvider,
    whisperModel,
    inferenceModelProvider,
    inferenceModel,
    jsonValidationModel,
    ttsModelProvider,
  } = config;

  return (
    <div className="absolute bottom-0 right-10 text-center text-xs">
      speech recognition: {whisperModel}: {whisperModelProvider}
      {`, inference: ${inferenceModel}: ${inferenceModelProvider}`}
      {useTTS && `, tts: ${ttsModelProvider}`}
      {useRateLimiting && ', rate limiting: upstash redis'}
      {useChainMode && ', chain mode: enabled'}
      {useJsonMode && `, json mode: enabled, json model: ${jsonValidationModel}`}
    </div>
  );
};
