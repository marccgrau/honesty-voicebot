// app/thank-you/page.tsx
'use client';
import React from 'react';

const ThankYouPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="max-w-lg rounded-lg bg-white p-6 text-center shadow-md">
        <h2 className="mb-4 text-2xl font-bold">Thank You!</h2>
        <p className="mb-4 text-gray-700">Your responses have been successfully submitted.</p>
        <p className="text-gray-500">Please go back to Prolific to finalize the experiment.</p>
      </div>
    </div>
  );
};

export default ThankYouPage;
