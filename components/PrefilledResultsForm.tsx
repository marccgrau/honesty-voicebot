'use client';
import React, { useEffect, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { PrefilledResultsFormProps } from '../types/components';
import { Responses } from '../types/responses';

const PrefilledResultsForm: React.FC<PrefilledResultsFormProps> = ({ sessionId }) => {
  const [responses, setResponses] = useState<Responses | null>(null);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const response = await fetch(`/api/getResponses?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setResponses(data);
        } else {
          console.error('Failed to fetch responses');
        }
      } catch (error) {
        console.error('Error fetching responses:', error);
      }
    };

    fetchResponses();
  }, [sessionId]);

  if (!responses) {
    return (
      <div className="flex h-full items-center justify-center">
        <ClipLoader size={50} color="#123abc" loading={!responses} />
      </div>
    );
  }

  return (
    <div className="prefilled-results-form">
      <h2>Your Responses</h2>
      <form>
        {Object.entries(responses).map(([key, value]) => (
          <div key={key} className="form-group">
            <label htmlFor={key}>{key}</label>
            <input
              type="text"
              id={key}
              name={key}
              value={value}
              readOnly
              className="form-control"
            />
          </div>
        ))}
      </form>
    </div>
  );
};

export default PrefilledResultsForm;
