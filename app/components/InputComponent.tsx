"use client";
import { useState, useRef } from 'react';
import { FaMicrophone } from 'react-icons/fa';

interface InputComponentProps {
  onSubmit: (formData: FormData) => void;
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useLudicrousMode: boolean;
}

const InputComponent: React.FC<InputComponentProps> = ({
  onSubmit,
  useTTS,
  useInternet,
  usePhotos,
  useLudicrousMode,
}) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);


  const handleMouseDown = () => {
    startRecording();
    setRecording(true);
  };

  const handleMouseUp = () => {
    stopRecording();
    setRecording(false);
  };

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const options = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      mediaRecorderRef.current.addEventListener('dataavailable', (event: BlobEvent) => {
        chunksRef.current.push(event.data);
      });
      mediaRecorderRef.current.start();
    });
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.addEventListener('stop', async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('useTTS', String(useTTS));
        formData.append('useInternet', String(useInternet));
        formData.append('usePhotos', String(usePhotos));
        formData.append('useLudicrousMode', String(useLudicrousMode));
        onSubmit(formData);
        chunksRef.current = [];
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <FaMicrophone className="text-5xl text-gray-600 mb-4" />
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className={`bg-green-500 text-white font-bold py-2 px-4 rounded-full mb-4 ${recording ? 'bg-red-500' : 'bg-green-500'}`}
      >
        {recording ? 'Recording...' : 'Press and hold to record'}
      </button>
      <p className="text-xs text-gray-600 text-center">
        Hold the button to record audio
      </p>
      {recording && (
        <div className="mt-2">
          <div className="w-2 h-2 bg-red-500 rounded-full shadow-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default InputComponent;