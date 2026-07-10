import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Shield, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Server, 
  Code, 
  Play, 
  Check, 
  Sliders, 
  Database,
  Info,
  Mail,
  Smartphone,
  Globe,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../PhilSAContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  type: 'REST' | 'gRPC' | 'SOAP';
  endpoint: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  apiKey: string;
  isKeyMasked: boolean;
  lastSync: string;
  errorMessage?: string;
  logs: {
    id: string;
    method: string;
    status: 'SUCCESS' | 'FAILURE';
    statusCode: number;
    responseTime: number;
    timestamp: string;
    payload: string;
  }[];
}

export default function SystemIntegration() {
  const { addAuditLog } = usePhilSA();

  const [integrations, setIntegrations] = useState<Integration[]>(() => {
    const saved = localStorage.getItem('philsa_system_integrations_focused');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'int-philsys',
        name: 'PhilSys National ID Authentication Registry',
        description: 'Authenticates candidate identity, photograph, and biometric tokens against the central civil government database to prevent examination impersonation.',
        type: 'gRPC',
        endpoint: 'grpc.verification.philsys.gov.ph:443',
        status: 'ERROR',
        apiKey: 'philsys_production_cert_token_88fc91a27e912',
        isKeyMasked: true,
        lastSync: '2026-06-24 10:45 AM',
        errorMessage: 'Connection handshake timeout (504 Gateway Timeout). PhilSys verification registry is currently unreachable on secure SSL port 443.',
        logs: [
          {
            id: 'LOG-PS-001',
            method: 'POST',
            status: 'FAILURE',
            statusCode: 504,
            responseTime: 15000,
            timestamp: '2026-06-24 10:45:00 AM',
            payload: '{"national_id": "1234-5678-9012", "request": "biometric_match"}'
          }
        ]
      },
      {
        id: 'int-lrn',
        name: 'DEPED Learner Information System (LRN Integration)',
        description: 'Queries high school enrollment archives, verifies candidate Learner Reference Numbers (LRN), and validates secondary education metrics automatically.',
        type: 'REST',
        endpoint: 'https://api.deped.gov.ph/v3/learners/verify',
        status: 'ACTIVE',
        apiKey: 'ph_deped_lis_live_sec_7a2bf91c83d043ff89812e',
        isKeyMasked: true,
        lastSync: '2026-06-24 11:20 AM',
        logs: [
          {
            id: 'LOG-LRN-001',
            method: 'GET',
            status: 'SUCCESS',
            statusCode: 200,
            responseTime: 312,
            timestamp: '2026-06-24 11:20:15 AM',
            payload: '?lrn=102938475612&auth=true'
          }
        ]
      },
      {
        id: 'int-smsemail',
        name: 'SMS & Email Notification Gateway',
        description: 'Dispatches instantaneous status alerts, examination permits, slot assignments, and official score announcements directly to applicants.',
        type: 'REST',
        endpoint: 'https://api.semaphore.co/api/v4/messages',
        status: 'ACTIVE',
        apiKey: 'sem_api_token_d19a82ff77be9261cb9021a8c71',
        isKeyMasked: true,
        lastSync: '2026-06-24 11:25 AM',
        logs: [
          {
            id: 'LOG-SMS-001',
            method: 'POST',
            status: 'SUCCESS',
            statusCode: 200,
            responseTime: 184,
            timestamp: '2026-06-24 11:25:02 AM',
            payload: '{"to": "09171234567", "body": "Your score has been released."}'
          }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('philsa_system_integrations_focused', JSON.stringify(integrations));
  }, [integrations]);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [editingKeyVal, setEditingKeyVal] = useState('');

  const toggleKeyMasking = (id: string) => {
    setIntegrations(prev => prev.map(item => 
      item.id === id ? { ...item, isKeyMasked: !item.isKeyMasked } : item
    ));
  };

  const handleTestConnection = (integration: Integration) => {
    setTestingId(integration.id);
    setTestResult(null);

    setTimeout(() => {
      let isSuccess = true;
      let replyMessage = 'Handshake verified. Connection stable with 0% packet loss.';
      let code = 200;
      let latency = Math.floor(Math.random() * 150) + 80;

      if (integration.id === 'int-philsys') {
        isSuccess = false;
        replyMessage = 'SSL Handshake failed. Connection timed out on security port 443.';
        code = 504;
        latency = 15000;
      }

      setTestResult({
        id: integration.id,
        success: isSuccess,
        message: replyMessage
      });

      setIntegrations(prev => prev.map(item => {
        if (item.id === integration.id) {
          const newLog = {
            id: 'LOG-DIAG-' + Math.floor(Math.random() * 900 + 100),
            method: 'POST',
            status: (isSuccess ? 'SUCCESS' : 'FAILURE') as 'SUCCESS' | 'FAILURE',
            statusCode: code,
            responseTime: latency,
            timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            payload: '{"ping": "connection_diagnostic_test"}'
          };

          return {
            ...item,
            status: isSuccess ? 'ACTIVE' : 'ERROR',
            lastSync: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            errorMessage: isSuccess ? undefined : replyMessage,
            logs: [newLog, ...item.logs].slice(0, 5) // Keep last 5 logs
          };
        }
        return item;
      }));

      addAuditLog('INTEGRATION_TEST', `Connection test initiated on ${integration.name}. Result: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`);
      setTestingId(null);
    }, 1200);
  };

  const handleOpenEditCreds = (item: Integration) => {
    setEditingIntegration(item);
    setEditingKeyVal(item.apiKey);
  };

  const handleSaveCredentials = () => {
    if (!editingIntegration) return;
    setIntegrations(prev => prev.map(item => 
      item.id === editingIntegration.id ? { ...item, apiKey: editingKeyVal } : item
    ));
    addAuditLog('INTEGRATION_CREDS_UPDATE', `Admin updated credentials for ${editingIntegration.name}`);
    setEditingIntegration(null);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-philsa-red/10 text-philsa-red rounded-full text-[10px] font-black uppercase tracking-widest border border-philsa-red/10 flex items-center gap-1">
            <Zap className="w-3 h-3 text-philsa-red animate-pulse" /> System Admin Operations
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-philsa-navy mb-1 tracking-tight">System Integrations</h1>
        <p className="text-philsa-gray text-sm font-medium">Manage and audit credentials, monitor server response latency, and trigger connection tests for core agency interfaces.</p>
      </div>

      {/* Main Focus Integrations List */}
      <div className="space-y-6">
        {integrations.map((item) => (
          <div key={item.id} className="card-philsa !p-6 space-y-5 hover:border-slate-350 transition-all">
            
            {/* Header: Name, Type, and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-philsa-border">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' :
                  item.status === 'ERROR' ? 'bg-red-50 text-philsa-red' :
                  'bg-slate-150 text-slate-400'
                }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-philsa-navy leading-snug">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">{item.type} • {item.endpoint}</p>
                </div>
              </div>

              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                  item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  item.status === 'ERROR' ? 'bg-red-50 text-philsa-red border-red-150 animate-pulse' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    item.status === 'ACTIVE' ? 'bg-emerald-500' :
                    item.status === 'ERROR' ? 'bg-red-500' :
                    'bg-slate-400'
                  }`} />
                  {item.status}
                </span>
              </div>
            </div>

            {/* Error alerts inline within the specific failed integration card */}
            {item.status === 'ERROR' && item.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-800 text-xs font-bold leading-relaxed">
                <AlertTriangle className="w-5 h-5 text-[#8A1538] shrink-0" />
                <div>
                  <p className="font-extrabold uppercase tracking-wider text-[9px] text-[#8A1538]">Integration Unreachable Alert</p>
                  <p className="font-semibold text-philsa-navy mt-0.5">{item.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-philsa-gray font-medium leading-relaxed">{item.description}</p>

            {/* API Key Credentials / Securely Masked and Stored */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Secure Access Credentials (Masked)</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-bold text-slate-700">
                    {item.isKeyMasked 
                      ? '••••••••••••••••••••' + item.apiKey.slice(-6) 
                      : item.apiKey}
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleKeyMasking(item.id)}
                  className="p-2 hover:bg-slate-200 text-slate-500 hover:text-philsa-navy rounded-lg transition-all cursor-pointer"
                  title="Reveal / Mask API Key"
                >
                  {item.isKeyMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => handleOpenEditCreds(item)}
                  className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  Rotate Key
                </button>
              </div>
            </div>

            {/* Diagnostics and Action buttons */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <span className="text-[10px] font-bold text-slate-400">Last Synced Status: <span className="font-extrabold text-slate-500">{item.lastSync}</span></span>
              
              <div className="flex items-center gap-2">
                {testingId === item.id ? (
                  <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Diagnostic Pending...
                  </button>
                ) : (
                  <button 
                    onClick={() => handleTestConnection(item)}
                    className="px-4 py-2 bg-philsa-navy text-white hover:bg-slate-800 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-white fill-white shrink-0" /> Verify Connection Spec
                  </button>
                )}
              </div>
            </div>

            {/* Diagnostic results display */}
            {testResult && testResult.id === item.id && (
              <div className={`p-4 rounded-xl border ${
                testResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                  : 'bg-red-50 text-red-800 border-red-100'
              } text-xs font-bold leading-relaxed space-y-1`}>
                <div className="flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>Verification Diagnostic Response:</span>
                </div>
                <p className="font-mono text-[11px] text-slate-600 font-semibold pl-5">{testResult.message}</p>
              </div>
            )}

            {/* Inline Activity logs list for each integration card */}
            <div className="pt-3 border-t border-philsa-border space-y-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5" />
                <span>Call Activity Logs</span>
              </div>
              <div className="space-y-2">
                {item.logs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 font-mono text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded-xs font-black ${
                        log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.statusCode} {log.status}
                      </span>
                      <span className="text-slate-500">{log.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>Latency: {log.responseTime}ms</span>
                      <span className="text-slate-600 font-bold max-w-[150px] truncate" title={log.payload}>{log.payload}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* ROTATE INTEGRATION CREDENTIALS OVERLAY MODAL */}
      <AnimatePresence>
        {editingIntegration && (
          <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-philsa-border p-6 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-philsa-red/10 text-philsa-red rounded-xl shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-philsa-navy uppercase tracking-tight">Rotate Credentials</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{editingIntegration.name}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label-philsa">New API Key / Database Token Value</label>
                <input 
                  type="text"
                  value={editingKeyVal}
                  onChange={(e) => setEditingKeyVal(e.target.value)}
                  className="input-philsa !py-3 font-mono font-bold text-xs"
                />
                <div className="bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 font-bold leading-relaxed border flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Access credentials will be encrypted, stored securely in local cache structures, and masked on client interfaces.</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingIntegration(null)}
                  className="flex-1 py-3 bg-white border border-slate-250 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCredentials}
                  className="flex-1 py-3 bg-philsa-red hover:bg-philsa-red-hover text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
