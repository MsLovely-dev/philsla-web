import React, { useState } from 'react';
import { 
  Monitor, 
  MapPin, 
  Armchair, 
  Search, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Tag, 
  CheckCircle2, 
  HelpCircle,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMockData } from '../../services/mockService';
import { usePhilSA } from '../../PhilSAContext';
import { StudentDevice } from '../../types';

export default function AdminStudentDeviceManagement() {
  const { user } = usePhilSA();
  const { studentDevices, updateStudentDeviceSeat } = useMockData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<StudentDevice | null>(null);
  const [seatNumber, setSeatNumber] = useState('');

  const isTestingCenterAdmin = user?.role === 'TESTING_CENTER_ADMIN';
  const adminCenter = user?.center || 'UP Diliman';

  // Filter devices: testing center admin should only view student devices registered for their center
  const centerDevices = isTestingCenterAdmin
    ? studentDevices.filter(d => {
        if (!d.center) return false;
        return d.center.toLowerCase().includes(adminCenter.toLowerCase()) || 
               adminCenter.toLowerCase().includes(d.center.toLowerCase());
      })
    : studentDevices;

  const filteredDevices = centerDevices.filter(d => 
    d.pcName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.registeredBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.seatNumber && d.seatNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalRegistered = centerDevices.length;
  const allocatedCount = centerDevices.filter(d => d.seatNumber && d.seatNumber.trim() !== '').length;
  const pendingAllocation = totalRegistered - allocatedCount;

  const handleOpenAllocationModal = (dev: StudentDevice) => {
    setSelectedDevice(dev);
    setSeatNumber(dev.seatNumber || '');
  };

  const handleSaveSeatAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    updateStudentDeviceSeat(selectedDevice.id, seatNumber);
    setSelectedDevice(null);
    setSeatNumber('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-philsa-navy tracking-tight leading-none mb-3">
          Student Device Seat Allocations
        </h1>
        <p className="text-philsa-gray font-medium max-w-2xl">
          {isTestingCenterAdmin 
            ? `Identify, audit, and allocate physically numbered seats to proctor-discovered workstation nodes for ${user?.university || adminCenter}.`
            : 'National registry of all registered classroom PC devices and candidate seat coordinates.'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Registered Workstations', value: String(totalRegistered), color: 'border-slate-200 text-slate-800' },
          { label: 'Seat Assigned Nodes', value: String(allocatedCount), color: 'border-emerald-250 text-emerald-800 bg-emerald-50/50' },
          { label: 'Pending Coordination', value: String(pendingAllocation), color: pendingAllocation > 0 ? 'border-amber-200 text-amber-800 bg-amber-50/50' : 'border-slate-250 text-slate-400' },
        ].map((stat, i) => (
          <div key={i} className={`p-6 bg-white border rounded-xl shadow-sm ${stat.color}`}>
            <p className="text-xs font-black uppercase tracking-wider text-philsa-gray/70">{stat.label}</p>
            <p className="text-3xl font-black mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Primary Control Row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-philsa-gray/70 w-4 h-4" />
          <input
            type="text"
            placeholder="Search workstations by name, MAC, proctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-philsa-border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-philsa-blue text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Grid List or Table of Registered Works */}
      <div className="bg-white rounded-xl border border-philsa-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-philsa-border text-[10px] font-bold text-philsa-gray uppercase tracking-wider">
                <th className="px-6 py-4">Node UID</th>
                <th className="px-6 py-4">PC Identification</th>
                <th className="px-6 py-4">Proctor Author</th>
                {!isTestingCenterAdmin && <th className="px-6 py-4">Testing Center</th>}
                <th className="px-6 py-4">Network Coordinates</th>
                <th className="px-6 py-4">Physical Seat Number</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-philsa-gray">
                    <Monitor className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
                    <p className="font-semibold text-slate-700">No student workstations found</p>
                    <p className="text-xs text-slate-400 mt-1">If filtering, check your keywords or wait for the proctors to register classroom devices.</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-philsa-navy">{dev.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{dev.pcName}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{dev.specs}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{dev.registeredBy}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{dev.registeredAt}</div>
                    </td>
                    {!isTestingCenterAdmin && (
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                        {dev.center}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700 font-medium">{dev.ipAddress}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{dev.macAddress}</div>
                    </td>
                    <td className="px-6 py-4">
                      {dev.seatNumber ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded w-fit text-xs">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          {dev.seatNumber}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold bg-amber-50 border border-amber-250 px-3 py-1 rounded w-fit text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Unallocated
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenAllocationModal(dev)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-philsa-navy hover:text-white rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Assign Seat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seat Allocation Dialog */}
      <AnimatePresence>
        {selectedDevice && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-philsa-red" />
                  Seat Coordination Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Physically assign PC <span className="font-bold text-slate-700">{selectedDevice.pcName}</span> to a room seat arrangement coordinates.
                </p>
              </div>

              <form onSubmit={handleSaveSeatAllocation} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Classroom Seat Number / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Seat A-12, Row 4 Lab 2"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-philsa-border rounded-lg text-sm font-semibold focus:ring-1 focus:ring-philsa-blue text-slate-800"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400">
                    This tag assists safe exam browser matching for the examinee's room slot.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="px-4 py-2 border border-slate-250 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-philsa-navy hover:bg-philsa-navy/95 text-white rounded-lg text-sm font-bold transition-all"
                  >
                    Save Allocation
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
