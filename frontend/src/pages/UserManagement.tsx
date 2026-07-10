import { useState } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { Users, UserPlus, Shield, Edit2, Trash2, Search, Filter, Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface Permission {
  read: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserConfig {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Record<string, Permission>;
}

export default function UserManagement() {
  const { addAuditLog } = usePhilSA();
  const [users, setUsers] = useState<UserConfig[]>([
    { 
      id: '1', 
      name: 'Dr. Maria Elena Soriano', 
      email: 'm.soriano@ched.gov.ph', 
      role: 'UNIVERSITY_ADMIN',
      permissions: {
        'admissions': { read: true, edit: true, delete: false },
        'exams': { read: true, edit: true, delete: true },
        'results': { read: true, edit: false, delete: false }
      }
    },
    { 
      id: '2', 
      name: 'Juan P. Pangilinan', 
      email: 'juan.p@philsa.ph', 
      role: 'SYSTEM_ADMIN',
      permissions: {
        'all': { read: true, edit: true, delete: true }
      }
    }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserConfig | null>(null);

  const availableModules = ['Admissions', 'Question Bank', 'Exam Delivery', 'Grading', 'Results & Analytics', 'System Settings'];
  const roles: UserRole[] = ['ADMISSIONS_REVIEWER', 'ITEM_WRITER', 'UNIVERSITY_ADMIN', 'GRADER', 'PROCTOR', 'SYSTEM_ADMIN', 'EXECUTIVE'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">User & Role Settings</h1>
          <p className="text-philsa-gray">Manage admin access and set module permissions.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-philsa-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input 
              type="text" 
              placeholder="Search by name, email, or role..." 
              className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10"
            />
          </div>
          <div className="flex items-center gap-3">
             <button className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter Roles
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-widest">
                <th className="px-8 py-5">User Name</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Module Access</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-philsa-bg/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-philsa-navy/5 rounded-full flex items-center justify-center font-bold text-philsa-navy text-xs">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-philsa-navy">{u.name}</p>
                        <p className="text-xs text-philsa-gray">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-philsa-bg border border-philsa-border rounded-lg w-fit">
                      <Shield className="w-3 h-3 text-philsa-red" />
                      <span className="text-[10px] font-bold text-philsa-navy uppercase tracking-wider">{u.role.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {Object.keys(u.permissions).map(mod => (
                        <span key={mod} className="text-[9px] font-bold bg-white border border-philsa-border text-philsa-gray px-2 py-0.5 rounded uppercase">
                          {mod}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => setSelectedUser(u)} className="p-2 text-philsa-gray hover:text-philsa-navy hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-philsa-gray hover:text-philsa-red hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning / Edit Modal */}
      {(isAdding || selectedUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
               <div>
                <h2 className="text-2xl font-extrabold text-philsa-navy">{isAdding ? 'Add New Account' : 'Edit User Account'}</h2>
                <p className="text-philsa-gray text-sm">Assign roles and permissions for {selectedUser?.name || 'the new user'}.</p>
              </div>
              <button 
                onClick={() => { setIsAdding(false); setSelectedUser(null); }}
                className="p-2 hover:bg-white rounded-full text-philsa-gray transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4">Identification</h3>
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Full Name</label>
                           <input type="text" className="input-philsa" defaultValue={selectedUser?.name} placeholder="e.g. Maria Clara" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Organization Email</label>
                           <input type="email" className="input-philsa" defaultValue={selectedUser?.email} placeholder="name@agency.gov.ph" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Role</label>
                           <select className="input-philsa" defaultValue={selectedUser?.role}>
                              {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4">Modular Permissions</h3>
                     <div className="bg-philsa-bg rounded-2xl border border-philsa-border p-6 space-y-4">
                        {availableModules.map((mod) => (
                          <div key={mod} className="flex items-center justify-between pb-3 border-b border-philsa-border/50 last:border-0 last:pb-0">
                             <span className="text-xs font-bold text-philsa-navy">{mod}</span>
                             <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-philsa-gray uppercase">
                                   <input type="checkbox" className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red" defaultChecked /> R
                                </label>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-philsa-gray uppercase">
                                   <input type="checkbox" className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red" /> W
                                </label>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-philsa-gray uppercase">
                                   <input type="checkbox" className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red" /> D
                                </label>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-philsa-border bg-philsa-bg/30 flex justify-end gap-4">
              <button onClick={() => { setIsAdding(false); setSelectedUser(null); }} className="btn-secondary px-8">Discard</button>
              <button 
                onClick={() => {
                  addAuditLog('USER_PROVISIONING', `Modified permissions for ${selectedUser?.email || 'new user'}`);
                  setIsAdding(false); 
                  setSelectedUser(null);
                }} 
                className="btn-primary px-12 flex items-center gap-2"
              >
                <Check className="w-5 h-5" /> {isAdding ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
