import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Settings2, 
  Users, 
  Plus, 
  Edit, 
  Lock, 
  Unlock, 
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Monitor,
  X,
  Save,
  Trash2
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../../PhilSAContext';

interface Course {
  id: string;
  name: string;
  applicants: number;
  slots: number;
  available: number;
  status: 'OPEN' | 'CLOSED';
  trend: string;
}

const INITIAL_COURSES: Course[] = [
  { id: 'C1', name: 'BS Computer Science', applicants: 1240, slots: 80, available: 12, status: 'OPEN', trend: '+12%' },
  { id: 'C2', name: 'BS Statistics', applicants: 850, slots: 60, available: 45, status: 'OPEN', trend: '+5%' },
  { id: 'C3', name: 'BS Mathematics', applicants: 420, slots: 40, available: 5, status: 'CLOSED', trend: '0%' },
  { id: 'C4', name: 'BS Civil Engineering', applicants: 2100, slots: 120, available: 0, status: 'CLOSED', trend: '+24%' },
  { id: 'C5', name: 'BA Psychology', applicants: 1560, slots: 100, available: 65, status: 'OPEN', trend: '+8%' },
];

const MOCK_UNIVERSITIES = [
  { id: 'UP', name: 'University of the Philippines', logo: 'UP', color: 'bg-philsa-red', count: 12 },
  { id: 'UST', name: 'University of Santo Tomas', logo: 'UST', color: 'bg-amber-500', count: 8 },
  { id: 'DLSU', name: 'De La Salle University', logo: 'DLSU', color: 'bg-emerald-600', count: 10 },
  { id: 'ADMU', name: 'Ateneo de Manila University', logo: 'ADMU', color: 'bg-blue-600', count: 9 },
  { id: 'PUP', name: 'Polytechnic University of the Philippines', logo: 'PUP', color: 'bg-red-800', count: 15 },
];

export default function ManageCourses() {
  const { user } = usePhilSA();

  const getUnivIdFromUser = () => {
    if (user?.role === 'UNIVERSITY_ADMIN' && user?.university) {
      const matched = MOCK_UNIVERSITIES.find(u => 
        u.name.toLowerCase().includes(user.university!.toLowerCase()) || 
        user.university!.toLowerCase().includes(u.name.toLowerCase()) ||
        user.university!.toLowerCase().includes(u.id.toLowerCase())
      );
      return matched ? matched.id : null;
    }
    return null;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUniv, setSelectedUniv] = useState<string | null>(getUnivIdFromUser());

  useEffect(() => {
    const univId = getUnivIdFromUser();
    if (univId) {
      setSelectedUniv(univId);
    }
  }, [user]);

  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Course>>({
    name: '',
    slots: 0,
    available: 0,
    status: 'OPEN',
    applicants: 0,
    trend: '0%'
  });

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      slots: 0,
      available: 0,
      status: 'OPEN',
      applicants: 0,
      trend: '0%'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData(course);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse) {
      setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...c, ...formData } as Course : c));
    } else {
      const newCourse: Course = {
        ...(formData as Omit<Course, 'id'>),
        id: `C${courses.length + 1}`,
      };
      setCourses(prev => [...prev, newCourse]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this program from the active catalog?')) {
      setCourses(prev => prev.filter(c => c.id !== id));
    }
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedUniv) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tight mb-2">University <span className="text-philsa-red">Catalog</span></h1>
          <p className="text-philsa-gray font-medium">Select a university to manage its active academic programs and course allocations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_UNIVERSITIES.map(univ => (
            <div 
              key={univ.id} 
              onClick={() => setSelectedUniv(univ.id)}
              className="card-philsa !p-8 group cursor-pointer hover:border-philsa-red/30 transition-all hover:shadow-2xl hover:shadow-philsa-navy/10"
            >
              <div className="flex justify-between items-start mb-8">
                <div className={cn("w-16 h-16 rounded-[2rem] flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-110 transition-transform", univ.color)}>
                  {univ.logo}
                </div>
                <div className="w-10 h-10 bg-philsa-bg rounded-full flex items-center justify-center text-philsa-gray group-hover:text-philsa-red transition-colors">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-philsa-navy group-hover:text-philsa-red transition-colors mb-2">{univ.name}</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-philsa-gray uppercase tracking-widest">{univ.count} Active Courses</span>
                <span className="w-1 h-1 bg-philsa-border rounded-full" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verified Program</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          {user?.role !== 'UNIVERSITY_ADMIN' && (
            <button 
              onClick={() => setSelectedUniv(null)}
              className="flex items-center gap-2 text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-4 hover:text-philsa-navy transition-colors cursor-pointer"
            >
              ← Back to Universities
            </button>
          )}
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">
            {MOCK_UNIVERSITIES.find(u => u.id === selectedUniv)?.name}
          </h1>
          <p className="text-philsa-gray text-sm font-medium">Configure program availability, admission slots, and application pipelines.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-philsa-red text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-philsa-red/20 hover:bg-philsa-red/90 transition-all flex items-center gap-2 cursor-pointer"
        >
           <Plus className="w-5 h-5" /> Define New Course
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {courses.slice(0, 3).map(course => (
          <div key={course.id} className="card-philsa p-6 group cursor-pointer hover:border-philsa-red/30 transition-all">
             <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-philsa-bg rounded-xl flex items-center justify-center border border-philsa-border group-hover:bg-philsa-red group-hover:border-philsa-red transition-all">
                   <CheckCircle2 className="w-6 h-6 text-philsa-navy group-hover:text-white" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest leading-none mb-1">Growth</p>
                   <p className="text-sm font-black text-green-600">{course.trend}</p>
                </div>
             </div>
             <h3 className="text-lg font-extrabold text-philsa-navy mb-1 tracking-tight group-hover:text-philsa-red transition-colors">{course.name}</h3>
             <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest mb-6">Course ID: {course.id}</p>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-philsa-bg rounded-xl border border-philsa-border">
                   <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Total Slots</p>
                   <p className="text-lg font-black text-philsa-navy">{course.slots}</p>
                </div>
                <div className="p-3 bg-philsa-bg rounded-xl border border-philsa-border">
                   <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Applicants</p>
                   <p className="text-lg font-black text-philsa-red">{course.applicants}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between">
           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search programs..." 
                className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-2">
             <Settings2 className="w-4 h-4" /> Global Settings
           </button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Program Name</th>
              <th className="px-8 py-5">Applicant Pool</th>
              <th className="px-8 py-5">Slot Status</th>
              <th className="px-8 py-5">Enrollment Status</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-philsa-border">
            {filteredCourses.map((course) => (
              <tr key={course.id} className="hover:bg-philsa-bg/40 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-philsa-navy/5 flex items-center justify-center font-black text-xs text-philsa-navy">
                      {course.id}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-philsa-navy">{course.name}</p>
                      <p className="text-[10px] text-philsa-gray font-bold tracking-wider uppercase">National Program</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-philsa-gray" />
                    <span className="text-sm font-bold text-philsa-navy">{course.applicants.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[100px] h-1.5 bg-philsa-bg rounded-full overflow-hidden">
                         <div 
                          className={`h-full rounded-full ${course.available === 0 ? 'bg-red-500' : 'bg-philsa-red'}`} 
                          style={{ width: `${(course.available/course.slots) * 100}%` }} 
                        />
                      </div>
                      <p className="text-xs font-bold text-philsa-navy">{course.available}/{course.slots}</p>
                   </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full tracking-widest inline-flex items-center gap-1.5 border ${
                    course.status === 'OPEN' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {course.status === 'OPEN' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {course.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                   <div className="flex justify-end gap-2 text-philsa-navy">
                      <button 
                        onClick={() => handleOpenEditModal(course)}
                        className="p-2 hover:bg-philsa-red hover:text-white rounded-lg transition-all border border-philsa-border shadow-sm cursor-pointer"
                        title="Edit Course"
                      >
                         <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course.id)}
                        className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-philsa-border shadow-sm cursor-pointer"
                        title="Delete Course"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-philsa-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] border border-philsa-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-philsa-border flex items-center justify-between bg-philsa-bg/50">
                <div>
                  <h2 className="text-2xl font-black text-philsa-navy tracking-tight uppercase">
                    {editingCourse ? 'Update Program Details' : 'Configure New Program'}
                  </h2>
                  <p className="text-xs font-bold text-philsa-gray uppercase tracking-widest mt-1">
                    {editingCourse ? `Modifying ${editingCourse.id}` : 'Define academic capacity and status'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-philsa-navy/5 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-philsa-gray" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.15em] ml-1">Program Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-philsa-bg border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-philsa-red/5 outline-none transition-all shadow-inner border border-philsa-border/50"
                      placeholder="e.g., BS Computer Science"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.15em] ml-1">Total Slots</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full bg-philsa-bg border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-philsa-red/5 outline-none transition-all shadow-inner border border-philsa-border/50"
                        value={formData.slots || 0}
                        onChange={e => setFormData({ ...formData, slots: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.15em] ml-1">Available Slots</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        max={formData.slots}
                        className="w-full bg-philsa-bg border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-philsa-red/5 outline-none transition-all shadow-inner border border-philsa-border/50"
                        value={formData.available || 0}
                        onChange={e => setFormData({ ...formData, available: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.15em] ml-1">Enrollment Status</label>
                    <select 
                      className="w-full bg-philsa-bg border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-philsa-red/5 outline-none transition-all shadow-inner border border-philsa-border/50 appearance-none"
                      value={formData.status || 'OPEN'}
                      onChange={e => setFormData({ ...formData, status: e.target.value as 'OPEN' | 'CLOSED' })}
                    >
                      <option value="OPEN">OPEN / ACCEPTING APPLICATIONS</option>
                      <option value="CLOSED">CLOSED / CAPACITY REACHED</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-white border border-philsa-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-philsa-gray hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-philsa-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-philsa-navy/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> {editingCourse ? 'Save Configuration' : 'Establish Program'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

