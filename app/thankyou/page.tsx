'use client';

import React, { useEffect, useState } from 'react';
import { getQuestionnaireCode } from './action';
import ClipLoader from 'react-spinners/ClipLoader';

const ThankYouPage: React.FC = () => {
  const [questionnaireCode, setQuestionnaireCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const code = await getQuestionnaireCode();
      setQuestionnaireCode(code);
    }
    fetchData();
  }, []);

  if (questionnaireCode === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-lg rounded-lg bg-white p-6 text-center shadow-md">
          <ClipLoader size={50} color="#123abc" loading={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="max-w-lg rounded-lg bg-white p-6 text-center shadow-md">
        <h2 className="mb-4 text-2xl font-bold">Thank You!</h2>
        <p className="mb-4 text-gray-700">Your responses have been successfully submitted.</p>
        <p className="mb-4 text-gray-700">
          Please go back to Prolific to finalize the questionnaire.
        </p>
        <p className="mb-4 text-gray-700">
          Make sure to copy the following code to proceed with the questionnaire:
        </p>
        <p className="text-black-500 mb-4 text-xl font-bold">{questionnaireCode}</p>
        <p className="mb-4 text-gray-700">
          If you successfully entered the code into the questionnaire, you can close this tab.
        </p>
      </div>
    </div>
  );
};

export default ThankYouPage;
