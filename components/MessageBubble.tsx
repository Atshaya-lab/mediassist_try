import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Basic formatting for bold text from markdown (*)
  const formatText = (text: string) => {
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="text-neon-blue font-bold">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 rounded-2xl text-sm sm:text-base leading-relaxed relative border backdrop-blur-sm transition-all duration-300 ${
          isUser
            ? 'bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border-neon-purple/30 text-white rounded-br-sm shadow-[0_0_15px_rgba(168,85,247,0.1)]'
            : 'bg-white/5 border-white/10 text-gray-200 rounded-bl-sm shadow-lg'
        }`}
      >
        {/* Render text with basic markdown support */}
        <div className="whitespace-pre-wrap break-words">
            {formatText(message.text)}
        </div>
        
        <div className={`text-[10px] mt-2 text-right uppercase tracking-widest ${isUser ? 'text-neon-purple/70' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};