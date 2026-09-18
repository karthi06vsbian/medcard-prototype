import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, HeartPulse, Users, CheckCircle, AlertTriangle, Calculator, FileText, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';

export default function Insurance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [applying, setApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  
  // Premium Calculator State
  const [calcAge, setCalcAge] = useState(32);
  const [calcCoverage, setCalcCoverage] = useState(2500000); // 25 Lakhs
  const [calcCriticalAddon, setCalcCriticalAddon] = useState(true);

  const fetchInsuranceData = async () => {
    try {
      const response = await api.get('/api/patient/insurance-agent');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching insurance recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const handleApply = async (plan) => {
    setSelectedPlan(plan);
    setApplying(true);
    try {
      await api.post('/api/patient/insurance-apply', {
        plan_id: plan.id,
        plan_name: plan.name,
        monthly_premium: plan.monthly_premium,
        sum_insured: plan.sum_insured
      });
      setAppliedSuccess(true);
      fetchInsuranceData();
    } catch (error) {
      console.error('Error applying for insurance:', error);
      alert('Failed to process insurance application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // Dynamic premium calculation formula
  const calculatedMonthly = Math.round(
    (calcCoverage / 100000) * 18 + (calcAge > 40 ? (calcAge - 40) * 20 : 0) + (calcCriticalAddon ? 150 : 0)
  );

  return (
    <Layout role="patient">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Title Header */}
        <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-secondary-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
            <Shield size={220} />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-white border border-white/30 mb-3">
              <Sparkles size={14} className="text-yellow-300" />
              AI Insurance Agent Advisor
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Medical Insurance Protection
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Protect your family and financial well-being against unexpected hospital bills, critical illness diagnostics, emergency surgeries, and ICU care.
            </p>
          </div>
        </div>

        {/* AI Symptom & Risk Assessment Card */}
        {loading ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl flex-shrink-0 mt-1">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    AI Health Risk Detection & Advisor Alert
                    <span className="text-xs bg-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded-full">Automated Triage</span>
                  </h3>
                  
                  {data?.hasRecurringSymptoms ? (
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                      Our system analyzed your health history and detected <strong>recurring health symptoms</strong> (e.g. repeated heavy headache, chest discomfort, or persistent pain). Persistent symptoms often indicate underlying health risks that may require MRI scans, specialist consults, or hospitalization.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                      Proactive healthcare planning is essential. Having a comprehensive health insurance policy ensures 100% cashless medical care without draining your savings.
                    </p>
                  )}

                  {data?.recurringList && data.recurringList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs font-semibold text-amber-900 self-center">Detected Logged Symptoms:</span>
                      {data.recurringList.map((item, idx) => (
                        <span key={idx} className="text-xs font-bold bg-white text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                          ⚠️ {item.symptom} {item.count > 1 ? `(${item.count}x)` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Policies Section */}
        {data?.appliedPlans && data.appliedPlans.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-green-900 flex items-center gap-2 mb-4">
              <CheckCircle className="text-green-600" size={22} />
              Your Active Medical Insurance Policies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.appliedPlans.map((policy) => (
                <div key={policy.id} className="bg-white border border-green-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider">{policy.status}</span>
                    <h4 className="font-bold text-darknavy text-base">{policy.plan_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Sum Insured: <strong className="text-slate-700">{policy.sum_insured}</strong></p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-primary-700">₹{policy.monthly_premium}</span>
                    <span className="text-xs text-slate-400 block">/month</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Curated Insurance Plans Grid */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-darknavy">AI Insurance Agent Recommended Plans</h2>
              <p className="text-sm text-slate-500 mt-1">Tailored based on your symptoms, age, and critical illness risk factors</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.plans?.map((plan) => {
              const isApplied = data?.appliedPlans?.some(a => a.plan_id === plan.id || a.plan_name === plan.name);
              const isRecommended = plan.tag.includes('Recommended');

              return (
                <div 
                  key={plan.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-lg ${
                    isRecommended ? 'border-2 border-primary-500 ring-2 ring-primary-100' : 'border-slate-200 hover:border-primary-300'
                  }`}
                >
                  {/* Tag Header */}
                  <div className={`px-4 py-2 text-xs font-bold text-white flex justify-between items-center ${
                    plan.color === 'red' ? 'bg-red-600' : plan.color === 'rose' ? 'bg-rose-600' : 'bg-primary-700'
                  }`}>
                    <span>{plan.tag}</span>
                    <span>Tax Benefit 80D</span>
                  </div>

                  <div className="p-6 space-y-4 flex-1">
                    <div>
                      <h3 className="text-xl font-bold text-darknavy">{plan.name}</h3>
                      <p className="text-xs text-primary-700 font-medium mt-1 bg-primary-50 p-2 rounded-lg border border-primary-100">
                        🎯 {plan.match_reason}
                      </p>
                    </div>

                    <div className="py-2 border-y border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">Sum Insured</span>
                        <span className="text-lg font-extrabold text-darknavy">{plan.sum_insured}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-primary-700">₹{plan.monthly_premium}</span>
                        <span className="text-xs text-slate-400 font-normal"> / month</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {plan.description}
                    </p>

                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-darknavy uppercase tracking-wider">Key Policy Coverage:</p>
                      <ul className="space-y-1.5">
                        {plan.features.map((feat, fIdx) => (
                          <li key={fIdx} className="text-xs text-slate-700 flex items-start gap-2">
                            <CheckCircle size={14} className="text-secondary-500 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100">
                    {isApplied ? (
                      <button disabled className="w-full py-3 bg-green-100 text-green-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-default">
                        <CheckCircle size={18} />
                        Active Policy Issued
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleApply(plan)}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                      >
                        Apply for Instant Policy
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Premium Calculator Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-50 text-primary-700 rounded-xl">
              <Calculator size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-darknavy">Instant Premium Estimator</h3>
              <p className="text-xs text-slate-500">Calculate custom medical insurance premiums based on age and sum insured</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Age Slider */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Your Age: <span className="text-primary-700 text-sm font-extrabold">{calcAge} years</span>
              </label>
              <input 
                type="range" 
                min="18" 
                max="75" 
                value={calcAge} 
                onChange={(e) => setCalcAge(Number(e.target.value))}
                className="w-full accent-primary-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>18 yrs</span>
                <span>75 yrs</span>
              </div>
            </div>

            {/* Sum Insured Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Sum Insured Coverage
              </label>
              <select 
                value={calcCoverage} 
                onChange={(e) => setCalcCoverage(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-darknavy focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value={1000000}>₹10,000,000 (10 Lakhs)</option>
                <option value={2500000}>₹25,000,000 (25 Lakhs)</option>
                <option value={5000000}>₹50,000,000 (50 Lakhs)</option>
                <option value={10000000}>₹100,000,000 (1 Crore)</option>
              </select>
            </div>

            {/* Estimated Output */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
              <span className="text-xs font-semibold text-primary-800 block uppercase">Estimated Monthly Premium</span>
              <span className="text-3xl font-black text-primary-700">₹{calculatedMonthly}</span>
              <span className="text-[10px] text-primary-600 block mt-1">Includes 18% GST & Critical Illness Cover</span>
            </div>
          </div>
        </div>

        {/* Instant Policy Issuance Success Modal */}
        <Modal isOpen={appliedSuccess} onClose={() => setAppliedSuccess(false)} title="🎉 Insurance Policy Issued!">
          <div className="p-4 text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-darknavy">Congratulations!</h3>
            <p className="text-sm text-slate-600">
              Your <strong>{selectedPlan?.name}</strong> policy has been successfully issued. Cashless hospitalization & emergency coverage is now active for your health account.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 space-y-1 text-xs text-slate-700">
              <p><strong>Policy ID:</strong> POL-2026-{Math.floor(100000 + Math.random() * 900000)}</p>
              <p><strong>Sum Insured:</strong> {selectedPlan?.sum_insured}</p>
              <p><strong>Monthly Premium:</strong> ₹{selectedPlan?.monthly_premium}</p>
              <p><strong>Status:</strong> Active Policy (Cashless Ready)</p>
            </div>
            <button
              onClick={() => setAppliedSuccess(false)}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition shadow-md"
            >
              Done & Return to Dashboard
            </button>
          </div>
        </Modal>

      </div>
    </Layout>
  );
}
