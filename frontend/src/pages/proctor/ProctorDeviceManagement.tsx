import React, { useState } from 'react';
import { 
  Laptop, 
  Plus, 
  Trash2, 
  Edit3, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface Device {
  id: string;
  name: string;
  type: 'Laptop' | 'Desktop' | 'Tablet';
  brand: string;
  osVersion: string;
  processor: string;
  ram: string;
  storage: string;
  macAddress: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

const MOCK_DEVICES: Device[] = [
  {
    id: 'D1',
    name: 'MacBook Pro Enterprise',
    type: 'Laptop',
    brand: 'Apple',
    osVersion: 'macOS Sonoma 14.4',
    processor: 'Apple M3 Pro',
    ram: '18GB',
    storage: '512GB SSD',
    macAddress: '00:1A:2B:3C:4D:5E',
    status: 'APPROVED'
  },
  {
    id: 'D2',
    name: 'Dell Precision 3581',
    type: 'Laptop',
    brand: 'Dell',
    osVersion: 'Windows 11 Pro',
    processor: 'Intel Core i7-13700H',
    ram: '32GB',
    storage: '1TB NVMe',
    macAddress: '11:22:33:44:55:66',
    status: 'PENDING'
  }
];

export default function ProctorDeviceManagement() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this device?')) {
      setDevices(devices.filter(d => d.id !== id));
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-philsa-navy text-white text-[10px] font-black uppercase tracking-widest rounded-full">Proctor Assets</div>
            <div className="w-1 h-1 bg-philsa-gray rounded-full"></div>
            <div className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest">Hardware Verification</div>
          </div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tight mb-2">Device Management</h1>
          <p className="text-philsa-gray font-medium max-w-2xl">
            Register and manage the authorized hardware used for proctoring PhilSA examinations. 
            All devices must be verified by System Administration.
          </p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-primary py-3 px-6 flex items-center gap-2 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>Add New Device</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <DeviceCard 
            key={device.id} 
            device={device} 
            onDelete={() => handleDelete(device.id)}
            onEdit={() => setEditingDevice(device)}
          />
        ))}
      </div>

      <AnimatePresence>
        {(isAdding || editingDevice) && (
          <DeviceModal 
            device={editingDevice}
            onClose={() => {
              setIsAdding(false);
              setEditingDevice(null);
            }}
            onSave={(d) => {
              if (editingDevice) {
                setDevices(devices.map(dev => dev.id === d.id ? d : dev));
              } else {
                setDevices([...devices, { ...d, id: `D-${Date.now()}`, status: 'PENDING' }]);
              }
              setIsAdding(false);
              setEditingDevice(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface DeviceCardProps {
  device: Device;
  onDelete: () => void;
  onEdit: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onDelete, onEdit }) => {
  const StatusIcon = device.status === 'APPROVED' ? CheckCircle2 : device.status === 'PENDING' ? Clock : AlertCircle;
  const statusColor = device.status === 'APPROVED' ? 'text-emerald-500' : device.status === 'PENDING' ? 'text-amber-500' : 'text-philsa-red';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-philsa-border rounded-3xl p-8 hover:border-philsa-navy transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-6">
         <div className={cn("flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest", statusColor)}>
            <StatusIcon className="w-4 h-4" />
            {device.status}
         </div>
      </div>

      <div className="mb-8">
        <div className="w-14 h-14 bg-philsa-bg rounded-2xl flex items-center justify-center text-philsa-navy mb-4 group-hover:bg-philsa-navy group-hover:text-white transition-colors">
          {device.type === 'Laptop' ? <Laptop className="w-6 h-6" /> : device.type === 'Tablet' ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
        </div>
        <h3 className="text-xl font-bold text-philsa-navy truncate pr-20">{device.name}</h3>
        <p className="text-xs text-philsa-gray font-bold tracking-widest uppercase mt-1">{device.brand} • {device.type}</p>
      </div>

      <div className="space-y-4">
        <DetailRow label="Operating System" value={device.osVersion} />
        <DetailRow label="Processor" value={device.processor} />
        <DetailRow label="RAM Size" value={device.ram} />
        <DetailRow label="Storage Capacity" value={device.storage} />
        <DetailRow label="MAC Address" value={device.macAddress} />
      </div>

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-philsa-border">
        <button 
          onClick={onEdit}
          className="flex-1 bg-philsa-bg hover:bg-philsa-navy hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 className="w-3 h-3" /> Edit Profile
        </button>
        <button 
          onClick={onDelete}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-philsa-red hover:bg-philsa-red hover:text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-philsa-gray font-medium">{label}</span>
      <span className="text-philsa-navy font-bold">{value}</span>
    </div>
  );
}

function DeviceModal({ device, onClose, onSave }: { device: Device | null, onClose: () => void, onSave: (d: any) => void }) {
  const [formData, setFormData] = useState(device || {
    name: '',
    type: 'Laptop',
    brand: '',
    osVersion: '',
    processor: '',
    ram: '',
    storage: '',
    macAddress: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-philsa-navy/80 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-black text-philsa-navy uppercase tracking-tight">{device ? 'Edit Device' : 'Register New Device'}</h2>
          <p className="text-philsa-gray text-sm mt-1 font-medium">Provide hardware specifications for security clearance.</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Device Display Name</label>
            <input 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              type="text" 
              placeholder="e.g. Workstation-A / Proctor-Laptop-01"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Device Type</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy focus:ring-2 ring-philsa-navy transition-all"
            >
              <option>Laptop</option>
              <option>Desktop</option>
              <option>Tablet</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Hardware Brand</label>
            <input 
              value={formData.brand}
              onChange={e => setFormData({ ...formData, brand: e.target.value })}
              type="text" 
              placeholder="e.g. Dell, Apple, HP"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Operating System Version</label>
            <input 
              value={formData.osVersion}
              onChange={e => setFormData({ ...formData, osVersion: e.target.value })}
              type="text" 
              placeholder="e.g. Windows 11 Pro"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Processor</label>
            <input 
              value={formData.processor}
              onChange={e => setFormData({ ...formData, processor: e.target.value })}
              type="text" 
              placeholder="e.g. M2 Max / Core i9"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">RAM Size</label>
            <input 
              value={formData.ram}
              onChange={e => setFormData({ ...formData, ram: e.target.value })}
              type="text" 
              placeholder="e.g. 16GB"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Storage Capacity</label>
            <input 
              value={formData.storage}
              onChange={e => setFormData({ ...formData, storage: e.target.value })}
              type="text" 
              placeholder="e.g. 512GB SSD"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase text-philsa-gray tracking-widest block mb-1.5">Network MAC Address</label>
            <input 
              value={formData.macAddress}
              onChange={e => setFormData({ ...formData, macAddress: e.target.value })}
              type="text" 
              placeholder="FF:FF:FF:FF:FF:FF"
              className="w-full bg-philsa-bg border-none rounded-2xl px-6 py-3.5 font-bold text-philsa-navy placeholder:text-philsa-gray/50 focus:ring-2 ring-philsa-navy transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-10">
          <button 
            onClick={onClose}
            className="flex-1 bg-philsa-bg text-philsa-navy py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-philsa-border transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-[2] bg-philsa-navy text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-philsa-navy/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {device ? 'Commit Revisions' : 'Submit for Verification'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
