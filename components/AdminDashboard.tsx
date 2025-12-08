import React, { useEffect, useState } from 'react';
import { MockDb } from '../services/mockDb';
import { ExamSession } from '../types';
import { BarChart3, Users, Clock, Monitor, ChevronDown, ChevronUp } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(MockDb.getExamSessions());
  }, []);

  const totalTaken = sessions.length;
  const avgScore = totalTaken > 0 
    ? (sessions.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / totalTaken * 100).toFixed(1) 
    : 0;

  // Simple aggregation for chart (Subject popularity)
  const subjectCounts = sessions.reduce((acc, curr) => {
    acc[curr.subjectName] = (acc[curr.subjectName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleExpand = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Exams Taken</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalTaken}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Average Score</p>
              <h3 className="text-2xl font-bold text-slate-900">{avgScore}%</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Last Activity</p>
              <h3 className="text-lg font-bold text-slate-900">
                {sessions.length > 0 
                  ? new Date(sessions[0].studentMetadata.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  : "N/A"}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic & Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Recent Exam Traffic</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Live Data</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Subject / Chapter</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Device Info</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <React.Fragment key={session.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(session.studentMetadata.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{session.subjectName}</div>
                      <div className="text-xs text-slate-400">
                        {session.chapterName || "All Chapters (Shuffled)"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        (session.score / session.totalQuestions) >= 0.7 
                          ? 'bg-green-100 text-green-700' 
                          : (session.score / session.totalQuestions) >= 0.4 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {session.score} / {session.totalQuestions}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-500" title={session.studentMetadata.userAgent}>
                      <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span className="truncate">{session.studentMetadata.userAgent}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleExpand(session.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        {expandedSessionId === session.id ? 'Hide' : 'Details'} 
                        {expandedSessionId === session.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Detail View */}
                  {expandedSessionId === session.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Session Answer Key</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {session.answers.map((ans, idx) => (
                              <div key={idx} className={`p-2 rounded border text-xs flex justify-between ${
                                ans.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                              }`}>
                                <span>Q{idx + 1}</span>
                                <span className="font-bold">Option {ans.selectedOption}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    No exams have been taken yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};