'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ClipLoader } from 'react-spinners';
import { Responses } from '../../types/responses';
import PrefilledResultsForm from '../../components/PrefilledResultsForm';

const ValidationPage = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [responses, setResponses] = useState<Responses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchResponses = async () => {
      if (!sessionId || typeof sessionId !== 'string') {
        setError('Invalid session ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/getResponses?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setResponses(data);
        } else {
          setError('Failed to fetch responses');
        }
      } catch (error) {
        setError('Error fetching responses');
        console.error('Error fetching responses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, [sessionId]);

  const handleConfirm = async (updatedResponses: Responses) => {
    setLoading(true);
    try {
      const response = await fetch('/api/postFinalResponses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          responses: updatedResponses,
        }),
      });

      if (response.ok) {
        console.log('Responses successfully saved');
        router.push('/thankyou'); // Navigate to the thank you page
      } else {
        console.error('Failed to save final responses');
      }
    } catch (error) {
      console.error('Error saving final responses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <ClipLoader size={50} color="#123abc" />
      </div>
    );
  }

  if (error) {
    return <div className="flex h-screen w-screen items-center justify-center">{error}</div>;
  }

  if (!responses) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        No responses available
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <PrefilledResultsForm sessionId={sessionId} responses={responses} onConfirm={handleConfirm} />
    </div>
  );
};

export default ValidationPage;
