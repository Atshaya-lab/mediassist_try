import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from './services/geminiService';
import { Message, BookingData } from './types';
import { MessageBubble } from './components/MessageBubble';
import { AdminPanel } from './components/AdminPanel';

// Define SpeechRecognition interface for TypeScript
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings State: Persisted in localStorage
  const [adminPhone, setAdminPhone] = useState(() => localStorage.getItem('mediAssist_adminPhone') || '');
  const [autoSend, setAutoSend] = useState(() => localStorage.getItem('mediAssist_autoSend') === 'true');

  // Initialize booking history from localStorage if available
  const [bookingHistory, setBookingHistory] = useState<BookingData[]>(() => {
    const saved = localStorage.getItem('mediAssist_bookingHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Initialize Chat
  useEffect(() => {
    geminiService.startChat();
  }, []);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('mediAssist_bookingHistory', JSON.stringify(bookingHistory));
  }, [bookingHistory]);

  useEffect(() => {
    localStorage.setItem('mediAssist_adminPhone', adminPhone);
  }, [adminPhone]);

  useEffect(() => {
    localStorage.setItem('mediAssist_autoSend', String(autoSend));
  }, [autoSend]);


  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the appointment history?')) {
      setBookingHistory([]);
    }
  };

  // Voice Input Handler
  const startListening = () => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onstart = () => {
      // console.log("Voice recognition started");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleStartConversation = async () => {
    setHasStarted(true);
    setIsLoading(true);
    const response = await geminiService.sendMessage("Hello, I'm a new user. Please start the conversation as MediAssist.");
    
    const aiMessage: Message = {
      id: Date.now().toString(),
      role: 'model',
      text: response.text,
      timestamp: new Date(),
    };
    setMessages([aiMessage]);
    setIsLoading(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');

    // Add User Message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Get AI Response
    const response = await geminiService.sendMessage(userText);

    // Add AI Message
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    
    // Update Booking History logic
    if (response.bookingData) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (response.bookingData.status === 'cancelled') {
        // CANCELLATION LOGIC: Find existing booking and update it
        setBookingHistory((prev) => {
          // Deep clone
          const updatedHistory = [...prev];
          const patientName = response.bookingData!.patient_name.toLowerCase();
          
          // Find the most recent confirmed booking for this patient
          const index = updatedHistory.findIndex(b => 
            b.patient_name.toLowerCase().includes(patientName) && b.status !== 'cancelled'
          );

          if (index !== -1) {
            updatedHistory[index] = { 
              ...updatedHistory[index], 
              status: 'cancelled',
              timestamp: timestamp + ' (Cancelled)' // Update timestamp to show when cancelled
            };
            return updatedHistory;
          } else {
            // If not found (e.g. wiped data), just add the cancellation record
            return [{ ...response.bookingData!, timestamp, status: 'cancelled' }, ...prev];
          }
        });
      } else {
        // NEW BOOKING LOGIC
        const newBooking = {
          ...response.bookingData,
          timestamp: timestamp
        };
        setBookingHistory((prev) => [newBooking, ...prev]);

        // --- AUTOMATION TRIGGER ---
        if (autoSend) {
          const message = `*✅ New Booking Confirmed*\n\n• *Patient*: ${newBooking.patient_name}\n• *Dept*: ${newBooking.department}\n• *Time*: ${newBooking.time}`;
          const encodedReport = encodeURIComponent(message);
          const cleanNumber = adminPhone.replace(/[^0-9]/g, '');
          
          const url = cleanNumber 
            ? `https://wa.me/${cleanNumber}?text=${encodedReport}`
            : `https://wa.me/?text=${encodedReport}`;

          setTimeout(() => {
             // Open WhatsApp in a new tab
             window.open(url, '_blank');
          }, 1000);
        }
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen text-slate-200 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-neon-blue/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[85vh]">
        
        {/* Left Column: Chat Interface */}
        <div className="lg:col-span-8 glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col relative flex-1">
           {/* Header */}
           <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-neon-purple to-neon-blue p-[2px]">
                    <div className="w-full h-full rounded-full bg-cyber-dark flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                        </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-cyber-dark animate-pulse"></div>
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">MEDIASSIST <span className="text-xs font-normal text-neon-blue ml-1">AI</span></h1>
                  <p className="text-xs text-gray-400">Automated Patient Care System</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <span className="h-2 w-12 bg-neon-purple/20 rounded-full overflow-hidden">
                    <div className="h-full bg-neon-purple/60 w-2/3 animate-pulse-glow"></div>
                 </span>
              </div>
           </div>

           {/* Chat Area */}
           <div 
             className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(11, 12, 21, 0.8), rgba(11, 12, 21, 0.8)), url("https://www.transparenttextures.com/patterns/cubes.png")'
             }}
           >
              {!hasStarted ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 relative">
                   <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/5 to-transparent rounded-full blur-3xl"></div>
                   
                   <div className="glass-panel p-8 rounded-2xl text-center max-w-md mx-auto border border-white/10 relative z-10 animate-float">
                      <div className="w-20 h-20 bg-gradient-to-br from-neon-purple to-neon-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-neon-purple/20">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
                      <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                        I am your personal AI assistant. I can help you book appointments, manage schedules, and answer your queries with care.
                      </p>
                      <button 
                        onClick={handleStartConversation}
                        className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-transparent border border-neon-purple rounded-full overflow-hidden transition-all duration-300 hover:bg-neon-purple/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        <span className="relative">Start System</span>
                      </button>
                   </div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-5 py-4 flex items-center space-x-2">
                          <span className="text-xs text-neon-blue mr-2 font-mono">THINKING</span>
                          <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </>
              )}
           </div>

           {/* Input Area */}
           {hasStarted && (
             <div className="bg-white/5 backdrop-blur-md p-4 border-t border-white/10">
               <div className="flex items-center gap-3">
                 {/* Voice Button */}
                 <button 
                  onClick={startListening}
                  className={`p-3 rounded-full transition-all duration-300 border ${
                    isListening 
                    ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                  title="Voice Input"
                 >
                   {isListening ? (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                     </svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                   )}
                 </button>

                 <form onSubmit={handleSendMessage} className="flex-1 flex gap-3 relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Type your message..."}
                      className="flex-1 bg-black/20 text-white rounded-xl border border-white/10 px-5 py-3 focus:ring-1 focus:ring-neon-blue focus:border-neon-blue outline-none text-sm placeholder-gray-500 transition-all"
                      disabled={isLoading}
                      autoFocus
                    />
                    <button 
                      type="submit" 
                      disabled={!inputValue.trim() || isLoading}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        !inputValue.trim() || isLoading 
                        ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-neon-purple to-neon-blue text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform rotate-0">
                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                      </svg>
                    </button>
                 </form>
               </div>
             </div>
           )}
        </div>

        {/* Right Column: Admin Panel (HUD) */}
        <div className="lg:col-span-4 h-full">
           <AdminPanel 
             bookingHistory={bookingHistory} 
             onClearHistory={handleClearHistory} 
             adminPhone={adminPhone}
             setAdminPhone={setAdminPhone}
             autoSend={autoSend}
             setAutoSend={setAutoSend}
            />
        </div>

      </div>
    </div>
  );
}

export default App;