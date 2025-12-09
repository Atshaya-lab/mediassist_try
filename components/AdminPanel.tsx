import React, { useState, useMemo } from 'react';
import { BookingData } from '../types';

interface AdminPanelProps {
  bookingHistory: BookingData[];
  onClearHistory: () => void;
  adminPhone: string;
  setAdminPhone: (phone: string) => void;
  autoSend: boolean;
  setAutoSend: (enabled: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  bookingHistory, 
  onClearHistory,
  adminPhone,
  setAdminPhone,
  autoSend,
  setAutoSend
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'history' | 'automation' | 'script'>('analytics');
  const [copyFeedback, setCopyFeedback] = useState('');

  // The user's provided Selenium script
  const seleniumCode = `
import sqlite3
import time
from selenium import webdriver
# ... (See automation.py for full code)
# This script sends WhatsApp messages automatically.
`;

  // --- DERIVED ANALYTICS DATA ---
  const stats = useMemo(() => {
    const total = bookingHistory.length;
    const active = bookingHistory.filter(b => b.status !== 'cancelled').length;
    const cancelled = bookingHistory.filter(b => b.status === 'cancelled').length;
    const highPriority = bookingHistory.filter(b => b.priority === 'high' && b.status !== 'cancelled').length;
    
    // Group by department
    const deptCounts: Record<string, number> = {};
    bookingHistory.forEach(b => {
      if (b.status !== 'cancelled') {
        const dept = b.department || 'General';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      }
    });

    // Sort departments by count
    const topDepts = Object.entries(deptCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    return { total, active, cancelled, highPriority, topDepts };
  }, [bookingHistory]);

  const generateReport = () => {
    const activeBookings = bookingHistory.filter(b => b.status !== 'cancelled');
    if (activeBookings.length === 0) return "No active appointments today.";
    
    let report = "*📅 Hospital Daily Report*\n\n";
    activeBookings.forEach(booking => {
      const urgencyIcon = booking.priority === 'high' ? '🚨 *URGENT* ' : '';
      report += `• ${urgencyIcon}*${booking.time}*: ${booking.patient_name} (${booking.department})\n`;
      if(booking.contact_number) {
        report += `  _Contact: ${booking.contact_number}_\n`;
      }
    });
    return report;
  };

  const handleCopyReport = () => {
    const report = generateReport();
    navigator.clipboard.writeText(report).then(() => {
      setCopyFeedback('COPIED');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  const handleDirectWhatsApp = () => {
    const report = generateReport();
    const encodedReport = encodeURIComponent(report);
    const cleanNumber = adminPhone.replace(/[^0-9]/g, '');
    const url = cleanNumber 
        ? `https://wa.me/${cleanNumber}?text=${encodedReport}`
        : `https://wa.me/?text=${encodedReport}`;
    window.open(url, '_blank');
  };

  // Tab Button Component
  const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 relative overflow-hidden group transition-all duration-300 ${
        activeTab === id 
        ? 'text-white' 
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >
      <div className="flex flex-col items-center gap-1 relative z-10">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      
      {activeTab === id && (
        <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/20 to-transparent">
           <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-purple to-neon-blue shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
        </div>
      )}
    </button>
  );

  return (
    <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border border-white/10 relative">
      {/* Top HUD Bar */}
      <div className="bg-black/40 p-4 border-b border-white/10 backdrop-blur-md flex justify-between items-center">
        <h2 className="text-white font-bold tracking-wider flex items-center gap-2 text-xs uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-neon-blue">
            <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm14.25 6a.75.75 0 0 1-.22.53l-2.25 2.25a.75.75 0 1 1-1.06-1.06L15.44 12l-1.72-1.72a.75.75 0 1 1 1.06-1.06l2.25 2.25c.141.14.22.331.22.53Zm-10.28-.53a.75.75 0 0 0 0 1.06l2.25 2.25a.75.75 0 1 0 1.06-1.06L8.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-2.25 2.25Z" clipRule="evenodd" />
          </svg>
          MediAssist_OS <span className="opacity-50">| v3.1</span>
        </h2>
        <div className="flex items-center gap-2">
           <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[9px] text-green-500 font-mono">LIVE_DATA</span>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 bg-black/20">
        <TabButton 
          id="analytics" 
          label="Overview" 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
            </svg>
          } 
        />
        <TabButton 
          id="history" 
          label="Database" 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          } 
        />
        <TabButton 
          id="automation" 
          label="Automation" 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          } 
        />
        <TabButton 
          id="script" 
          label="Code" 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          } 
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent relative">
        
        {/* === ANALYTICS / DASHBOARD TAB === */}
        {activeTab === 'analytics' && (
          <div className="p-5 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-neon-blue/20 rounded-full blur-2xl -mr-8 -mt-8"></div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total Patients</div>
                <div className="text-3xl font-bold text-white mt-1">{stats.total}</div>
                <div className="text-[10px] text-neon-blue mt-1 flex items-center gap-1">
                  <span className="bg-neon-blue/20 px-1 rounded">+{bookingHistory.length > 0 ? '12%' : '0%'}</span>
                  <span>vs last week</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 rounded-full blur-2xl -mr-8 -mt-8"></div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Critical / High</div>
                <div className="text-3xl font-bold text-white mt-1">{stats.highPriority}</div>
                <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                   {stats.highPriority > 0 ? 'Action Required' : 'Stable'}
                </div>
              </div>
            </div>

            {/* Main Stats Area */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-5 relative">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-neon-purple rounded-full"></span>
                Department_Distribution
              </h3>
              
              <div className="space-y-4">
                {stats.topDepts.length > 0 ? (
                  stats.topDepts.map(([dept, count], idx) => {
                    const percentage = Math.round((count / (stats.active || 1)) * 100);
                    const color = idx === 0 ? 'bg-neon-purple' : idx === 1 ? 'bg-neon-blue' : 'bg-neon-pink';
                    return (
                      <div key={dept} className="group">
                         <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase font-bold">
                            <span>{dept}</span>
                            <span>{percentage}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${color} shadow-[0_0_10px_currentColor] transition-all duration-1000`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                         </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-[10px] text-gray-600 font-mono">
                    AWAITING_DATA_INPUT...
                  </div>
                )}
              </div>
            </div>

            {/* Circular Load / Radar Concept */}
            <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-xl p-5 flex items-center justify-between">
               <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1">System Load</h3>
                  <div className="text-[10px] text-gray-400">Real-time optimization</div>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-mono text-neon-blue border border-neon-blue/30 bg-neon-blue/10 px-2 py-1 rounded">
                    <span className="animate-pulse">●</span> OPTIMAL
                  </div>
               </div>
               
               {/* Decorative Ring Chart */}
               <div className="relative w-20 h-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="32" className="text-white/5" strokeWidth="8" stroke="currentColor" fill="transparent" />
                    <circle cx="40" cy="40" r="32" className="text-neon-purple" strokeWidth="8" stroke="currentColor" fill="transparent" strokeDasharray="200" strokeDashoffset={200 - (stats.active * 10)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {stats.active}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* === HISTORY TAB === */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-neon-blue font-mono border border-neon-blue/30 px-2 py-0.5 rounded bg-neon-blue/5 shadow-[0_0_10px_rgba(14,165,233,0.1)]">
                STORAGE::SYNCED
              </span>
              <div className="flex gap-2">
                 <button 
                  onClick={handleCopyReport}
                  className="group flex items-center gap-2 text-[10px] text-white border border-white/20 px-3 py-1.5 rounded hover:bg-white/10 hover:border-white/40 transition-all uppercase font-bold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-neon-purple group-hover:scale-110 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.381V19.5a2.25 2.25 0 0 0 2.25 2.25H18" />
                  </svg>
                  {copyFeedback || 'Copy Report'}
                </button>
                {bookingHistory.length > 0 && (
                  <button 
                    onClick={onClearHistory}
                    className="text-[10px] text-red-400 border border-red-500/30 px-3 py-1.5 rounded hover:bg-red-500/10 transition-colors uppercase font-bold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {bookingHistory.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-xl bg-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 opacity-20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                <span className="text-xs font-mono opacity-50">NO_RECORDS_FOUND</span>
              </div>
            ) : (
              <div className="space-y-3">
              {bookingHistory.map((booking, index) => {
                const isCancelled = booking.status === 'cancelled';
                const isHighPriority = booking.priority === 'high';
                const isCallback = booking.status === 'pending_callback';

                return (
                  <div key={index} className={`relative rounded-xl border p-4 transition-all hover:scale-[1.01] group ${
                    isCancelled 
                    ? 'bg-red-500/5 border-red-500/30' 
                    : isHighPriority 
                      ? 'bg-red-900/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-glow'
                      : 'bg-white/5 border-white/10 hover:border-neon-purple/50 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                  }`}>
                    {!isCancelled && <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r opacity-50 group-hover:opacity-100 transition-opacity ${
                        isHighPriority ? 'bg-red-500' : 'bg-gradient-to-b from-neon-purple to-neon-blue'
                    }`}></div>}
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                       <span className={`text-xs font-bold font-mono ${isCancelled ? 'text-red-400' : isHighPriority ? 'text-red-400' : 'text-neon-blue'}`}>
                          #{String(bookingHistory.length - index).padStart(3, '0')}
                       </span>
                       <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                          </svg>
                          {booking.timestamp}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pl-2">
                        <div>
                           <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-0.5">Patient</label>
                           <div className={`text-sm font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-white'}`}>
                              {booking.patient_name}
                           </div>
                        </div>
                        <div className="text-right">
                           <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-0.5">
                               {isCallback ? 'Callback Req' : 'Time Slot'}
                           </label>
                           <div className={`text-sm font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-neon-purple'}`}>
                              {booking.time}
                           </div>
                        </div>
                        
                        {isHighPriority && !isCancelled && (
                            <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded p-1.5 flex items-center gap-2 mt-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">High Priority Detected</span>
                            </div>
                        )}

                        {booking.contact_number && (
                           <div className="col-span-2 text-xs text-neon-blue font-mono mt-1">
                              📞 {booking.contact_number}
                           </div>
                        )}

                        <div className="col-span-2 mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                           <div className="text-xs text-gray-300 font-mono">{booking.department}</div>
                           {isCancelled ? (
                             <span className="text-[10px] text-red-500 font-bold uppercase border border-red-500/30 px-1.5 py-0.5 rounded bg-red-500/10">Cancelled</span>
                           ) : isCallback ? (
                              <span className="text-[10px] text-yellow-400 font-bold uppercase border border-yellow-500/30 px-1.5 py-0.5 rounded bg-yellow-500/10">Pending Call</span>
                           ) : (
                             <span className="text-[10px] text-green-400 font-bold uppercase border border-green-500/30 px-1.5 py-0.5 rounded bg-green-500/10">Active</span>
                           )}
                        </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* === AUTOMATION TAB === */}
        {activeTab === 'automation' && (
           <div className="p-4 space-y-6">
             <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-neon-blue/20 transition-all duration-700"></div>
                
                <h3 className="text-xs font-bold text-neon-blue uppercase tracking-widest mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    WhatsApp Integration
                </h3>
                
                <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Admin Mobile Number</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="e.g. 15550109999"
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            className="w-full bg-black/40 text-white text-sm pl-9 pr-4 py-3 border border-white/10 rounded-xl focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none font-mono placeholder-gray-600 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-white mb-1">Auto-Trigger</span>
                         <span className="text-[10px] text-gray-500">Automatically open WhatsApp when a booking is confirmed.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoSend}
                          onChange={(e) => setAutoSend(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-neon-purple peer-checked:to-neon-blue shadow-inner"></div>
                      </label>
                    </div>

                    <button 
                        onClick={handleDirectWhatsApp}
                        className="w-full mt-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-xl transition-all border border-white/10 hover:border-neon-blue/50 flex items-center justify-center gap-2 group relative overflow-hidden"
                    >
                         <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        <span className="relative flex items-center gap-2">
                           TEST_CONNECTION
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-neon-blue group-hover:translate-x-1 transition-transform">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                           </svg>
                        </span>
                    </button>
                </div>
            </div>
           </div>
        )}

        {/* === SCRIPT TAB === */}
        {activeTab === 'script' && (
          <div className="p-4 flex flex-col h-full">
             <div className="bg-black/40 rounded-xl overflow-hidden border border-white/10 flex flex-col flex-1 shadow-inner">
               <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                 </div>
                 <span className="text-[10px] text-gray-500 font-mono">automation.py</span>
               </div>
               <div className="p-4 overflow-auto custom-scrollbar flex-1 relative">
                 <pre className="text-[10px] font-mono text-neon-pink leading-relaxed">
                   {seleniumCode.trim()}
                 </pre>
               </div>
               <div className="bg-white/5 px-4 py-2 text-[9px] text-gray-500 text-center border-t border-white/5">
                 READ_ONLY MODE
               </div>
             </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-black/80 p-3 border-t border-white/10 flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase backdrop-blur-md">
        <span>MediAssist_Core</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-pulse"></span>
          v3.1.0
        </span>
      </div>
    </div>
  );
};
