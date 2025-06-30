import React from 'react';
import { useParams } from 'react-router-dom';

export const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Agent {id}</h1>
      <p className="text-gray-600 mt-2">Detailed view of agent</p>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">Agent detail interface coming soon...</p>
      </div>
    </div>
  );
};