import React, { useEffect, useState } from 'react';
import { ExamSession } from '../types';
import { BarChart3, Users, Clock, Monitor, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { FirebaseService } from '../services/firebase';

export const AdminDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await FirebaseService.getExamSessions();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load sessions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const totalTaken = sessions.length;
  // Calculate average only for completed sessions if status exists
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED' || s.score !== undefined);
  const avgScore = completedSessions.length > 0 
    ? (completedSessions.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / completedSessions.length * 100).toFixed(1) 
    : 0;

  const toggleExpand = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

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
                  ? new Date(sessions[0].createdAt?.toMillis ? sessions[0].createdAt.toMillis() : Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
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
                      {session.createdAt?.toMillis 
                        ? new Date(session.createdAt.toMillis()).toLocaleString() 
                        : "Just now"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{session.subjectName}</div>
                      <div className="text-xs text-slate-400">
                        {session.chapterName || "All Chapters (Shuffled)"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {session.status === 'IN_PROGRESS' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">In Progress</span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          (session.score / session.totalQuestions) >= 0.7 
                            ? 'bg-green-100 text-green-700' 
                            : (session.score / session.totalQuestions) >= 0.4 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {session.score} / {session.totalQuestions}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-500" title={session.studentMetadata?.userAgent}>
                      <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span className="truncate">{session.studentMetadata?.userAgent || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleExpand(session.id)}
                        disabled={session.status === 'IN_PROGRESS'}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            {session.answers?.map((ans, idx) => (
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
