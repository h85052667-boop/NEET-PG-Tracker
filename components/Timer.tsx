import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, CheckCircle, Clock } from 'lucide-react';
import { Button } from './Button';
import { ConcentrationLevel, StudySession } from '../types';

interface TimerProps {
  onSessionComplete: (session: Omit<StudySession, 'id'>) => void;
  onCancel: () => void;
  availableSubjects?: string[];
}

export const Timer: React.FC<TimerProps> = ({ onSessionComplete, onCancel, availableSubjects = [] }) => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionState, setSessionState] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED'>('IDLE');
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [concentration, setConcentration] = useState<ConcentrationLevel>(3);
  const [notes, setNotes] = useState('');

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => {
    if (sessionState === 'IDLE') {
      setStartTime(Date.now());
      setSessionState('RUNNING');
      setIsActive(true);
    } else if (sessionState === 'RUNNING') {
      setSessionState('PAUSED');
      setIsActive(false);
    } else if (sessionState === 'PAUSED') {
      setSessionState('RUNNING');
      setIsActive(true);
    }
  };

  const stopTimer = () => {
    setIsActive(false);
    setSessionState('FINISHED');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime) return;

    onSessionComplete({
      subject: subject || 'General Study',
      startTime,
      endTime: Date.now(),
      duration: seconds,
      concentration,
      notes
    });
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (sessionState === 'FINISHED') {
    return (
      <div className="max-w-md mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 animate-fade-in">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">Session Complete!</h2>
          <p className="text-slate-400">Time focused: {formatTime(seconds)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
            <input
              list="subjects-list"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, History..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              required
            />
            {availableSubjects.length > 0 && (
              <datalist id="subjects-list">
                {availableSubjects.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>
            )}
            {availableSubjects.length > 0 && (
               <p className="text-xs text-slate-500 mt-1">Start typing to select from your imported schedule.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Concentration Level (1-5)</label>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConcentration(level as ConcentrationLevel)}
                  className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                    concentration === level 
                      ? 'bg-brand-600 text-white ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-800' 
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Distracted</span>
              <span>Deep Focus</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you accomplish?"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none h-24 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Discard</Button>
            <Button type="submit" className="flex-1">Save Session</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      {/* Timer Circle */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 rounded-full"></div>
        <div className="relative w-72 h-72 rounded-full border-8 border-slate-700 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <div className="text-center">
            <Clock className="w-8 h-8 text-brand-400 mx-auto mb-2 opacity-80" />
            <div className="text-6xl font-mono font-bold text-white tracking-wider">
              {formatTime(seconds)}
            </div>
            <div className="text-brand-300 mt-2 font-medium">
              {sessionState === 'RUNNING' ? 'FOCUSING...' : sessionState === 'PAUSED' ? 'PAUSED' : 'READY'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6">
        <button
          onClick={toggleTimer}
          className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg hover:shadow-brand-500/25"
        >
          {sessionState === 'RUNNING' ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        {(sessionState === 'RUNNING' || sessionState === 'PAUSED') && (
          <button
            onClick={stopTimer}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg hover:shadow-red-500/25"
          >
            <Square className="w-8 h-8 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
};