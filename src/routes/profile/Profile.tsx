import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { db, Goal, BodyMetric } from '../../lib/db'; // Adjust paths as needed
import { supabase } from '../../lib/supabaseClient';
import { generateId } from '../../lib';
import Auth from '../../lib/components/Auth';

interface GoalForm {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sleep: number | null;
  water: number | null;
  weight: number | null;
}

const ProfileAndGoals: React.FC = () => {
  // --- Auth State ---
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Goals & Metrics State ---
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [weightHistory, setWeightHistory] = useState<BodyMetric[]>([]);
  
  const [goalForm, setGoalForm] = useState<GoalForm>({
    calories: 2000, protein: 150, carbs: 200, fat: 65,
    sleep: 8, water: 2000, weight: 70
  });

  const [metricForm, setMetricForm] = useState({
    type: 'weight',
    value: 0,
    unit: 'kg',
    date: new Date().toISOString().split('T')[0]
  });

  // --- Refs ---
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // --- Auth Effect ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      setSession(_session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Fetching (Simulating liveQueryStore) ---
  useEffect(() => {
    const fetchGoals = async () => {
      const goals = await db.goals.orderBy('start_date').reverse().toArray();
      const latest = goals.length > 0 ? goals[0] : null;
      setActiveGoal(latest);
      
      if (latest && !isEditingGoal) {
        setGoalForm({
          calories: latest.calories_target,
          protein: latest.protein_target,
          carbs: latest.carbs_target,
          fat: latest.fat_target,
          sleep: latest.sleep_target ?? 8,
          water: latest.water_target ?? 2000,
          weight: latest.weight_target ?? 70
        });
      }
    };

    const fetchMetrics = async () => {
      const history = await db.metrics.where('type').equals('weight').sortBy('date');
      setWeightHistory(history);
    };

    fetchGoals();
    fetchMetrics();
    
    // If your db provider supports hooks (like useLiveQuery from Dexie), 
    // you'd replace this manual fetch with that hook.
  }, [isEditingGoal]);

  // --- Chart Logic ---
  useEffect(() => {
    if (!chartCanvasRef.current || weightHistory.length === 0) return;

    const labels = weightHistory.map(m => m.date);
    const data = weightHistory.map(m => m.value);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = data;
      chartInstanceRef.current.update();
    } else {
      const computedStyle = getComputedStyle(document.documentElement);
      const gridColor = computedStyle.getPropertyValue('--color-border-subtle').trim() || '#e4e4e7';
      const textColor = computedStyle.getPropertyValue('--color-text-muted').trim() || '#71717a';

      chartInstanceRef.current = new Chart(chartCanvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Weight',
            data,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: gridColor }, ticks: { color: textColor } },
            x: { grid: { color: gridColor }, ticks: { color: textColor } }
          },
          plugins: { legend: { labels: { color: textColor } } }
        }
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [weightHistory]);

  // --- Handlers ---
  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    try {
      const existingToday = await db.goals.where({ start_date: today }).first();
      const newGoal: Goal = {
        id: existingToday?.id || generateId(),
        user_id: session?.user?.id || 'local-user',
        start_date: today,
        calories_target: goalForm.calories,
        protein_target: goalForm.protein,
        carbs_target: goalForm.carbs,
        fat_target: goalForm.fat,
        sleep_target: goalForm.sleep ?? undefined,
        water_target: goalForm.water ?? undefined,
        weight_target: goalForm.weight ?? undefined,
        synced: 0,
        created_at: new Date()
      };
      await db.goals.put(newGoal);
      setIsEditingGoal(false);
      setActiveGoal(newGoal);
    } catch (err) {
      alert('Failed to save goal');
    }
  };

  const addMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newMetric: BodyMetric = {
        id: generateId(),
        user_id: session?.user?.id || 'local-user',
        date: metricForm.date,
        type: metricForm.type,
        value: Number(metricForm.value),
        unit: metricForm.unit,
        synced: 0,
        created_at: new Date()
      };
      await db.metrics.put(newMetric);
      setMetricForm({ ...metricForm, value: 0 });
      // Refresh weight history if we just added a weight metric
      if (metricForm.type === 'weight') {
        const history = await db.metrics.where('type').equals('weight').sortBy('date');
        setWeightHistory(history);
      }
    } catch (err) {
      alert('Failed to add metric');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-center bg-card p-4 shadow-sm border-b border-border-subtle sticky top-0 z-10">
        <h1 className="text-xl font-bold text-text-main">Profile & Goals</h1>
        {session && (
          <button 
            className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full" 
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        )}
      </header>

      {!session ? (
        <div className="px-4 max-w-lg mx-auto mt-10">
          <Auth />
        </div>
      ) : (
        <div className="px-4 space-y-6 max-w-lg mx-auto">
          {/* Goals Section */}
          <section className="bg-card p-5 rounded-xl shadow-sm border border-border-subtle">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-text-main">Daily Targets</h2>
              <button 
                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full" 
                onClick={() => setIsEditingGoal(!isEditingGoal)}
              >
                {isEditingGoal ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditingGoal ? (
              <form onSubmit={saveGoal} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Calories</label>
                    <input 
                      type="number" 
                      value={goalForm.calories} 
                      onChange={e => setGoalForm({...goalForm, calories: +e.target.value})} 
                      className="w-full rounded-lg border-border-subtle bg-surface text-text-main text-sm" 
                    />
                  </div>
                  {/* ... Repeat for other inputs ... */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Protein (g)</label>
                    <input 
                      type="number" 
                      value={goalForm.protein} 
                      onChange={e => setGoalForm({...goalForm, protein: +e.target.value})} 
                      className="w-full rounded-lg border-border-subtle bg-surface text-text-main text-sm" 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm mt-2">
                  Save Goals
                </button>
              </form>
            ) : activeGoal ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 flex flex-col justify-center">
                  <span className="text-2xl font-bold text-blue-700 dark:text-blue-400 leading-none">{activeGoal.calories_target}</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-1">Calories</span>
                </div>
                {/* ... Render other goal stats similarly ... */}
              </div>
            ) : (
              <div className="text-center py-8 bg-surface rounded-xl border border-dashed border-border-subtle">
                <p className="text-text-muted text-sm mb-3">No nutritional goals set yet.</p>
                <button 
                  className="text-white bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition"
                  onClick={() => setIsEditingGoal(true)}
                >
                  Set Goals
                </button>
              </div>
            )}
          </section>

          {/* Metrics Section */}
          <section className="bg-card p-5 rounded-xl shadow-sm border border-border-subtle space-y-6">
            <h2 className="text-lg font-semibold text-text-main border-b border-border-subtle pb-3">Body Metrics</h2>
            
            <form onSubmit={addMetric} className="space-y-4 bg-surface p-4 rounded-xl border border-border-subtle">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Type</label>
                  <select 
                    value={metricForm.type} 
                    onChange={e => setMetricForm({...metricForm, type: e.target.value})} 
                    className="block w-full rounded-lg border-border-subtle bg-card text-text-main text-sm py-2"
                  >
                    <option value="weight">Weight</option>
                    <option value="waist">Waist</option>
                    <option value="body_fat">Body Fat %</option>
                  </select>
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Value</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={metricForm.value} 
                    onChange={e => setMetricForm({...metricForm, value: +e.target.value})} 
                    className="block w-full rounded-lg border-border-subtle bg-card text-text-main text-sm py-2" 
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition shadow-sm">
                Add Entry
              </button>
            </form>

            <div className="pt-2">
              <h3 className="font-medium text-sm text-text-muted mb-3 px-1">Weight Trends</h3>
              <div className="relative h-60 w-full bg-card rounded-lg">
                <canvas ref={chartCanvasRef}></canvas>
              </div>
              {weightHistory.length === 0 && (
                <p className="text-center text-text-muted text-xs mt-2 italic">Start logging weight to see trends.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ProfileAndGoals;