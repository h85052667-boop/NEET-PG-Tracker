import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Timer as TimerIcon, 
  History as HistoryIcon, 
  BrainCircuit, 
  BookOpen,
  Filter,
  X,
  Settings,
  Download,
  Upload,
  Trash2,
  FileText,
  Save,
  Stethoscope,
  CheckSquare,
  Plus,
  Trophy,
  Loader2,
  Camera
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Timer } from './components/Timer';
import { Dashboard } from './components/Dashboard';
import { Button } from './components/Button';
import { generateStudyInsights, verifyMCQProof } from './services/geminiService';
import { StudySession, ViewState, MCQLog } from './types';
import ReactMarkdown from 'react-markdown';

const DEFAULT_NEET_PG_SUBJECTS = [
  "Anatomy", 
  "Physiology", 
  "Biochemistry",
  "Pathology", 
  "Pharmacology", 
  "Microbiology",
  "Forensic Medicine", 
  "Community Medicine (PSM)",
  "ENT", 
  "Ophthalmology",
  "General Medicine", 
  "General Surgery", 
  "Obstetrics & Gynaecology", 
  "Pediatrics",
  "Orthopedics", 
  "Radiology", 
  "Dermatology", 
  "Anesthesia", 
  "Psychiatry"
];

const App: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [studyPlan, setStudyPlan] = useState<string[]>([]);
  const [mcqLogs, setMcqLogs] = useState<MCQLog[]>([]);
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [verifyingMCQ, setVerifyingMCQ] = useState(false);

  // Filter State
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterConcentration, setFilterConcentration] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  
  // Settings Local State
  const [planInput, setPlanInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mcqImageInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('focusflow_sessions');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }

    const savedPlan = localStorage.getItem('focusflow_plan');
    if (savedPlan) {
      try {
        setStudyPlan(JSON.parse(savedPlan));
      } catch (e) {
        console.error("Failed to parse study plan", e);
        setStudyPlan(DEFAULT_NEET_PG_SUBJECTS);
      }
    } else {
      setStudyPlan(DEFAULT_NEET_PG_SUBJECTS);
    }

    const savedMCQs = localStorage.getItem('focusflow_mcqs');
    if (savedMCQs) {
      try {
        setMcqLogs(JSON.parse(savedMCQs));
      } catch (e) {
        console.error("Failed to parse MCQ logs", e);
      }
    }
  }, []);

  // Save to local storage on update
  useEffect(() => {
    localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('focusflow_plan', JSON.stringify(studyPlan));
  }, [studyPlan]);

  useEffect(() => {
    localStorage.setItem('focusflow_mcqs', JSON.stringify(mcqLogs));
  }, [mcqLogs]);
  
  // Sync plan input when view changes to settings
  useEffect(() => {
    if (view === ViewState.SETTINGS) {
      setPlanInput(studyPlan.join('\n'));
    }
  }, [view, studyPlan]);

  const addSession = (sessionData: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...sessionData,
      id: crypto.randomUUID(),
    };
    setSessions(prev => [newSession, ...prev]);
    setView(ViewState.DASHBOARD);
  };

  const handleGetInsights = async () => {
    setLoadingInsight(true);
    const result = await generateStudyInsights(sessions);
    setInsight(result);
    setLoadingInsight(false);
  };

  const handleMCQUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 2MB limit check
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Please upload an image smaller than 2MB.");
      return;
    }

    setVerifyingMCQ(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Str = e.target?.result as string;
      
      try {
        const result = await verifyMCQProof(base64Str);
        
        if (result.verified) {
          const newLog: MCQLog = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            count: result.count,
            verified: true,
            feedback: result.feedback
          };
          setMcqLogs(prev => [newLog, ...prev]);
          alert(result.feedback);
        } else {
          alert(`Verification Failed: ${result.feedback}`);
        }
      } catch (error) {
        alert("An error occurred during verification.");
      } finally {
        setVerifyingMCQ(false);
        if (mcqImageInputRef.current) mcqImageInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const resetFilters = () => {
    setFilterSubject('ALL');
    setFilterConcentration('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Data Management Functions
  const handleExportData = () => {
    const data = {
      sessions,
      studyPlan,
      mcqLogs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `neet_pg_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);

        if (Array.isArray(parsedData)) {
          // Legacy support
          if (sessions.length > 0 && !window.confirm("Replace history?")) return;
          setSessions(parsedData);
        } else if (parsedData.sessions) {
           if ((sessions.length > 0 || mcqLogs.length > 0) && !window.confirm("Replace all data (Sessions, MCQs, Plan)?")) return;
           
           if (Array.isArray(parsedData.sessions)) setSessions(parsedData.sessions);
           if (Array.isArray(parsedData.studyPlan)) setStudyPlan(parsedData.studyPlan);
           if (Array.isArray(parsedData.mcqLogs)) setMcqLogs(parsedData.mcqLogs);
           
           alert(`Import Successful!`);
        } else {
          alert("Invalid file format.");
        }
        setView(ViewState.HISTORY);
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to parse the file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSavePlan = () => {
    const lines = planInput.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    setStudyPlan(lines);
    alert(`Saved ${lines.length} items to your Study Schedule.`);
  };

  const handleClearData = () => {
    if (window.confirm("Delete ALL data (History, MCQs, Settings)?")) {
      setSessions([]);
      setMcqLogs([]);
      alert("All data has been cleared.");
    }
  };

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (timestamp: number) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const uniqueSubjects = Array.from(new Set(sessions.map(s => s.subject))).sort();

  const filteredSessions = sessions.filter(session => {
    const dateStr = getLocalDateString(session.startTime);

    if (filterSubject !== 'ALL' && session.subject !== filterSubject) return false;
    if (filterConcentration !== 'ALL' && String(session.concentration) !== filterConcentration) return false;
    if (filterStartDate && dateStr < filterStartDate) return false;
    if (filterEndDate && dateStr > filterEndDate) return false;
    return true;
  });

  // Calculate MCQ Stats
  const getDailyMCQCount = () => {
    const today = getLocalDateString(Date.now());
    return mcqLogs
      .filter(log => getLocalDateString(log.timestamp) === today)
      .reduce((acc, log) => acc + log.count, 0);
  };

  const getWeeklyMCQData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d.getTime());
      const count = mcqLogs
        .filter(log => getLocalDateString(log.timestamp) === dateStr)
        .reduce((acc, log) => acc + log.count, 0);
      data.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count
      });
    }
    return data;
  };

  const renderContent = () => {
    switch (view) {
      case ViewState.TIMER:
        return (
          <Timer 
            onSessionComplete={addSession} 
            onCancel={() => setView(ViewState.DASHBOARD)} 
            availableSubjects={studyPlan}
          />
        );
      
      case ViewState.DASHBOARD:
        return (
          <>
            {sessions.length === 0 ? (
               <div className="text-center py-20">
                 <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-6">
                    <Stethoscope className="w-10 h-10 text-slate-500" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">NEET PG Preparation</h2>
                 <p className="text-slate-400 mb-8 max-w-md mx-auto">Start your first revision session. Track your focus across all 19 subjects.</p>
                 <Button onClick={() => setView(ViewState.TIMER)} size="lg">Start Revision</Button>
               </div>
            ) : (
              <Dashboard sessions={sessions} />
            )}
          </>
        );
      
      case ViewState.MCQ:
        const todayCount = getDailyMCQCount();
        const goal = 100;
        const progress = Math.min(100, Math.round((todayCount / goal) * 100));
        
        return (
          <div className="animate-fade-in space-y-8">
             <div className="flex flex-col md:flex-row gap-8">
               
               {/* Daily Progress Card */}
               <div className="flex-1 bg-slate-800 p-8 rounded-2xl border border-slate-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckSquare className="w-32 h-32 text-brand-400" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Daily MCQ Goal</h2>
                  <p className="text-slate-400 mb-6">Target: 100 MCQs per day</p>
                  
                  <div className="flex items-end gap-4 mb-4">
                    <span className="text-6xl font-bold text-brand-400">{todayCount}</span>
                    <span className="text-xl text-slate-500 mb-2">/ {goal} solved</span>
                  </div>
                  
                  <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-right text-sm text-brand-300 mt-2 font-medium">{progress}% Complete</p>
               </div>

               {/* Upload Card */}
               <div className="flex-1 bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
                  <div className="mb-4 p-4 bg-slate-700/50 rounded-full">
                    {verifyingMCQ ? <Loader2 className="w-8 h-8 text-brand-400 animate-spin" /> : <Camera className="w-8 h-8 text-brand-400" />}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Verify Progress</h3>
                  <p className="text-slate-400 text-sm mb-6 max-w-xs">
                    Take a photo of your scorecard or upload a screenshot. AI will verify your daily count.
                  </p>
                  
                  <input 
                    type="file" 
                    ref={mcqImageInputRef}
                    onChange={handleMCQUpload}
                    accept="image/*"
                    className="hidden"
                    disabled={verifyingMCQ}
                  />
                  <Button 
                    onClick={() => mcqImageInputRef.current?.click()} 
                    isLoading={verifyingMCQ}
                    className="w-full max-w-xs"
                  >
                    {verifyingMCQ ? 'Analyzing...' : 'Take Photo / Upload'}
                  </Button>
               </div>
             </div>

             {/* Chart & Recent Logs */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-6">Weekly MCQ Consistency</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getWeeklyMCQData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                          cursor={{fill: '#334155', opacity: 0.2}}
                        />
                        <Bar dataKey="count" name="MCQs" radius={[4, 4, 0, 0]}>
                           {getWeeklyMCQData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.count >= 100 ? '#22c55e' : '#3b82f6'} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Verifications</h3>
                  <div className="overflow-y-auto flex-1 pr-2 space-y-3 max-h-64 scrollbar-thin">
                    {mcqLogs.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No proofs uploaded yet.</p>
                    ) : (
                      mcqLogs.slice(0, 10).map(log => (
                        <div key={log.id} className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center border border-slate-800">
                           <div>
                             <p className="text-sm font-medium text-white">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             <p className="text-xs text-slate-400">{log.feedback}</p>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-brand-400 font-bold">+{log.count}</span>
                             <Trophy className="w-4 h-4 text-yellow-500" />
                           </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
             </div>
          </div>
        );

      case ViewState.HISTORY:
        return (
          <div className="space-y-4 animate-fade-in">
             <div className="flex justify-between items-end mb-2">
               <h2 className="text-2xl font-bold text-white">Revision History</h2>
             </div>

             {/* Filters */}
             {sessions.length > 0 && (
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                 <div className="flex items-center gap-2 mb-4 text-slate-300">
                   <Filter className="w-4 h-4" />
                   <span className="text-sm font-medium">Filters</span>
                   {(filterSubject !== 'ALL' || filterConcentration !== 'ALL' || filterStartDate || filterEndDate) && (
                       <button onClick={resetFilters} className="ml-auto text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                           <X className="w-3 h-3" /> Clear All
                       </button>
                   )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div>
                       <label className="block text-xs text-slate-500 mb-1">Subject</label>
                       <select 
                           value={filterSubject} 
                           onChange={e => setFilterSubject(e.target.value)}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                       >
                           <option value="ALL">All Subjects</option>
                           {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs text-slate-500 mb-1">Concentration</label>
                       <select 
                           value={filterConcentration} 
                           onChange={e => setFilterConcentration(e.target.value)}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                       >
                           <option value="ALL">All Levels</option>
                           {[5,4,3,2,1].map(l => <option key={l} value={l}>{l} Stars</option>)}
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                       <input 
                           type="date" 
                           value={filterStartDate} 
                           onChange={e => setFilterStartDate(e.target.value)}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none [color-scheme:dark]" 
                       />
                   </div>
                   <div>
                       <label className="block text-xs text-slate-500 mb-1">End Date</label>
                       <input 
                           type="date" 
                           value={filterEndDate} 
                           onChange={e => setFilterEndDate(e.target.value)}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none [color-scheme:dark]" 
                       />
                   </div>
                 </div>
               </div>
             )}

             {sessions.length === 0 ? (
               <p className="text-slate-400">No revision history available.</p>
             ) : filteredSessions.length === 0 ? (
               <div className="text-center py-10 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                 <p className="text-slate-400">No sessions match your filters.</p>
                 <button onClick={resetFilters} className="text-brand-400 text-sm mt-2 hover:underline">Clear filters</button>
               </div>
             ) : (
               <div className="grid gap-4">
                 {filteredSessions.map(session => (
                   <div key={session.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center transition-all hover:border-slate-600">
                      <div>
                        <h3 className="font-semibold text-white">{session.subject}</h3>
                        <p className="text-sm text-slate-400">
                          {new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        {session.notes && <p className="text-sm text-slate-500 mt-1 italic">"{session.notes}"</p>}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-brand-400">
                          {Math.floor(session.duration / 60)}m {session.duration % 60}s
                        </div>
                        <div className="flex items-center gap-1 justify-end text-sm text-slate-300">
                          <span className={`w-2 h-2 rounded-full ${session.concentration >= 4 ? 'bg-green-500' : session.concentration >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                          Focus: {session.concentration}/5
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        );

      case ViewState.INSIGHTS:
        return (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">AI NEET Coach</h2>
              <Button onClick={handleGetInsights} isLoading={loadingInsight} disabled={sessions.length === 0}>
                {insight ? 'Refresh Analysis' : 'Analyze My Progress'}
              </Button>
            </div>
            
            {!insight && !loadingInsight && (
              <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                <BrainCircuit className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Let Gemini analyze your revision patterns and suggest improvements for high-yield topics.</p>
                <Button onClick={handleGetInsights} disabled={sessions.length === 0}>Generate Insights</Button>
              </div>
            )}

            {loadingInsight && (
              <div className="space-y-4">
                <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded animate-pulse"></div>
                <div className="h-4 bg-slate-800 rounded animate-pulse w-5/6"></div>
              </div>
            )}

            {insight && !loadingInsight && (
               <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 prose prose-invert max-w-none">
                  <ReactMarkdown>{insight}</ReactMarkdown>
               </div>
            )}
          </div>
        );

      case ViewState.SETTINGS:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
            <h2 className="text-2xl font-bold text-white">Settings</h2>

            {/* Study Schedule Section */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand-500/10 rounded-lg">
                    <FileText className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Subject Index / Schedule</h3>
                    <p className="text-sm text-slate-400">Manage your NEET PG subjects and rapid revision topics here.</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">Topics List (one per line):</label>
                  <textarea 
                    value={planInput}
                    onChange={(e) => setPlanInput(e.target.value)}
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 font-mono focus:ring-1 focus:ring-brand-500 outline-none resize-y"
                    placeholder="Anatomy - Upper Limb&#10;Physiology - CNS&#10;Pathology - General&#10;Pharmacology - ANS..."
                  />
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-slate-500">{planInput ? planInput.split('\n').filter(x=>x.trim()).length : 0} topics found</span>
                     <Button onClick={handleSavePlan} size="sm">
                       <Save className="w-4 h-4 mr-2" /> Save Index
                     </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Download className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Backup Data</h3>
                    <p className="text-sm text-slate-400">Download your study history and schedule.</p>
                  </div>
                </div>
                <Button onClick={handleExportData} variant="secondary" className="w-full justify-center">
                  Export to JSON
                </Button>
              </div>
            </div>

            {/* Import Section */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Upload className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Restore Data</h3>
                    <p className="text-sm text-slate-400">Restore your history from a backup file.</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImportData}
                  className="hidden"
                  accept=".json"
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full justify-center">
                  Select File to Import
                </Button>
              </div>
            </div>

             {/* Danger Zone */}
             <div className="bg-slate-800 rounded-xl border border-red-900/30 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Reset</h3>
                    <p className="text-sm text-slate-400">Clear all data and start fresh.</p>
                  </div>
                </div>
                <Button onClick={handleClearData} variant="danger" className="w-full justify-center">
                  Clear All History
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500/30">
      
      {/* Sidebar / Navigation (Mobile friendly top bar, Desktop sidebar) */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:bottom-auto md:w-64 md:h-screen bg-slate-950 border-t md:border-t-0 md:border-r border-slate-800 z-50 flex md:flex-col justify-around md:justify-start md:p-6 pb-safe">
        <div className="hidden md:flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">NEET PG Tracker</span>
        </div>

        <button 
          onClick={() => setView(ViewState.DASHBOARD)}
          className={`p-3 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-colors ${view === ViewState.DASHBOARD ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <LayoutDashboard className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">Dashboard</span>
        </button>

        <button 
          onClick={() => setView(ViewState.MCQ)}
          className={`p-3 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-colors ${view === ViewState.MCQ ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <CheckSquare className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">MCQ Tracker</span>
        </button>

        <button 
          onClick={() => setView(ViewState.TIMER)}
          className={`p-3 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-colors ${view === ViewState.TIMER ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <TimerIcon className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">Timer</span>
        </button>

        <button 
          onClick={() => setView(ViewState.HISTORY)}
          className={`p-3 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-colors ${view === ViewState.HISTORY ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <HistoryIcon className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">History</span>
        </button>

        <button 
          onClick={() => setView(ViewState.INSIGHTS)}
          className={`p-3 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-colors ${view === ViewState.INSIGHTS ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <BrainCircuit className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">AI Insights</span>
        </button>

        <div className="hidden md:block md:flex-grow"></div>

        <button 
          onClick={() => setView(ViewState.SETTINGS)}
          className={`p-3 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-colors ${view === ViewState.SETTINGS ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Settings className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">Settings</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="md:pl-64 min-h-screen pb-20 md:pb-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 md:px-10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
           <h1 className="text-lg font-semibold text-white">
             {view === ViewState.DASHBOARD && 'Dashboard'}
             {view === ViewState.MCQ && 'MCQ Tracker'}
             {view === ViewState.TIMER && 'Revision Session'}
             {view === ViewState.HISTORY && 'History'}
             {view === ViewState.INSIGHTS && 'Analysis'}
             {view === ViewState.SETTINGS && 'Settings'}
           </h1>
           <div className="flex items-center gap-4">
             {/* Could add user profile or settings here */}
             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
               Dr
             </div>
           </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;