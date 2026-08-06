import React from 'react';
import { 
  Users, 
  ClipboardCheck,
  FileText,
  HelpCircle,
  CheckSquare,
  Award,
  Settings,
  ChevronRight,
  CheckCircle2,
  ShieldAlert,
  School,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

import { usePhilSA } from '../../../PhilSAContext';

const MAINTENANCE_MODULES = [
  {
    id: 'registration',
    title: 'Student Registration',
    description: 'Manage candidate types, ID requirements, tracks, and locations.',
    icon: Users,
    href: '/admin/maintenance/registration',
    stats: '15 Active Tables',
    allowedRoles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']
  },
  {
    id: 'schools',
    title: 'List of Schools',
    description: 'Directory and management of accredited secondary schools and examination testing venue partners.',
    icon: School,
    href: '/admin/maintenance/schools',
    stats: 'Nationwide Directory',
    allowedRoles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']
  },
  {
    id: 'universities',
    title: 'List of Universities',
    description: 'Registry of Higher Education Institutions (HEIs) and their offered College Courses & Degree Programs.',
    icon: GraduationCap,
    href: '/admin/maintenance/universities',
    stats: 'Interactive Courses',
    allowedRoles: ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']
  },
  {
    id: 'exam-blueprint',
    title: 'Exam Blueprint',
    description: 'Lookup tables for subject areas, question types, and topics.',
    icon: FileText,
    href: '/admin/maintenance/exam-blueprint',
    stats: '3 Lookup Tables',
    allowedRoles: ['SYSTEM_ADMIN', 'ITEM_WRITER', 'ACADEMIC_REVIEWER', 'EXAM_ADMINISTRATOR']
  }
];

export default function MaintenanceHub() {
  const { user } = usePhilSA();
  
  const filteredModules = MAINTENANCE_MODULES.filter(m => 
    !user || m.allowedRoles.includes(user.role)
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-philsa-navy text-white text-[10px] font-black uppercase tracking-widest rounded-full">System Configuration</div>
            <div className="w-1 h-1 bg-philsa-gray rounded-full"></div>
            <div className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">v2.4.0-Enterprise</div>
          </div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tight mb-2">Maintenance Command Center</h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
            Centralized orchestration of the philSA Ecosystem business rules, lookup tables, and administrative protocols.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">Global System Health</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-sm font-bold text-philsa-navy italic tracking-tight">Sync Status: Optimal</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module, i) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link 
              to={module.href}
              className="group block bg-white border border-philsa-border rounded-3xl p-8 hover:border-philsa-navy transition-all hover:shadow-2xl hover:shadow-philsa-navy/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-philsa-bg -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-500 opacity-50"></div>
              
              <div className="relative">
                <div className="w-14 h-14 bg-philsa-bg rounded-2xl flex items-center justify-center mb-6 group-hover:bg-philsa-navy group-hover:text-white transition-colors">
                  <module.icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-bold text-philsa-navy mb-2 group-hover:translate-x-1 transition-transform">
                  {module.title}
                </h3>
                <p className="text-sm text-philsa-gray font-medium leading-relaxed mb-6">
                  {module.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-philsa-border/50">
                   <span className="text-[10px] font-black uppercase text-philsa-gray tracking-widest">
                     {module.stats}
                   </span>
                   <ChevronRight className="w-4 h-4 text-philsa-gray group-hover:text-philsa-navy group-hover:translate-x-2 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 bg-philsa-navy rounded-3xl p-10 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-12 opacity-10">
            <ShieldAlert className="w-64 h-64" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Enterprise Governance Rules</h2>
            <p className="text-blue-100 text-sm leading-loose mb-8">
               All changes within these maintenance modules are subject to multi-stage approval. Authorized revisions will propagate instantly across the Ecosystem following University and National Audit approval.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Consistency Index</p>
                    <p className="text-sm font-bold">99.98% Synchronized</p>
                  </div>
               </div>
               <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 flex items-center gap-4">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Active Audit Logs</p>
                    <p className="text-sm font-bold">Encrypted & Immutable</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}


