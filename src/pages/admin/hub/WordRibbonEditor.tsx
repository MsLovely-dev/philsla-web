import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  List, 
  ListOrdered, 
  Table as TableIcon,
  Image as ImageIcon,
  Calculator,
  Type,
  Check,
  RefreshCw,
  Info,
  Sliders,
  Sparkles,
  Quote,
  Link as LinkIcon,
  Code,
  MoreHorizontal,
  PaintBucket,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface WordRibbonEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  title?: string;
  key?: string;
}

export default function WordRibbonEditor({ initialValue, onChange, title = "Untitled Document" }: WordRibbonEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Selection states
  const [fontFamily, setFontFamily] = useState('Arial');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    ul: false,
    ol: false
  });

  // Metrics
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Initialize content on mount or remount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue || '<p>Start typing your space curriculum content here...</p>';
      calculateMetrics();
    }
  }, []);

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      calculateMetrics();
      checkActiveFormats();
    }
  };

  const calculateMetrics = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
  };

  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList')
    });
  };

  // Run formatting commands using document.execCommand
  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleEditorInput();
    
    // Maintain focus on the editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleAddTable = () => {
    const tableHTML = `
      <table class="w-full border-collapse border border-slate-300 my-4 text-xs">
        <thead>
          <tr class="bg-slate-100 font-bold">
            <th class="border border-slate-300 p-2 text-left">Orbital Mission Property</th>
            <th class="border border-slate-300 p-2 text-left">Specification Values</th>
            <th class="border border-slate-300 p-2 text-left">Status Indicator</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-300 p-2 font-medium">Orbital Altitude (km)</td>
            <td class="border border-slate-300 p-2">613 km SSO</td>
            <td class="border border-slate-300 p-2 text-emerald-600 font-bold">NOMINAL</td>
          </tr>
          <tr>
            <td class="border border-slate-300 p-2 font-medium">Inclination Angle</td>
            <td class="border border-slate-300 p-2">97.8 degrees</td>
            <td class="border border-slate-300 p-2 text-emerald-600 font-bold">NOMINAL</td>
          </tr>
        </tbody>
      </table>
    `;
    execCommand('insertHTML', tableHTML);
  };

  const handleAddEquation = (type: 'KEPLER' | 'NDVI' | 'RESOLUTION') => {
    let eqHTML = '';
    if (type === 'KEPLER') {
      eqHTML = `
        <div class="my-4 p-4 border border-blue-200 bg-blue-50/50 rounded-xl font-mono text-xs relative" contenteditable="false">
          <div class="absolute right-3 top-3 text-[9px] font-black uppercase text-blue-600 tracking-widest">Kepler's Third Law</div>
          <p class="font-bold text-blue-900 mb-1">Orbital Period Formula:</p>
          <pre class="bg-white p-2 rounded border border-blue-100 font-black text-center text-blue-900 text-sm">T² = (4π² / GM) * a³</pre>
          <p class="text-[10px] text-blue-700 mt-1">Where GM is the Earth standard gravitational parameter (~3.986e14 m³/s²) and a is semi-major axis.</p>
        </div>
      `;
    } else if (type === 'NDVI') {
      eqHTML = `
        <div class="my-4 p-4 border border-emerald-200 bg-emerald-50/50 rounded-xl font-mono text-xs relative" contenteditable="false">
          <div class="absolute right-3 top-3 text-[9px] font-black uppercase text-emerald-600 tracking-widest">Spectral Indices</div>
          <p class="font-bold text-emerald-900 mb-1">Normalized Difference Vegetation Index (NDVI):</p>
          <pre class="bg-white p-2 rounded border border-emerald-100 font-black text-center text-emerald-900 text-sm">NDVI = (NIR - RED) / (NIR + RED)</pre>
          <p class="text-[10px] text-emerald-700 mt-1">Analyzes agricultural density and chlorophyll absorption peaks via satellite telemetry.</p>
        </div>
      `;
    } else {
      eqHTML = `
        <div class="my-4 p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl font-mono text-xs relative" contenteditable="false">
          <div class="absolute right-3 top-3 text-[9px] font-black uppercase text-indigo-600 tracking-widest">Spatial Resolution</div>
          <p class="font-bold text-indigo-900 mb-1">Ground Sampling Distance (GSD):</p>
          <pre class="bg-white p-2 rounded border border-indigo-100 font-black text-center text-indigo-900 text-sm">GSD = (p * H) / f</pre>
          <p class="text-[10px] text-indigo-700 mt-1">Where p is pixel size, H is spacecraft altitude, and f is focal length of remote camera.</p>
        </div>
      `;
    }
    execCommand('insertHTML', eqHTML);
  };

  const handleAddPlaceholderImage = () => {
    const imgHTML = `
      <div class="my-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center text-slate-500" contenteditable="false">
        <div class="flex justify-center mb-2"><span class="p-3 bg-white rounded-full shadow-xs border border-slate-200 text-philsa-red inline-block"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg></span></div>
        <p class="font-extrabold text-xs text-philsa-navy uppercase tracking-wider">Supplemental Satellite Telemetry Graphic Payload</p>
        <p class="text-[10px] text-philsa-gray max-w-sm mx-auto mt-1">This slot simulates a high-resolution orbital reflectance chart automatically loaded into the examinee's terminal page during active test execution.</p>
        <div class="mt-2 text-[9px] font-mono text-philsa-red bg-red-50 py-1 px-3 rounded inline-block">Figure ID: DIA-REF-2026</div>
      </div>
    `;
    execCommand('insertHTML', imgHTML);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-md flex flex-col">
      {/* Sleek Elegant rich-text toolbar as specified in the reference image */}
      <div className="flex items-center flex-wrap gap-1 px-4 py-2 bg-slate-50 border-b border-slate-200 select-none text-slate-600">
        
        {/* Bold */}
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className={cn(
            "p-2 rounded transition-all cursor-pointer flex items-center justify-center",
            activeFormats.bold 
              ? "bg-slate-200 text-slate-900 font-bold" 
              : "hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4 text-slate-700" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className={cn(
            "p-2 rounded transition-all cursor-pointer flex items-center justify-center",
            activeFormats.italic 
              ? "bg-slate-200 text-slate-900" 
              : "hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4 text-slate-700" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className={cn(
            "p-2 rounded transition-all cursor-pointer flex items-center justify-center",
            activeFormats.underline 
              ? "bg-slate-200 text-slate-900" 
              : "hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4 text-slate-700" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          className={cn(
            "p-2 rounded transition-all cursor-pointer flex items-center justify-center",
            activeFormats.strikethrough 
              ? "bg-slate-200 text-slate-900" 
              : "hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4 text-slate-700" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1.5 self-center" />

        {/* Unordered List */}
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className={cn(
            "p-2 rounded transition-all cursor-pointer flex items-center justify-center",
            activeFormats.ul 
              ? "bg-slate-200 text-slate-900" 
              : "hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4 text-slate-700" />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className={cn(
            "p-2 rounded transition-all cursor-pointer flex items-center justify-center",
            activeFormats.ol 
              ? "bg-slate-200 text-slate-900" 
              : "hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4 text-slate-700" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1.5 self-center" />

        {/* Highlight Shading Menu */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => execCommand('backColor', '#fef08a')}
            className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex items-center justify-center gap-0.5"
            title="Text Shading Highlight"
          >
            <PaintBucket className="w-4 h-4 text-slate-700" />
          </button>
          <div className="absolute left-0 mt-1 hidden group-hover:flex bg-white shadow-xl border border-slate-200 rounded-lg p-2 z-50 gap-1.5">
            <button type="button" onClick={() => execCommand('backColor', '#fef08a')} className="w-5 h-5 bg-yellow-200 rounded hover:scale-115 transition-transform" title="Yellow" />
            <button type="button" onClick={() => execCommand('backColor', '#bbf7d0')} className="w-5 h-5 bg-emerald-200 rounded hover:scale-115 transition-transform" title="Green" />
            <button type="button" onClick={() => execCommand('backColor', '#bfdbfe')} className="w-5 h-5 bg-blue-200 rounded hover:scale-115 transition-transform" title="Blue" />
            <button type="button" onClick={() => execCommand('backColor', '#fecdd3')} className="w-5 h-5 bg-rose-200 rounded hover:scale-115 transition-transform" title="Rose" />
            <button type="button" onClick={() => execCommand('backColor', 'transparent')} className="w-5 h-5 border border-slate-300 rounded text-[9px] font-bold flex items-center justify-center text-slate-500 hover:bg-slate-100" title="None">✖</button>
          </div>
        </div>

        {/* Text Color A-under-bar */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => execCommand('foreColor', '#e11d48')}
            className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex flex-col items-center justify-center relative min-w-[32px] h-[32px]"
            title="Text Color"
          >
            <span className="font-extrabold text-xs text-slate-800 leading-none">A</span>
            <span className="w-3.5 h-0.5 bg-rose-600 mt-0.5" />
          </button>
          <div className="absolute left-0 mt-1 hidden group-hover:flex bg-white shadow-xl border border-slate-200 rounded-lg p-2 z-50 gap-1.5">
            <button type="button" onClick={() => execCommand('foreColor', '#e11d48')} className="w-5 h-5 bg-rose-600 rounded hover:scale-115" title="Red" />
            <button type="button" onClick={() => execCommand('foreColor', '#2563eb')} className="w-5 h-5 bg-blue-600 rounded hover:scale-115" title="Blue" />
            <button type="button" onClick={() => execCommand('foreColor', '#059669')} className="w-5 h-5 bg-emerald-600 rounded hover:scale-115" title="Green" />
            <button type="button" onClick={() => execCommand('foreColor', '#0f172a')} className="w-5 h-5 bg-slate-900 rounded hover:scale-115" title="Black" />
          </div>
        </div>

        {/* Case/Size (A A icon) */}
        <div className="relative group">
          <button
            type="button"
            className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex items-center justify-center gap-0.5 min-w-[36px] h-[32px]"
            title="Font Size & Style"
          >
            <span className="font-sans text-xs font-black text-slate-800 leading-none">A</span>
            <span className="font-sans text-[10px] font-bold text-slate-600 leading-none">A</span>
          </button>
          <div className="absolute left-0 mt-1 hidden group-hover:flex flex-col bg-white shadow-xl border border-slate-200 rounded-lg p-1.5 z-50 gap-1 min-w-[100px]">
            <button type="button" onClick={() => execCommand('fontSize', '2')} className="text-[10px] text-left px-2 py-1 hover:bg-slate-50 rounded font-semibold text-slate-700">Small Text</button>
            <button type="button" onClick={() => execCommand('fontSize', '3')} className="text-xs text-left px-2 py-1 hover:bg-slate-50 rounded font-bold text-slate-800">Normal</button>
            <button type="button" onClick={() => execCommand('fontSize', '4')} className="text-sm text-left px-2 py-1 hover:bg-slate-50 rounded font-extrabold text-slate-950">Large Header</button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1.5 self-center" />

        {/* Blockquote Quote icon */}
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<blockquote>')}
          className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex items-center justify-center"
          title="Blockquote Quote"
        >
          <Quote className="w-4 h-4 text-slate-700" />
        </button>

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter link URL:');
            if (url) execCommand('createLink', url);
          }}
          className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex items-center justify-center"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4 text-slate-700" />
        </button>

        {/* Code block */}
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<pre>')}
          className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex items-center justify-center"
          title="Code Block"
        >
          <Code className="w-4 h-4 text-slate-700" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1.5 self-center" />

        {/* More Actions / Custom Aero components */}
        <div className="relative group ml-auto">
          <button
            type="button"
            className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded transition-all flex items-center justify-center"
            title="Advanced Aerospace Layouts & Figures"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-700" />
          </button>
          <div className="absolute right-0 mt-1 hidden group-hover:flex flex-col bg-white shadow-2xl border border-slate-200 rounded-xl p-2.5 z-50 gap-1.5 min-w-[220px]">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-2 py-0.5">Custom Aerospace Blocks</p>
            
            <button
              type="button"
              onClick={handleAddTable}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-xs text-slate-700 font-bold flex items-center gap-2 rounded-lg"
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Insert Orbital Specs Table</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddEquation('KEPLER')}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-xs text-slate-700 font-bold flex items-center gap-2 rounded-lg"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>Insert Kepler Formula Box</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddEquation('NDVI')}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-xs text-slate-700 font-bold flex items-center gap-2 rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span>Insert NDVI Vegetation Formula</span>
            </button>

            <button
              type="button"
              onClick={handleAddPlaceholderImage}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-xs text-slate-700 font-bold flex items-center gap-2 rounded-lg"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Insert Telemetry Graphics Box</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Compact Sheets Style Workspace Area */}
      <div className="bg-slate-50 p-4 min-h-[250px] relative">
        <div className="bg-white border border-slate-200 rounded-lg p-5 min-h-[220px] focus-within:ring-2 focus-within:ring-slate-200 transition-all shadow-xs">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            onKeyUp={checkActiveFormats}
            onMouseUp={checkActiveFormats}
            className="focus:outline-none min-h-[180px] text-xs text-slate-800 leading-relaxed font-sans prose prose-sm max-w-none prose-slate"
            style={{ fontFamily: fontFamily }}
            placeholder="Type your stimulus document here..."
          />
        </div>
      </div>

      {/* Bottom stats ribbon */}
      <div className="bg-slate-100 border-t border-slate-200 px-4 py-1.5 flex justify-between items-center text-[10px] font-semibold text-slate-500 select-none">
        <div className="flex gap-4 items-center">
          <span>{wordCount} WORDS</span>
          <span>{charCount} CHARACTERS</span>
        </div>
        <div className="flex gap-2 items-center text-[9px] font-black uppercase text-slate-400">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Active Rich Workspace (Edits synced instantly)</span>
        </div>
      </div>
    </div>
  );
}
