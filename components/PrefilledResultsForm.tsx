'use client';
import React, { useState } from 'react';
import { Responses } from '../types/responses';

interface PrefilledResultsFormProps {
  sessionId: string | null;
  responses: Responses;
  onConfirm: (updatedResponses: Responses) => void;
}

const PrefilledResultsForm: React.FC<PrefilledResultsFormProps> = ({
  sessionId,
  responses,
  onConfirm,
}) => {
  const [formValues, setFormValues] = useState<Responses>(responses);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formValues);
  };

  return (
    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold">Your Responses</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.entries(formValues).map(([key, value]) => (
          <div key={key} className="form-group">
            <label htmlFor={key} className="block text-sm font-medium capitalize text-gray-700">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <input
              type="text"
              id={key}
              name={key}
              value={value}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        ))}
        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-green-500 px-4 py-2 font-bold text-white shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Confirm Responses
        </button>
      </form>
    </div>
  );
};

export default PrefilledResultsForm;
