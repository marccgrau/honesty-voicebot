import React from 'react';

const DescriptionCard: React.FC = () => {
  return (
    <div className="mb-4 rounded-lg bg-blue-100 p-6 shadow-md">
      <h2 className="text-lg font-bold mb-2">Welcome to the Experiment!</h2>
      <p className="text-gray-700">
        In this experiment, we will conduct a conversation to gather information for calculating a health insurance premium reduction.
        Your Prolific bonus payment will depend on the premium reduction amount you achieve.
        The higher the premium reduction, the higher the bonus payment.
        Please start by saying that you are ready for the conversation, make sure to press and hold the button while speaking to record the audio.
      </p>
      <p className="mt-2 text-gray-700">
        Follow the conversation and answer the questions as accurately as possible. Your responses will be recorded to fill out a form.
      </p>
    </div>
  );
};

export default DescriptionCard;