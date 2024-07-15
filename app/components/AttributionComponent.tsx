import React from 'react';
import { config } from '../config';

interface AttributionComponentProps {
  usePhotos: boolean;
  useInternet: boolean;
  useTTS: boolean;
  useRateLimiting: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
}

export const AttributionComponent: React.FC<AttributionComponentProps> = ({
  usePhotos,
  useInternet,
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
    visionModelProvider,
    visionModel,
    useLangSmith,
  } = config;

  return (
    <div className="absolute bottom-0 right-10 text-center text-xs">
      speech recognition: {whisperModel}: {whisperModelProvider}
      {usePhotos && `, vision: ${visionModel}: ${visionModelProvider}`}
      {!usePhotos && `, inference: ${inferenceModel}: ${inferenceModelProvider}`}
      {useTTS && `, tts: ${ttsModelProvider}`}
      {useLangSmith && ', observability: langsmith'}
      {useInternet && ', internet search: serper'}
      {useRateLimiting && ', rate limiting: upstash redis'}
      {useChainMode && ', chain mode: enabled'}
      {useJsonMode && `, json mode: enabled, json model: ${jsonValidationModel}`}
    </div>
  );
};
