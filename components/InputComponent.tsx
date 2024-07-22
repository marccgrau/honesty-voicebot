'use client';
import { useState, useRef, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';

interface InputComponentProps {
  onSubmit: (formData: FormData) => void;
  useTTS: boolean;
  useInternet: boolean;
  usePhotos: boolean;
  useChainMode: boolean;
  useJsonMode: boolean;
  useAgentMode: boolean;
}

const InputComponent: React.FC<InputComponentProps> = ({
  onSubmit,
  useTTS,
  useInternet,
  usePhotos,
  useChainMode,
  useJsonMode,
  useAgentMode,
}) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }
  }, []);

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
        formData.append('useChainMode', String(useChainMode));
        formData.append('useJsonMode', String(useJsonMode));
        formData.append('useAgentMode', String(useAgentMode));

        const sessionId = localStorage.getItem('sessionId');
        formData.append('sessionId', sessionId!);

        onSubmit(formData);
        chunksRef.current = [];
      });
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <FaMicrophone className="mb-4 text-5xl text-gray-600" />
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className={`mb-4 rounded-full bg-green-500 px-4 py-2 font-bold text-white ${recording ? 'bg-red-500' : 'bg-green-500'}`}
      >
        {recording ? 'Recording...' : 'Press and hold to record'}
      </button>
      <p className="text-center text-xs text-gray-600">Hold the button to record audio</p>
      {recording && (
        <div className="mt-2">
          <div className="shadow-pulse h-2 w-2 rounded-full bg-red-500"></div>
        </div>
      )}
    </div>
  );
};

export default InputComponent;
