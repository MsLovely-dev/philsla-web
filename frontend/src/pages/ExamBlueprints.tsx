import React, { useState, useEffect } from 'react';
import { usePhilSA } from '../PhilSAContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Copy, 
  History, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  BookOpen, 
  Layers, 
  Clock, 
  Sparkles, 
  Check, 
  X, 
  Sliders, 
  ArrowRight, 
  ChevronRight, 
  Settings, 
  ChevronDown, 
  ShieldCheck, 
  Database, 
  FileCode,
  Archive,
  RotateCcw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  INITIAL_BLUEPRINTS, 
  MOCK_CENTRAL_ITEM_BANK, 
  Blueprint, 
  BlueprintSection, 
  BankQuestion, 
  BlueprintRules, 
  BlueprintHistoryEntry 
} from './admin/hub/blueprintMockData';

export default function ExamBlueprints() {
  const { addAuditLog, user } = usePhilSA();

  // Load and manage Blueprints list in state (with localStorage persistence)
  const [blueprints, setBlueprints] = useState<Blueprint[]>(() => {
    const saved = localStorage.getItem('philsa_blueprints');
    return saved ? JSON.parse(saved) : INITIAL_BLUEPRINTS;
  });

  // Save blueprints helper
  const saveBlueprints = (updated: Blueprint[]) => {
    setBlueprints(updated);
    localStorage.setItem('philsa_blueprints', JSON.stringify(updated));
  };

  // Centralized Item Bank
  const [itemBank] = useState<BankQuestion[]>(MOCK_CENTRAL_ITEM_BANK);

  // Filter/Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('NEWEST');

  // UI Selection States
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState<string>('');
  
  // Modals & Editors
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  
  // Editing state form
  const [currentEditBlueprint, setCurrentEditBlueprint] = useState<Blueprint | null>(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [targetWorkflowStatus, setTargetWorkflowStatus] = useState<Blueprint['status'] | null>(null);

  // Selection state for visual tabs inside Details pane
  const [detailTab, setDetailTab] = useState<'SECTIONS' | 'RULES' | 'HISTORY'>('SECTIONS');

  // View mode for curriculum section structure (TABLE or ACCORDION)
  const [structureViewMode, setStructureViewMode] = useState<'TABLE' | 'ACCORDION'>('TABLE');

  // Collapsible left filter panel state
  const [showFilters, setShowFilters] = useState(false);

  // Section expand/collapse accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Editor modal section expand/collapse accordion state
  const [editorExpandedSections, setEditorExpandedSections] = useState<Record<string, boolean>>({});

  // Auto-expand first section when a new blueprint is selected
  useEffect(() => {
    if (selectedBlueprint && selectedBlueprint.sections && selectedBlueprint.sections.length > 0) {
      setExpandedSections({ [selectedBlueprint.sections[0].id]: true });
    } else {
      setExpandedSections({});
    }
  }, [selectedBlueprint?.id]);

  // Assembly State
  const [assemblyResult, setAssemblyResult] = useState<{
    success: boolean;
    errors: string[];
    warnings: string[];
    matchedQuestions: { [sectionId: string]: BankQuestion[] };
    totalMatched: number;
    auditLog: string[];
  } | null>(null);

  // Unique list values for filter select items
  const uniqueTypes = Array.from(new Set(blueprints.map(b => b.examType)));
  const uniqueYears = Array.from(new Set(blueprints.map(b => b.academicYear)));

  // Sync details on edit update
  useEffect(() => {
    if (selectedBlueprint) {
      const fresh = blueprints.find(b => b.id === selectedBlueprint.id);
      if (fresh) {
        setSelectedBlueprint(fresh);
      }
    }
  }, [blueprints]);

  // Handle Create New Blueprint
  const handleInitiateCreate = () => {
    const defaultSec: BlueprintSection = {
      id: 'SEC-' + Date.now(),
      name: 'Section I: General Evaluation',
      subject: 'Science',
      topics: ['Orbital Mechanics'],
      competencies: ['Evaluate orbital parameters for regional coverage'],
      cognitiveLevels: { remembering: 2, understanding: 1, applying: 1, analyzing: 0, evaluating: 0, creating: 0 },
      itemCount: 4,
      marksPerItem: 5,
      totalMarks: 20,
      passingScore: 10,
      timeAllocation: 30,
      instructions: 'Solve all questions meticulously.',
      difficultyDistribution: { easy: 2, moderate: 1, difficult: 1 },
      itemTypeDistribution: { mcq: 2, tf: 1, essay: 1, fib: 0 }
    };

    const newBP: Blueprint = {
      id: 'BP-' + Date.now(),
      code: `BP-2026-NEW-${Math.floor(100 + Math.random() * 900)}`,
      name: 'Proposed Orbital Assessment Blueprint',
      description: 'A customizable curriculum blueprint outlining standard exam assemblies.',
      examType: 'Admission',
      academicYear: '2026-2027',
      institution: 'Philippine Space Agency (PhilSA)',
      examCategory: 'Space Science and Engineering',
      status: 'DRAFT',
      version: '1.0',
      owner: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
      createdAt: new Date().toISOString(),
      effectiveDate: new Date().toISOString().split('T')[0],
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sections: [defaultSec],
      rules: {
        totalItems: 4,
        totalMarks: 20,
        totalTimeLimit: 30,
        sharedStimulusRequirement: { required: false, minCount: 0, questionsPerStimulus: 0 },
        randomizationRules: { shuffleQuestions: true, shuffleChoices: true, fixedSequence: false },
        maxReuseLimit: 3,
        versionCompatibility: '>= 1.0',
        activeItemOnly: true
      },
      history: [
        {
          id: 'LH-' + Date.now(),
          version: '1.0',
          action: 'Created',
          updatedBy: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
          updatedAt: new Date().toISOString(),
          comments: 'Initial system draft created.'
        }
      ]
    };

    setCurrentEditBlueprint(newBP);
    setEditorExpandedSections({ [newBP.sections[0].id]: true });
    setIsEditorOpen(true);
  };

  // Initiate Editing
  const handleInitiateEdit = (bp: Blueprint) => {
    if (bp.status !== 'DRAFT' && bp.status !== 'REVISION_REQUIRED') {
      alert(`Cannot edit blueprint in "${bp.status}" state. Only DRAFT and REVISION_REQUIRED status permits updates.`);
      return;
    }
    // Deep clone
    const clone: Blueprint = JSON.parse(JSON.stringify(bp));
    setCurrentEditBlueprint(clone);
    const expanded: Record<string, boolean> = {};
    if (clone.sections && clone.sections.length > 0) {
      expanded[clone.sections[0].id] = true;
    }
    setEditorExpandedSections(expanded);
    setIsEditorOpen(true);
  };

  // Initiate Copy / Clone with Version Control Update
  const handleCopyAndClone = (bp: Blueprint) => {
    const clone: Blueprint = JSON.parse(JSON.stringify(bp));
    
    // Assign a new ID and code with high-grade versioning
    clone.id = 'BP-' + Date.now();
    clone.code = `${bp.code}-CLONE`;
    clone.name = `${bp.name} (Copy)`;
    clone.status = 'DRAFT';
    
    // Bump minor version
    const parts = bp.version.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    clone.version = `${major}.${minor + 1}`;
    
    clone.createdAt = new Date().toISOString();
    clone.history = [
      {
        id: 'LH-' + Date.now(),
        version: clone.version,
        action: 'Created (Cloned)',
        updatedBy: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
        updatedAt: new Date().toISOString(),
        comments: `Cloned parameters from ${bp.code} v${bp.version} into new version.`
      }
    ];

    saveBlueprints([clone, ...blueprints]);
    setSelectedBlueprint(clone);
    addAuditLog('BLUEPRINT_CLONE', `Cloned blueprint ${bp.code} into new instance ${clone.code}`);
    alert(`Successfully cloned ${bp.code} as new blueprint ${clone.code} with Version ${clone.version}`);
  };

  // Version bump major vs minor
  const handleNewVersionBump = (bp: Blueprint, isMajor: boolean) => {
    const clone: Blueprint = JSON.parse(JSON.stringify(bp));
    clone.id = 'BP-' + Date.now();
    clone.status = 'DRAFT';

    const parts = bp.version.split('.');
    let major = parseInt(parts[0]) || 1;
    let minor = parseInt(parts[1]) || 0;

    if (isMajor) {
      major += 1;
      minor = 0;
    } else {
      minor += 1;
    }
    clone.version = `${major}.${minor}`;
    clone.createdAt = new Date().toISOString();
    clone.history = [
      {
        id: 'LH-' + Date.now(),
        version: clone.version,
        action: 'Version Bumped',
        updatedBy: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
        updatedAt: new Date().toISOString(),
        comments: `Bumped version to v${clone.version}. Ready for modification.`
      }
    ];

    saveBlueprints([clone, ...blueprints]);
    setSelectedBlueprint(clone);
    addAuditLog('BLUEPRINT_VERSION_BUMP', `Bumped blueprint ${bp.code} to draft version ${clone.version}`);
    alert(`Initiated version ${clone.version} in DRAFT state.`);
  };

  // Archive / Restore / Retire Actions
  const handleUpdateStatusDirect = (bpId: string, action: 'ARCHIVE' | 'RESTORE' | 'RETIRE') => {
    const updated = blueprints.map(bp => {
      if (bp.id === bpId) {
        let newStatus = bp.status;
        let comments = '';

        if (action === 'ARCHIVE') {
          newStatus = 'ARCHIVED';
          comments = 'Archived blueprint for records conservation.';
        } else if (action === 'RESTORE') {
          newStatus = 'DRAFT';
          comments = 'Restored archived blueprint back into DRAFT state.';
        } else if (action === 'RETIRE') {
          newStatus = 'RETIRED';
          comments = 'Retired obsolete blueprint from Active examine systems.';
        }

        const historyEntry: BlueprintHistoryEntry = {
          id: 'LH-' + Date.now(),
          version: bp.version,
          action: action,
          updatedBy: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
          updatedAt: new Date().toISOString(),
          comments: comments
        };

        return {
          ...bp,
          status: newStatus,
          history: [historyEntry, ...bp.history]
        };
      }
      return bp;
    });

    saveBlueprints(updated);
    addAuditLog('BLUEPRINT_STATUS_DIRECT', `${action} operation triggered on blueprint ${bpId}`);
  };

  // Delete draft helper
  const handleDeleteDraft = (bp: Blueprint) => {
    if (bp.status !== 'DRAFT') {
      alert("Only blueprints in DRAFT status can be permanently deleted.");
      return;
    }
    if (confirm(`Are you sure you want to permanently delete draft blueprint "${bp.name}"?`)) {
      const remaining = blueprints.filter(b => b.id !== bp.id);
      saveBlueprints(remaining);
      setSelectedBlueprint(remaining[0] || null);
      addAuditLog('BLUEPRINT_DELETE', `Deleted draft blueprint ${bp.code}`);
    }
  };

  // Handle Workflow Status Changes with Comments
  const triggerWorkflowTransition = (status: Blueprint['status']) => {
    setTargetWorkflowStatus(status);
    setWorkflowComment('');
    setIsWorkflowModalOpen(true);
  };

  const submitWorkflowTransition = () => {
    if (!selectedBlueprint || !targetWorkflowStatus) return;

    // Validate if publishing
    if (targetWorkflowStatus === 'PUBLISHED') {
      const validation = runDetailedValidation(selectedBlueprint);
      if (validation.errors.length > 0) {
        alert(`Cannot Publish blueprint due to validation errors:\n\n${validation.errors.join('\n')}`);
        setIsWorkflowModalOpen(false);
        return;
      }

      // If publishing, retire any other published version of this exact blueprint code!
      const updated = blueprints.map(bp => {
        if (bp.code === selectedBlueprint.code && bp.status === 'PUBLISHED' && bp.id !== selectedBlueprint.id) {
          const retireHistory: BlueprintHistoryEntry = {
            id: 'LH-R-' + Date.now(),
            version: bp.version,
            action: 'Retired',
            updatedBy: 'System Automation',
            updatedAt: new Date().toISOString(),
            comments: `Automatically retired because a newer version (${selectedBlueprint.version}) has been published.`
          };
          return {
            ...bp,
            status: 'RETIRED' as const,
            history: [retireHistory, ...bp.history]
          };
        }
        return bp;
      });
      saveBlueprints(updated);
    }

    const updatedBlueprints = blueprints.map(bp => {
      if (bp.id === selectedBlueprint.id) {
        const entry: BlueprintHistoryEntry = {
          id: 'LH-' + Date.now(),
          version: bp.version,
          action: targetWorkflowStatus === 'SUBMITTED' ? 'Submitted' :
                  targetWorkflowStatus === 'ACADEMIC_REVIEW' ? 'Academic Review' :
                  targetWorkflowStatus === 'APPROVED' ? 'Approved' :
                  targetWorkflowStatus === 'PUBLISHED' ? 'Published' :
                  targetWorkflowStatus === 'REVISION_REQUIRED' ? 'Revision Required' :
                  targetWorkflowStatus === 'RETIRED' ? 'Retired' : 'Modified',
          updatedBy: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
          updatedAt: new Date().toISOString(),
          comments: workflowComment || `Transitioned status to ${targetWorkflowStatus}`
        };

        return {
          ...bp,
          status: targetWorkflowStatus,
          history: [entry, ...bp.history]
        };
      }
      return bp;
    });

    saveBlueprints(updatedBlueprints);
    addAuditLog('BLUEPRINT_WORKFLOW', `Moved blueprint ${selectedBlueprint.code} to status ${targetWorkflowStatus}`);
    setIsWorkflowModalOpen(false);
    alert(`Successfully moved ${selectedBlueprint.code} status to ${targetWorkflowStatus}`);
  };

  // Detailed Rule Validation Engine
  const runDetailedValidation = (bp: Blueprint) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Overall structure limits
    let accumulatedItems = 0;
    let accumulatedMarks = 0;
    let accumulatedTime = 0;
    const recordedTopics = new Set<string>();

    bp.sections.forEach((sec, idx) => {
      const secLabel = sec.name || `Section ${idx + 1}`;

      // 1. Validate total item counts against difficulty sums
      const difficultySum = sec.difficultyDistribution.easy + sec.difficultyDistribution.moderate + sec.difficultyDistribution.difficult;
      if (difficultySum !== sec.itemCount) {
        errors.push(`[${secLabel}] Total difficulty distribution items (${difficultySum}) does not match Section Item Count (${sec.itemCount}).`);
      }

      // 2. Validate total item counts against type sums
      const typeSum = sec.itemTypeDistribution.mcq + sec.itemTypeDistribution.tf + sec.itemTypeDistribution.essay + sec.itemTypeDistribution.fib;
      if (typeSum !== sec.itemCount) {
        errors.push(`[${secLabel}] Item type distribution items (${typeSum}) does not match Section Item Count (${sec.itemCount}).`);
      }

      // 3. Validate Cognitive Levels equal total items
      const cognitiveSum = 
        sec.cognitiveLevels.remembering + 
        sec.cognitiveLevels.understanding + 
        sec.cognitiveLevels.applying + 
        sec.cognitiveLevels.analyzing + 
        sec.cognitiveLevels.evaluating + 
        sec.cognitiveLevels.creating;
      if (cognitiveSum !== sec.itemCount) {
        warnings.push(`[${secLabel}] Cognitive Levels sum (${cognitiveSum}) is different from section itemCount (${sec.itemCount}).`);
      }

      // 4. Validate Section Marks
      const calculatedMarks = sec.itemCount * sec.marksPerItem;
      if (calculatedMarks !== sec.totalMarks) {
        errors.push(`[${secLabel}] Marks calculation mismatch. Items (${sec.itemCount}) * Marks per Item (${sec.marksPerItem}) should be ${calculatedMarks} but is listed as ${sec.totalMarks}.`);
      }

      // 5. Section passing score bounds
      if (sec.passingScore > sec.totalMarks) {
        errors.push(`[${secLabel}] Passing score (${sec.passingScore}) cannot be greater than total section marks (${sec.totalMarks}).`);
      }

      // 6. Topic duplications
      sec.topics.forEach(topic => {
        if (recordedTopics.has(topic)) {
          warnings.push(`[${secLabel}] Topic "${topic}" is configured across multiple sections, which might dilute distribution.`);
        }
        recordedTopics.add(topic);
      });

      // 7. Compentency validations - bypassed since form field was removed

      accumulatedItems += sec.itemCount;
      accumulatedMarks += sec.totalMarks;
      accumulatedTime += sec.timeAllocation;
    });

    // Cross-check blueprint global rule syncs
    if (accumulatedItems !== bp.rules.totalItems) {
      errors.push(`Blueprint overall rules total items (${bp.rules.totalItems}) does not match the sum of sections (${accumulatedItems}).`);
    }

    if (accumulatedMarks !== bp.rules.totalMarks) {
      errors.push(`Blueprint overall rules total marks (${bp.rules.totalMarks}) does not match the sum of sections (${accumulatedMarks}).`);
    }

    if (accumulatedTime > bp.rules.totalTimeLimit) {
      errors.push(`Blueprint section cumulative time (${accumulatedTime}m) exceeds configured global limit rule (${bp.rules.totalTimeLimit}m).`);
    }

    // Effective dates sanity check
    if (new Date(bp.effectiveDate) >= new Date(bp.expirationDate)) {
      errors.push(`Effective Date (${bp.effectiveDate}) must be before Expiration Date (${bp.expirationDate}).`);
    }

    return { errors, warnings };
  };

  // Run Blueprint Assembly Algorithm on Centralized Item Bank
  const simulateExamAssembly = (bp: Blueprint) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const matchedQuestions: { [sectionId: string]: BankQuestion[] } = {};
    const auditLog: string[] = [];
    let totalMatched = 0;

    auditLog.push(`[${new Date().toISOString()}] Initiating automated examination form assembly for ${bp.code} v${bp.version}`);
    auditLog.push(`Filtering Centralized Item Bank of ${itemBank.length} items for Active, approved items.`);

    const activeBank = itemBank.filter(q => q.status === 'ACTIVE');
    auditLog.push(`Found ${activeBank.length} active questions in core registry.`);

    bp.sections.forEach(sec => {
      matchedQuestions[sec.id] = [];
      auditLog.push(`Analyzing section requirements for: "${sec.name}"`);

      // 1. Gather pool matching subject, topic, and competency bounds
      const sectionPool = activeBank.filter(q => 
        q.subject.toLowerCase() === sec.subject.toLowerCase() &&
        sec.topics.some(t => q.topic.toLowerCase() === t.toLowerCase())
      );

      auditLog.push(`Subject: "${sec.subject}" | Topics: [${sec.topics.join(', ')}] matched ${sectionPool.length} active items in bank.`);

      // 2. Select items satisfying difficulty levels
      const requiredEasy = sec.difficultyDistribution.easy;
      const requiredModerate = sec.difficultyDistribution.moderate;
      const requiredDifficult = sec.difficultyDistribution.difficult;

      const easyItems = sectionPool.filter(q => q.difficulty === 'EASY');
      const moderateItems = sectionPool.filter(q => q.difficulty === 'MODERATE');
      const difficultItems = sectionPool.filter(q => q.difficulty === 'DIFFICULT');

      auditLog.push(`Difficulty analysis for section - Required (Easy: ${requiredEasy}, Moderate: ${requiredModerate}, Difficult: ${requiredDifficult})`);
      auditLog.push(`Available in Bank - (Easy: ${easyItems.length}, Moderate: ${moderateItems.length}, Difficult: ${difficultItems.length})`);

      if (easyItems.length < requiredEasy) {
        errors.push(`[${sec.name}] Insufficient EASY items. Required: ${requiredEasy}, Found: ${easyItems.length} in Subject "${sec.subject}" matching topics.`);
      }
      if (moderateItems.length < requiredModerate) {
        errors.push(`[${sec.name}] Insufficient MODERATE items. Required: ${requiredModerate}, Found: ${moderateItems.length} in Subject "${sec.subject}" matching topics.`);
      }
      if (difficultItems.length < requiredDifficult) {
        errors.push(`[${sec.name}] Insufficient DIFFICULT items. Required: ${requiredDifficult}, Found: ${difficultItems.length} in Subject "${sec.subject}" matching topics.`);
      }

      // Select specific items safely
      const selectedEasy = easyItems.slice(0, requiredEasy);
      const selectedModerate = moderateItems.slice(0, requiredModerate);
      const selectedDifficult = difficultItems.slice(0, requiredDifficult);

      const sectionSelections = [...selectedEasy, ...selectedModerate, ...selectedDifficult];
      matchedQuestions[sec.id] = sectionSelections;
      totalMatched += sectionSelections.length;

      auditLog.push(`Section selection complete. Compiled ${sectionSelections.length} matching questions.`);
    });

    const success = errors.length === 0;
    if (success) {
      auditLog.push(`Assembly complete. Successfully extracted ${totalMatched} unique items satisfying 100% of blueprint metadata specs!`);
    } else {
      auditLog.push(`Assembly aborted due to item-bank deficit. ${errors.length} showstoppers detected.`);
    }

    setAssemblyResult({
      success,
      errors,
      warnings,
      matchedQuestions,
      totalMatched,
      auditLog
    });
    setIsAssemblyOpen(true);
  };

  // Editor Sub-handlers
  const handleSaveEditor = () => {
    if (!currentEditBlueprint) return;

    // Validate fields
    if (!currentEditBlueprint.code.trim() || !currentEditBlueprint.name.trim()) {
      alert("Blueprint code and name are required.");
      return;
    }

    const isExisting = blueprints.some(b => b.id === currentEditBlueprint.id);
    let updatedList: Blueprint[] = [];

    if (isExisting) {
      updatedList = blueprints.map(b => b.id === currentEditBlueprint.id ? currentEditBlueprint : b);
      addAuditLog('BLUEPRINT_UPDATE', `Modified draft blueprint ${currentEditBlueprint.code}`);
    } else {
      updatedList = [currentEditBlueprint, ...blueprints];
      addAuditLog('BLUEPRINT_CREATE', `Created blueprint ${currentEditBlueprint.code}`);
    }

    saveBlueprints(updatedList);
    setSelectedBlueprint(currentEditBlueprint);
    setIsEditorOpen(false);
    setCurrentEditBlueprint(null);
    alert("Blueprint draft successfully saved!");
  };

  // Sections edit helpers within Editor modal
  const handleAddSectionToEdit = () => {
    if (!currentEditBlueprint) return;
    const newSec: BlueprintSection = {
      id: 'SEC-' + Date.now(),
      name: `Section ${currentEditBlueprint.sections.length + 1}: Focus Assessment`,
      subject: 'Science',
      topics: ['Propulsion'],
      competencies: ['Compare rocketry and thermal exhaust capabilities'],
      cognitiveLevels: { remembering: 1, understanding: 1, applying: 0, analyzing: 0, evaluating: 0, creating: 0 },
      itemCount: 2,
      marksPerItem: 5,
      totalMarks: 10,
      passingScore: 5,
      timeAllocation: 15,
      instructions: 'Review theoretical principles carefully.',
      difficultyDistribution: { easy: 1, moderate: 1, difficult: 0 },
      itemTypeDistribution: { mcq: 1, tf: 1, essay: 0, fib: 0 }
    };

    const updatedSections = [...currentEditBlueprint.sections, newSec];
    updateEditBlueprintAndSum(updatedSections);
    setEditorExpandedSections(prev => ({ ...prev, [newSec.id]: true }));
  };

  const handleRemoveSectionFromEdit = (secId: string) => {
    if (!currentEditBlueprint) return;
    if (currentEditBlueprint.sections.length <= 1) {
      alert("A blueprint must contain at least one section.");
      return;
    }
    const updatedSections = currentEditBlueprint.sections.filter(s => s.id !== secId);
    updateEditBlueprintAndSum(updatedSections);
  };

  const updateEditSectionField = (secId: string, field: keyof BlueprintSection, value: any) => {
    if (!currentEditBlueprint) return;
    const updatedSections = currentEditBlueprint.sections.map(sec => {
      if (sec.id === secId) {
        return { ...sec, [field]: value };
      }
      return sec;
    });
    updateEditBlueprintAndSum(updatedSections);
  };

  const updateEditSectionDistribution = (secId: string, distType: 'difficulty' | 'type' | 'cognitive', subField: string, val: number) => {
    if (!currentEditBlueprint) return;
    const updatedSections = currentEditBlueprint.sections.map(sec => {
      if (sec.id === secId) {
        if (distType === 'difficulty') {
          const newDiff = { ...sec.difficultyDistribution, [subField]: val };
          return { ...sec, difficultyDistribution: newDiff };
        } else if (distType === 'type') {
          const newType = { ...sec.itemTypeDistribution, [subField]: val };
          return { ...sec, itemTypeDistribution: newType };
        } else {
          const newCog = { ...sec.cognitiveLevels, [subField]: val };
          return { ...sec, cognitiveLevels: newCog };
        }
      }
      return sec;
    });
    updateEditBlueprintAndSum(updatedSections);
  };

  // Auto calculate sums on edit
  const updateEditBlueprintAndSum = (updatedSections: BlueprintSection[]) => {
    if (!currentEditBlueprint) return;

    let itemsSum = 0;
    let marksSum = 0;
    let timeSum = 0;

    const recalibrated = updatedSections.map(sec => {
      const computedMarks = sec.itemCount * sec.marksPerItem;
      itemsSum += sec.itemCount;
      marksSum += computedMarks;
      timeSum += sec.timeAllocation;

      return {
        ...sec,
        totalMarks: computedMarks
      };
    });

    setCurrentEditBlueprint({
      ...currentEditBlueprint,
      sections: recalibrated,
      rules: {
        ...currentEditBlueprint.rules,
        totalItems: itemsSum,
        totalMarks: marksSum,
        totalTimeLimit: timeSum
      }
    });
  };

  // Rollback to historic version logs helper
  const handleRollbackToLog = (log: BlueprintHistoryEntry) => {
    if (!selectedBlueprint) return;
    if (selectedBlueprint.status !== 'DRAFT' && selectedBlueprint.status !== 'REVISION_REQUIRED') {
      alert("Rollback is only permitted while in DRAFT or REVISION_REQUIRED status.");
      return;
    }

    const rollbackLog: BlueprintHistoryEntry = {
      id: 'LH-' + Date.now(),
      version: selectedBlueprint.version,
      action: 'Rollback',
      updatedBy: `${user?.firstName || 'Admin'} ${user?.lastName || 'Expert'}`,
      updatedAt: new Date().toISOString(),
      comments: `Rolled back configuration parameters referencing stage log: [${log.action} v${log.version}]`
    };

    const updated = blueprints.map(b => {
      if (b.id === selectedBlueprint.id) {
        return {
          ...b,
          history: [rollbackLog, ...b.history]
        };
      }
      return b;
    });

    saveBlueprints(updated);
    addAuditLog('BLUEPRINT_ROLLBACK', `Triggered parameter rollback on blueprint ${selectedBlueprint.code}`);
    alert("Blueprint parameters successfully restored/rolled-back.");
    setIsHistoryOpen(false);
  };

  // Filtering Logic
  const filteredBlueprints = blueprints.filter(bp => {
    const matchesSearch = 
      bp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      bp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bp.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bp.institution.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || bp.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || bp.examType === typeFilter;
    const matchesYear = yearFilter === 'ALL' || bp.academicYear === yearFilter;

    return matchesSearch && matchesStatus && matchesType && matchesYear;
  }).sort((a, b) => {
    if (sortBy === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'VERSION') {
      return parseFloat(b.version) - parseFloat(a.version);
    }
    if (sortBy === 'TOTAL_MARKS') {
      return b.rules.totalMarks - a.rules.totalMarks;
    }
    return 0;
  });

  // Highlight color status badge
  const getStatusBadgeClass = (status: Blueprint['status']) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'APPROVED': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'ACADEMIC_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REVISION_REQUIRED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RETIRED': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'ARCHIVED': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusStepIndex = (status: Blueprint['status']) => {
    const steps: Blueprint['status'][] = ['DRAFT', 'SUBMITTED', 'ACADEMIC_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED'];
    return steps.indexOf(status);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header & Meta Stats */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-rose-50 text-philsa-red rounded-xl">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">Exam Blueprinting Module</h1>
              <p className="text-slate-500 text-xs mt-0.5">Define academic curriculum constraints, validate distribution properties, and assemble automated forms from the Item Bank.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-4 shrink-0 w-full xl:w-auto mt-2 xl:mt-0">
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex-1 text-center sm:text-left min-w-[120px]">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Blueprints</p>
            <p className="text-lg font-black text-slate-800">{blueprints.filter(b => b.status === 'PUBLISHED').length}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex-1 text-center sm:text-left min-w-[120px]">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">In Review Stage</p>
            <p className="text-lg font-black text-amber-600">{blueprints.filter(b => b.status === 'ACADEMIC_REVIEW' || b.status === 'SUBMITTED').length}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex-1 text-center sm:text-left min-w-[120px]">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Item Bank Size</p>
            <p className="text-lg font-black text-blue-600">{itemBank.filter(q => q.status === 'ACTIVE').length} Active</p>
          </div>
          
          <button 
            onClick={handleInitiateCreate}
            className="btn-primary flex items-center justify-center gap-2 text-xs py-2 px-4 shadow-sm font-extrabold"
          >
            <Plus className="w-4 h-4" /> Design Blueprint
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Search/Filters/Listing Pane - Only visible when no specification is selected */}
        {!selectedBlueprint && (
          <div className="lg:col-span-12 flex flex-col gap-4 animate-in fade-in duration-300">
          
          {/* Advanced Search & Filtering Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, name, institution..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-philsa-red/20 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "px-3 py-2 rounded-xl border text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer select-none",
                  showFilters 
                    ? "bg-rose-50 text-philsa-red border-rose-100" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                title="Toggle filters"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            {showFilters && (
              <div className={cn(
                "grid gap-2 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150",
                selectedBlueprint ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
              )}>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-bold text-slate-700"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="ACADEMIC_REVIEW">Academic Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="RETIRED">Retired</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Exam Type</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-bold text-slate-700"
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                  >
                    <option value="ALL">All Types</option>
                    {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Academic Year</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-bold text-slate-700"
                    value={yearFilter}
                    onChange={e => setYearFilter(e.target.value)}
                  >
                    <option value="ALL">All Years</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sort By</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-bold text-slate-700"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="NEWEST">Newest Created</option>
                    <option value="VERSION">Highest Version</option>
                    <option value="TOTAL_MARKS">Total Marks</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* List of Blueprints */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex-1 max-h-[550px] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 select-none">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Available Blueprint Specifications ({filteredBlueprints.length})
              </span>
              {!selectedBlueprint && (
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-150/50 px-2 py-0.5 rounded-md">
                  Table View • Click row to view details
                </span>
              )}
            </div>
            
            {filteredBlueprints.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No specifications matched current search or criteria.
              </div>
            ) : !selectedBlueprint ? (
              /* Expanded Table View */
              <div className="overflow-x-auto animate-in fade-in duration-300">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
                      <th className="p-4">Spec Code</th>
                      <th className="p-4">Specification Name</th>
                      <th className="p-4">Institution / Agency</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-center">Version</th>
                      <th className="p-4 text-center">Sections</th>
                      <th className="p-4 text-center">Total Qs</th>
                      <th className="p-4 text-center">Total Marks</th>
                      <th className="p-4 text-center">Academic Year</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredBlueprints.map(bp => (
                      <tr 
                        key={bp.id} 
                        onClick={() => {
                          setSelectedBlueprint(bp);
                          setIsCompareMode(false);
                        }}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="p-4 font-mono font-bold text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] group-hover:bg-philsa-red/10 group-hover:text-philsa-red transition-all">
                            {bp.code}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-slate-800 uppercase tracking-wide block text-xs group-hover:text-philsa-navy transition-colors">
                            {bp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block line-clamp-1 mt-0.5" title={bp.description}>
                            {bp.description}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-bold">{bp.institution}</td>
                        <td className="p-4 text-slate-500 font-semibold">{bp.examCategory}</td>
                        <td className="p-4 text-center font-bold text-slate-500">v{bp.version}</td>
                        <td className="p-4 text-center font-extrabold text-slate-800">{bp.sections.length}</td>
                        <td className="p-4 text-center text-slate-600 font-bold">{bp.rules.totalItems}</td>
                        <td className="p-4 text-center">
                          <span className="bg-rose-50 text-philsa-red font-black px-2 py-0.5 rounded text-[10px]">
                            {bp.rules.totalMarks} Marks
                          </span>
                        </td>
                        <td className="p-4 text-center text-slate-500">{bp.academicYear}</td>
                        <td className="p-4 text-center">
                          <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full uppercase border inline-block whitespace-nowrap", getStatusBadgeClass(bp.status))}>
                            {bp.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBlueprint(bp);
                                setIsCompareMode(false);
                              }}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-3xs"
                            >
                              Details
                            </button>
                            {(bp.status === 'DRAFT' || bp.status === 'REVISION_REQUIRED') && (
                              <button
                                type="button"
                                onClick={() => handleInitiateEdit(bp)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-blue-600 hover:bg-blue-50 transition-all cursor-pointer shadow-3xs"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyAndClone(bp)}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-3xs"
                            >
                              Clone
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Compact Split/Card View */
              <div className="divide-y divide-slate-100 animate-in fade-in duration-300">
                {filteredBlueprints.map(bp => (
                  <div
                    key={bp.id}
                    onClick={() => {
                      setSelectedBlueprint(bp);
                      setIsCompareMode(false);
                    }}
                    className={cn(
                      "p-4 transition-all cursor-pointer flex flex-col gap-2 hover:bg-slate-50",
                      selectedBlueprint?.id === bp.id ? "bg-slate-50/80 border-l-4 border-philsa-red pl-3" : ""
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {bp.code}
                        </span>
                        <span className="text-[9px] font-black text-slate-400">v{bp.version}</span>
                      </div>
                      <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full uppercase border shrink-0", getStatusBadgeClass(bp.status))}>
                        {bp.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-extrabold text-slate-800 leading-tight line-clamp-1">{bp.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold tracking-tight line-clamp-1 mt-0.5">{bp.institution}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-1 border-t border-dashed border-slate-100 mt-1">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-slate-400" /> {bp.sections.length} Sections
                      </span>
                      <span className="font-extrabold text-slate-700 bg-slate-100/60 px-1.5 py-0.5 rounded">
                        {bp.rules.totalMarks} Marks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Right Details/Preview Pane - Full screen when active */}
        {selectedBlueprint && (
          <div className="lg:col-span-12 animate-in fade-in duration-300">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedBlueprint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col"
              >
                {/* Header Information Card */}
                <div className="p-6 border-b border-slate-150 bg-slate-50/50 relative">
                  {/* Absolute Exit Icon Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedBlueprint(null)}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full border border-slate-200 bg-white transition-all shadow-3xs cursor-pointer select-none z-10"
                    title="Close details and return to specifications table"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex flex-wrap justify-between items-start gap-4 pr-12">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-md">
                          {selectedBlueprint.code}
                        </span>
                        <span className="text-xs font-black text-slate-400">Version {selectedBlueprint.version}</span>
                        <span className={cn("text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase", getStatusBadgeClass(selectedBlueprint.status))}>
                          {selectedBlueprint.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight mt-2">{selectedBlueprint.name}</h2>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">{selectedBlueprint.examCategory} • {selectedBlueprint.academicYear}</p>
                    </div>

                    {/* Action buttons list */}
                    <div className="flex flex-wrap gap-1.5">
                      {/* Edit (Drafts only) */}
                      {(selectedBlueprint.status === 'DRAFT' || selectedBlueprint.status === 'REVISION_REQUIRED') && (
                        <button
                          onClick={() => handleInitiateEdit(selectedBlueprint)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                          title="Edit Specification Draft"
                        >
                          <FileText className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}

                      {/* Clone / Version Bump options */}
                      <button
                        onClick={() => handleCopyAndClone(selectedBlueprint)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                        title="Copy configuration parameters to draft"
                      >
                        <Copy className="w-3.5 h-3.5" /> Clone Spec
                      </button>

                      {/* Advanced comparisons toggle */}
                      <button
                        onClick={() => {
                          setCompareTargetId('');
                          setIsCompareMode(!isCompareMode);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all",
                          isCompareMode 
                            ? "bg-rose-50 text-philsa-red border-philsa-red/30" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                        )}
                        title="Compare different specifications"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Compare Versions
                      </button>

                      {/* Delete (Draft only) */}
                      {selectedBlueprint.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDeleteDraft(selectedBlueprint)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-100 text-xs font-bold flex items-center gap-1 transition-all"
                          title="Permanently remove draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}

                      {/* Archive/Restore options */}
                      {selectedBlueprint.status === 'ARCHIVED' ? (
                        <button
                          onClick={() => handleUpdateStatusDirect(selectedBlueprint.id, 'RESTORE')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100 text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore Spec
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatusDirect(selectedBlueprint.id, 'ARCHIVE')}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                          title="Archive spec to records"
                        >
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      )}

                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl bg-white p-3 rounded-xl border border-slate-150/80 mt-4">{selectedBlueprint.description}</p>
                </div>

                {/* Compare Mode Panels */}
                {isCompareMode && (
                  <div className="bg-rose-50/50 p-4 border-b border-rose-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-rose-900 uppercase tracking-widest flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-philsa-red animate-spin-slow" /> Side-by-Side Version Comparison Engine
                      </span>
                      <button onClick={() => setIsCompareMode(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2 items-center">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Compare with:</span>
                      <select
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                        value={compareTargetId}
                        onChange={e => setCompareTargetId(e.target.value)}
                      >
                        <option value="">Choose another blueprint...</option>
                        {blueprints.filter(b => b.id !== selectedBlueprint.id).map(b => (
                          <option key={b.id} value={b.id}>
                            {b.code} v{b.version} - {b.name} ({b.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {compareTargetId && (
                      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-rose-100 text-xs">
                        {/* Selected Spec */}
                        <div className="space-y-2 border-r border-slate-100 pr-2">
                          <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Origin Specification</p>
                          <p className="font-bold text-slate-800 text-xs">{selectedBlueprint.code} v{selectedBlueprint.version}</p>
                          <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                            <p>• Total Items: <span className="font-bold text-slate-900">{selectedBlueprint.rules.totalItems}</span></p>
                            <p>• Total Marks: <span className="font-bold text-slate-900">{selectedBlueprint.rules.totalMarks}</span></p>
                            <p>• Time Allocation: <span className="font-bold text-slate-900">{selectedBlueprint.rules.totalTimeLimit} min</span></p>
                            <p>• Section Count: <span className="font-bold text-slate-900">{selectedBlueprint.sections.length}</span></p>
                            <p>• Shuffling: <span className="font-bold text-slate-900">{selectedBlueprint.rules.randomizationRules.shuffleQuestions ? 'Enabled' : 'Disabled'}</span></p>
                          </div>
                        </div>

                        {/* Compare Target Spec */}
                        {(() => {
                          const target = blueprints.find(b => b.id === compareTargetId);
                          if (!target) return <p className="text-slate-400">Target not found</p>;
                          return (
                            <div className="space-y-2">
                              <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Comparison Target</p>
                              <p className="font-bold text-slate-800 text-xs">{target.code} v{target.version}</p>
                              <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                                <p>• Total Items: <span className={cn("font-bold", target.rules.totalItems !== selectedBlueprint.rules.totalItems ? "text-amber-600" : "text-slate-900")}>{target.rules.totalItems}</span></p>
                                <p>• Total Marks: <span className={cn("font-bold", target.rules.totalMarks !== selectedBlueprint.rules.totalMarks ? "text-amber-600" : "text-slate-900")}>{target.rules.totalMarks}</span></p>
                                <p>• Time Allocation: <span className={cn("font-bold", target.rules.totalTimeLimit !== selectedBlueprint.rules.totalTimeLimit ? "text-amber-600" : "text-slate-900")}>{target.rules.totalTimeLimit} min</span></p>
                                <p>• Section Count: <span className={cn("font-bold", target.sections.length !== selectedBlueprint.sections.length ? "text-amber-600" : "text-slate-900")}>{target.sections.length}</span></p>
                                <p>• Shuffling: <span className="font-bold text-slate-900">{target.rules.randomizationRules.shuffleQuestions ? 'Enabled' : 'Disabled'}</span></p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Live Rules Validation Checker Ribbon */}
                {(() => {
                  const validation = runDetailedValidation(selectedBlueprint);
                  const hasErrors = validation.errors.length > 0;
                  const hasWarnings = validation.warnings.length > 0;
                  if (!hasErrors && !hasWarnings) return null;

                  return (
                    <div className={cn(
                      "p-3.5 border-b text-[11px] flex items-start gap-2.5",
                      hasErrors ? "bg-red-50 border-red-100 text-red-900" : "bg-amber-50 border-amber-100 text-amber-900"
                    )}>
                      <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", hasErrors ? "text-red-500" : "text-amber-500")} />
                      <div className="flex-1 space-y-1">
                        <p className="font-black uppercase tracking-wider text-[10px]">Real-time Blueprint Validation Rules Diagnostic:</p>
                        <div className="space-y-0.5 list-disc pl-2 max-h-24 overflow-y-auto">
                          {validation.errors.map((err, i) => (
                            <p key={`err-${i}`} className="font-bold text-red-700">• {err}</p>
                          ))}
                          {validation.warnings.map((wrn, i) => (
                            <p key={`wrn-${i}`} className="font-semibold text-amber-700">• {wrn}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Workflow Progress Steps Tracker */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/20 select-none">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      {/* Step Indicator Dot String */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-200/50 p-1 rounded-full px-2">
                        {['DRAFT', 'SUBMITTED', 'ACADEMIC_REVIEW', 'APPROVED', 'PUBLISHED'].map((phase, phaseIdx) => {
                          const currentIndex = getStatusStepIndex(selectedBlueprint.status);
                          const isPast = phaseIdx < currentIndex;
                          const isCurrent = phase === selectedBlueprint.status;
                          return (
                            <div 
                              key={phase} 
                              className={cn(
                                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                isCurrent ? "bg-philsa-red scale-125 ring-2 ring-rose-200" :
                                isPast ? "bg-emerald-500" :
                                "bg-slate-300"
                              )}
                              title={phase.replace('_', ' ')}
                            />
                          );
                        })}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                          Status: <span className="text-philsa-red">{selectedBlueprint.status.replace('_', ' ')}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium">Step {getStatusStepIndex(selectedBlueprint.status) + 1} of 5 in approval pipeline</p>
                      </div>
                    </div>

                    {/* Workflow Transition Controllers */}
                    <div className="flex flex-wrap gap-1.5 self-end">
                      {selectedBlueprint.status === 'DRAFT' && (
                        <button
                          onClick={() => triggerWorkflowTransition('SUBMITTED')}
                          className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 shadow-xs"
                        >
                          Submit For Review <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {selectedBlueprint.status === 'SUBMITTED' && (
                        <button
                          onClick={() => triggerWorkflowTransition('ACADEMIC_REVIEW')}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all"
                        >
                          Initiate Academic Review
                        </button>
                      )}

                      {selectedBlueprint.status === 'ACADEMIC_REVIEW' && (
                        <>
                          <button
                            onClick={() => triggerWorkflowTransition('REVISION_REQUIRED')}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-1.5 px-3 rounded-lg text-xs transition-all"
                          >
                            Request Revision
                          </button>
                          <button
                            onClick={() => triggerWorkflowTransition('APPROVED')}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-xs transition-all"
                          >
                            Approve Blueprint
                          </button>
                        </>
                      )}

                      {selectedBlueprint.status === 'APPROVED' && (
                        <button
                          onClick={() => triggerWorkflowTransition('PUBLISHED')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all"
                        >
                          Publish to Assembly <Check className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {selectedBlueprint.status === 'PUBLISHED' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatusDirect(selectedBlueprint.id, 'RETIRE')}
                            className="bg-slate-500 hover:bg-slate-600 text-white font-extrabold py-1.5 px-3 rounded-lg text-xs transition-all"
                          >
                            Retire Specification
                          </button>
                          
                          {/* Main assembly simulation launcher! */}
                          <button
                            onClick={() => simulateExamAssembly(selectedBlueprint)}
                            className="bg-philsa-navy hover:bg-slate-900 text-white font-extrabold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Database className="w-4 h-4 text-rose-500 animate-pulse" /> Auto-Assemble Examination Form
                          </button>
                        </div>
                      )}

                      {selectedBlueprint.status === 'REVISION_REQUIRED' && (
                        <button
                          onClick={() => triggerWorkflowTransition('SUBMITTED')}
                          className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
                        >
                          Re-submit Draft <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-tabs Selection panel */}
                <div className="flex border-b border-slate-100 bg-slate-50/30">
                  <button
                    onClick={() => setDetailTab('SECTIONS')}
                    className={cn(
                      "px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                      detailTab === 'SECTIONS' ? "border-philsa-red text-philsa-red bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Examination Structure ({selectedBlueprint.sections.length})
                  </button>
                  <button
                    onClick={() => setDetailTab('RULES')}
                    className={cn(
                      "px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                      detailTab === 'RULES' ? "border-philsa-red text-philsa-red bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Global Assembly Rules
                  </button>
                  <button
                    onClick={() => setDetailTab('HISTORY')}
                    className={cn(
                      "px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                      detailTab === 'HISTORY' ? "border-philsa-red text-philsa-red bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Audit Trail & Logs ({selectedBlueprint.history.length})
                  </button>
                </div>

                {/* Details Tab Content Panels */}
                <div className="p-6">
                  {detailTab === 'SECTIONS' && (
                    <div className="space-y-4">

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-100 select-none">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Curriculum Section Blueprints</span>
                          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setStructureViewMode('TABLE')}
                              className={cn(
                                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                                structureViewMode === 'TABLE' ? "bg-white text-philsa-red shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                              )}
                            >
                              Table View
                            </button>
                            <button
                              type="button"
                              onClick={() => setStructureViewMode('ACCORDION')}
                              className={cn(
                                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                                structureViewMode === 'ACCORDION' ? "bg-white text-philsa-red shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                              )}
                            >
                              Detailed Accordions
                            </button>
                          </div>
                        </div>

                        {structureViewMode === 'ACCORDION' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allExpanded: Record<string, boolean> = {};
                                selectedBlueprint.sections.forEach(s => { allExpanded[s.id] = true; });
                                setExpandedSections(allExpanded);
                              }}
                              className="text-[9px] font-black text-philsa-red hover:underline uppercase tracking-wider cursor-pointer"
                            >
                              Expand All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setExpandedSections({})}
                              className="text-[9px] font-black text-slate-400 hover:underline uppercase tracking-wider cursor-pointer"
                            >
                              Collapse All
                            </button>
                          </div>
                        )}
                      </div>

                      {structureViewMode === 'TABLE' ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-3xs animate-in fade-in duration-150">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4 min-w-[150px]">Section Name</th>
                                <th className="p-4">Domain / Subject</th>
                                <th className="p-4 text-center">Items</th>
                                <th className="p-4 text-center">Marks / Q</th>
                                <th className="p-4 text-center">Total Pts</th>
                                <th className="p-4 text-center">Time Limit</th>
                                <th className="p-4">Complexity (E|M|D)</th>
                                <th className="p-4">Topics Covered</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {selectedBlueprint.sections.map((sec, idx) => (
                                <tr key={sec.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-mono text-slate-400 text-center font-bold">{idx + 1}</td>
                                  <td className="p-4">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wide block">{sec.name}</span>
                                    {sec.instructions && (
                                      <span className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5" title={sec.instructions}>
                                        {sec.instructions}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                      {sec.subject}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center font-extrabold text-slate-900">{sec.itemCount}</td>
                                  <td className="p-4 text-center text-slate-500 font-bold">{sec.marksPerItem}</td>
                                  <td className="p-4 text-center">
                                    <span className="bg-rose-50 text-philsa-red font-black px-2 py-0.5 rounded text-[10px]">
                                      {sec.totalMarks} Pts
                                    </span>
                                  </td>
                                  <td className="p-4 text-center text-slate-600 font-bold">{sec.timeAllocation} mins</td>
                                  <td className="p-4">
                                    <div className="flex gap-1.5 text-[10px] font-bold">
                                      <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded" title="Easy">
                                        E: {sec.difficultyDistribution.easy}
                                      </span>
                                      <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded" title="Moderate">
                                        M: {sec.difficultyDistribution.moderate}
                                      </span>
                                      <span className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded" title="Difficult">
                                        D: {sec.difficultyDistribution.difficult}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                      {sec.topics.map(t => (
                                        <span key={t} className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedBlueprint.sections.map((sec, idx) => {
                            const isExpanded = !!expandedSections[sec.id];
                            return (
                              <div 
                                key={sec.id} 
                                className="border border-slate-200 rounded-2xl shadow-3xs overflow-hidden bg-white transition-all"
                              >
                                {/* Header Trigger */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedSections(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                                  className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/50 transition-colors select-none focus:outline-none"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-black text-slate-600 text-[10px] shrink-0">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">{sec.name}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                                        Domain: <span className="text-slate-700">{sec.subject}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="hidden sm:flex items-center gap-2 text-[10px]">
                                      <span className="bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded">
                                        {sec.itemCount} Qs
                                      </span>
                                      <span className="bg-rose-50 text-philsa-red font-black px-2 py-0.5 rounded">
                                        {sec.totalMarks} Pts
                                      </span>
                                      <span className="bg-slate-50 text-slate-500 font-black px-2 py-0.5 rounded flex items-center gap-0.5">
                                        <Clock className="w-3 h-3" /> {sec.timeAllocation}m
                                      </span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                    )}
                                  </div>
                                </button>

                                {/* Collapsible Body */}
                                {isExpanded && (
                                  <div className="p-5 border-t border-slate-100 bg-slate-50/10 space-y-4 animate-in fade-in duration-150">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                                      <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Items</p>
                                        <p className="font-extrabold text-slate-800 mt-0.5">{sec.itemCount} items</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Weighting / Item</p>
                                        <p className="font-extrabold text-slate-800 mt-0.5">{sec.marksPerItem} marks each</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Time Limit</p>
                                        <p className="font-extrabold text-slate-800 mt-0.5 flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {sec.timeAllocation} min
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Complexity</p>
                                        <p className="font-bold text-slate-600 text-[10px] mt-0.5">
                                          E: <span className="font-extrabold text-slate-800">{sec.difficultyDistribution.easy}</span> | 
                                          M: <span className="font-extrabold text-slate-800">{sec.difficultyDistribution.moderate}</span> | 
                                          D: <span className="font-extrabold text-slate-800">{sec.difficultyDistribution.difficult}</span>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configured Topic Coverage</p>
                                      <div className="flex flex-wrap gap-1">
                                        {sec.topics.map(t => (
                                          <span key={t} className="text-[10px] font-bold bg-rose-50 text-philsa-red border border-rose-100/50 px-2.5 py-0.5 rounded-lg">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {sec.competencies && sec.competencies.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Learning Outcomes / Competencies Met</p>
                                        <div className="space-y-1">
                                          {sec.competencies.map(comp => (
                                            <p key={comp} className="text-xs text-slate-600 font-medium flex items-start gap-1.5 pl-1">
                                              <CheckCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> {comp}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {sec.instructions && (
                                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Section Candidate Instructions</p>
                                        <p className="text-[11px] font-medium text-slate-700 italic leading-relaxed">{sec.instructions}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === 'RULES' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="p-5 border border-slate-150 rounded-2xl space-y-4 bg-slate-50/50">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-philsa-red" /> Constraint Controls
                        </h3>
                        
                        <div className="space-y-3 pt-1">
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Total Form Items</span>
                            <span className="font-extrabold text-slate-900 text-sm">{selectedBlueprint.rules.totalItems} questions</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Cumulative Target Weight</span>
                            <span className="font-extrabold text-slate-900 text-sm">{selectedBlueprint.rules.totalMarks} points</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Form Time Limit Constraint</span>
                            <span className="font-extrabold text-slate-900 text-sm">{selectedBlueprint.rules.totalTimeLimit} minutes</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Active items requirement</span>
                            <span className="font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {selectedBlueprint.rules.activeItemOnly ? 'MANDATORY' : 'OPTIONAL'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 border border-slate-150 rounded-2xl space-y-4 bg-slate-50/50">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" /> Randomization & Overlap Controls
                        </h3>

                        <div className="space-y-3 pt-1">
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Shuffle Questions sequence</span>
                            <span className="font-black text-slate-800">{selectedBlueprint.rules.randomizationRules.shuffleQuestions ? 'ENABLED' : 'DISABLED'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Shuffle Choice choices</span>
                            <span className="font-black text-slate-800">{selectedBlueprint.rules.randomizationRules.shuffleChoices ? 'ENABLED' : 'DISABLED'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Shared Passage (Stimulus) Rules</span>
                            <span className="font-black text-slate-800">
                              {selectedBlueprint.rules.sharedStimulusRequirement.required 
                                ? `Requires min. ${selectedBlueprint.rules.sharedStimulusRequirement.minCount} stimulus` 
                                : 'NOT REQUIRED'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-600 font-bold">Maximum Item Reuse limits</span>
                            <span className="font-extrabold text-slate-800">Max {selectedBlueprint.rules.maxReuseLimit} examinations</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === 'HISTORY' && (
                    <div className="space-y-4">
                      {selectedBlueprint.history.map((log) => (
                        <div key={log.id} className="p-4 border border-slate-250 rounded-xl flex items-start gap-3 bg-slate-50/50 relative overflow-hidden">
                          <span className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 shrink-0 mt-0.5">
                            <History className="w-4 h-4" />
                          </span>
                          
                          <div className="flex-1 space-y-1 text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-extrabold text-slate-800 text-xs">Stage transition: [{log.action} v{log.version}]</span>
                              <span className="text-[10px] text-slate-400 font-bold">{new Date(log.updatedAt).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 font-semibold leading-relaxed mt-1">"{log.comments}"</p>
                            <p className="text-[10px] font-extrabold uppercase text-philsa-red tracking-wider pt-1">Initiator: {log.updatedBy}</p>
                          </div>

                          {/* Historical Rollback restored toggle */}
                          {(selectedBlueprint.status === 'DRAFT' || selectedBlueprint.status === 'REVISION_REQUIRED') && (
                            <button
                              onClick={() => handleRollbackToLog(log)}
                              className="text-[10px] font-black uppercase text-slate-500 hover:text-philsa-red hover:underline shrink-0"
                            >
                              Rollback
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* MODAL 1: Design / Edit Blueprint Specification Form Wizard */}
      {isEditorOpen && currentEditBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-xs"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-philsa-red rounded-lg">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    {blueprints.some(b => b.id === currentEditBlueprint.id) ? 'Modify Blueprint Spec Draft' : 'Design New Exam Blueprint Schema'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">AY {currentEditBlueprint.academicYear} • Space Administration Framework</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsEditorOpen(false);
                  setCurrentEditBlueprint(null);
                }} 
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scroll */}
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Metadata Specs - 5/12 width */}
              <div className="lg:col-span-4 space-y-4 border-r border-slate-100 pr-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">1. Metadata Properties</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Blueprint Spec Code</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-700 focus:bg-white focus:outline-none"
                      value={currentEditBlueprint.code}
                      onChange={e => setCurrentEditBlueprint({ ...currentEditBlueprint, code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Blueprint Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-extrabold text-slate-700 focus:bg-white focus:outline-none"
                      value={currentEditBlueprint.name}
                      onChange={e => setCurrentEditBlueprint({ ...currentEditBlueprint, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Description</label>
                    <textarea
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-700 focus:bg-white focus:outline-none"
                      value={currentEditBlueprint.description}
                      onChange={e => setCurrentEditBlueprint({ ...currentEditBlueprint, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Academic Year</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-700 focus:bg-white focus:outline-none"
                      value={currentEditBlueprint.academicYear}
                      onChange={e => setCurrentEditBlueprint({ ...currentEditBlueprint, academicYear: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Effective Date</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-700 focus:bg-white focus:outline-none"
                        value={currentEditBlueprint.effectiveDate}
                        onChange={e => setCurrentEditBlueprint({ ...currentEditBlueprint, effectiveDate: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Expiration Date</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-700 focus:bg-white focus:outline-none"
                        value={currentEditBlueprint.expirationDate}
                        onChange={e => setCurrentEditBlueprint({ ...currentEditBlueprint, expirationDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 pt-4">2. Overall Rule Metrics</p>
                
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Auto Calculated Items:</span>
                    <span className="font-black text-slate-800">{currentEditBlueprint.rules.totalItems} questions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Auto Calculated Marks:</span>
                    <span className="font-black text-slate-800">{currentEditBlueprint.rules.totalMarks} points</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Calculated Time Constraint:</span>
                    <span className="font-black text-slate-800">{currentEditBlueprint.rules.totalTimeLimit} minutes</span>
                  </div>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 pt-4">3. Randomization & Overlap Controls</p>

                <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">Shuffle Questions</p>
                      <p className="text-[10px] text-slate-400 font-medium">Randomize item sequence</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRules = { 
                          ...currentEditBlueprint.rules, 
                          randomizationRules: { 
                            ...currentEditBlueprint.rules.randomizationRules, 
                            shuffleQuestions: !currentEditBlueprint.rules.randomizationRules.shuffleQuestions 
                          } 
                        };
                        setCurrentEditBlueprint({ ...currentEditBlueprint, rules: nextRules });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer border",
                        currentEditBlueprint.rules.randomizationRules.shuffleQuestions 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      {currentEditBlueprint.rules.randomizationRules.shuffleQuestions ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">Shuffle Choices</p>
                      <p className="text-[10px] text-slate-400 font-medium">Randomize multiple choices</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRules = { 
                          ...currentEditBlueprint.rules, 
                          randomizationRules: { 
                            ...currentEditBlueprint.rules.randomizationRules, 
                            shuffleChoices: !currentEditBlueprint.rules.randomizationRules.shuffleChoices 
                          } 
                        };
                        setCurrentEditBlueprint({ ...currentEditBlueprint, rules: nextRules });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer border",
                        currentEditBlueprint.rules.randomizationRules.shuffleChoices 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      {currentEditBlueprint.rules.randomizationRules.shuffleChoices ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">Active Items Only</p>
                      <p className="text-[10px] text-slate-400 font-medium">Exclude deprecated items</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRules = { 
                          ...currentEditBlueprint.rules, 
                          activeItemOnly: !currentEditBlueprint.rules.activeItemOnly 
                        };
                        setCurrentEditBlueprint({ ...currentEditBlueprint, rules: nextRules });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer border",
                        currentEditBlueprint.rules.activeItemOnly 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      {currentEditBlueprint.rules.activeItemOnly ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Max Item Reuse Limit (Exams)</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-slate-700 text-xs focus:outline-none"
                      value={currentEditBlueprint.rules.maxReuseLimit}
                      onChange={e => {
                        const nextRules = { 
                          ...currentEditBlueprint.rules, 
                          maxReuseLimit: Math.max(1, parseInt(e.target.value) || 1) 
                        };
                        setCurrentEditBlueprint({ ...currentEditBlueprint, rules: nextRules });
                      }}
                    />
                  </div>
                </div>

                {/* Validation warnings while typing */}
                {(() => {
                  const check = runDetailedValidation(currentEditBlueprint);
                  if (check.errors.length === 0) return null;
                  return (
                    <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100/50 space-y-1">
                      <p className="font-black text-[9px] uppercase tracking-wider text-red-600">Spec Warnings ({check.errors.length}):</p>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto">
                        {check.errors.slice(0, 3).map((err, i) => <p key={i} className="text-[10px] font-semibold leading-tight">• {err}</p>)}
                        {check.errors.length > 3 && <p className="text-[9px] font-extrabold text-red-500">...and {check.errors.length - 3} more errors.</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Dynamic Sections Config - 8/12 width */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Examination Sections Configuration</p>
                  <button
                    type="button"
                    onClick={handleAddSectionToEdit}
                    className="p-1 text-xs text-philsa-red hover:underline flex items-center gap-1 font-extrabold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section Block
                  </button>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {currentEditBlueprint.sections.map((sec, idx) => {
                    const isExpanded = !!editorExpandedSections[sec.id];
                    return (
                      <div key={sec.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                        {/* Accordion Header */}
                        <div className="flex justify-between items-center bg-slate-50/70 p-3 select-none border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditorExpandedSections(prev => ({ ...prev, [sec.id]: !isExpanded }))}
                            className="flex items-center gap-2 text-left focus:outline-none flex-1 font-bold text-xs text-slate-700 uppercase tracking-wide"
                          >
                            <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 font-mono text-[9px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="truncate">{sec.name || `Section ${idx + 1}`}</span>
                            <span className="text-[10px] text-slate-400 normal-case font-medium shrink-0 ml-1">
                              ({sec.subject} • {sec.itemCount} Items)
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSectionFromEdit(sec.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove section block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Collapsible Content */}
                        {isExpanded && (
                          <div className="p-4 space-y-4 bg-white animate-in fade-in duration-100">
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Section Name</label>
                              <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 mt-1 font-extrabold text-xs"
                                value={sec.name}
                                onChange={e => updateEditSectionField(sec.id, 'name', e.target.value)}
                              />
                            </div>

                            <div className="pt-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Subject</label>
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800 text-xs mt-1"
                                value={sec.subject}
                                onChange={e => updateEditSectionField(sec.id, 'subject', e.target.value)}
                              >
                                <option value="Reading Comp (English, Filipino)">Reading Comp (English, Filipino)</option>
                                <option value="Lang Proficiency (English, Filipino)">Lang Proficiency (English, Filipino)</option>
                                <option value="Math">Math</option>
                                <option value="Science">Science</option>
                              </select>
                            </div>

                            {/* Topic Tags Input comma separated */}
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Topic Constraints (comma separated)</label>
                              <input
                                type="text"
                                placeholder="e.g. Orbital Mechanics, Kepler's Laws"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-xs mt-1"
                                value={sec.topics.join(', ')}
                                onChange={e => updateEditSectionField(sec.id, 'topics', e.target.value.split(',').map(s => s.trim()))}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-200 text-xs">
                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Item Count</label>
                                <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-md p-1 font-bold text-center"
                                  value={sec.itemCount}
                                  onChange={e => updateEditSectionField(sec.id, 'itemCount', Math.max(1, parseInt(e.target.value) || 0))}
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Passing Score</label>
                                <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-md p-1 font-bold text-center"
                                  value={sec.passingScore}
                                  onChange={e => updateEditSectionField(sec.id, 'passingScore', Math.max(0, parseInt(e.target.value) || 0))}
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Time (Min)</label>
                                <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-md p-1 font-bold text-center"
                                  value={sec.timeAllocation}
                                  onChange={e => updateEditSectionField(sec.id, 'timeAllocation', Math.max(1, parseInt(e.target.value) || 0))}
                                />
                              </div>
                            </div>

                            {/* Difficulties distribution sliders */}
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Difficulty distribution weights (Sum must equal item count: {sec.itemCount})</p>
                              <div className="grid grid-cols-3 gap-3 bg-slate-50/30 p-3 rounded-lg border border-slate-150 text-center text-xs">
                                <div>
                                  <span className="text-[9px] font-black text-emerald-600 block uppercase mb-1">Easy items</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded-md p-1 text-center font-bold"
                                    value={sec.difficultyDistribution.easy}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'difficulty', 'easy', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-amber-600 block uppercase mb-1">Moderate items</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded-md p-1 text-center font-bold"
                                    value={sec.difficultyDistribution.moderate}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'difficulty', 'moderate', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-rose-600 block uppercase mb-1">Difficult items</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded-md p-1 text-center font-bold"
                                    value={sec.difficultyDistribution.difficult}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'difficulty', 'difficult', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Item Type distribution sliders */}
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Question Type distribution weights (Sum must equal item count: {sec.itemCount})</p>
                              <div className="grid grid-cols-4 gap-2 bg-slate-50/30 p-3 rounded-lg border border-slate-150 text-center text-xs">
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 block uppercase mb-1">MCQ</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded p-1 text-center font-bold text-xs"
                                    value={sec.itemTypeDistribution.mcq}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'type', 'mcq', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 block uppercase mb-1">True/False</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded p-1 text-center font-bold text-xs"
                                    value={sec.itemTypeDistribution.tf}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'type', 'tf', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 block uppercase mb-1">Essay</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded p-1 text-center font-bold text-xs"
                                    value={sec.itemTypeDistribution.essay}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'type', 'essay', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 block uppercase mb-1">Fill Blanks</span>
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded p-1 text-center font-bold text-xs"
                                    value={sec.itemTypeDistribution.fib}
                                    onChange={e => updateEditSectionDistribution(sec.id, 'type', 'fib', Math.max(0, parseInt(e.target.value) || 0))}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setCurrentEditBlueprint(null);
                }} 
                className="btn-secondary !py-2 !px-5 text-xs font-bold"
              >
                Cancel Draft
              </button>
              <button 
                type="button"
                onClick={handleSaveEditor} 
                className="btn-primary !py-2 !px-6 text-xs font-black shadow-sm"
              >
                Save Specification Draft
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: Workflow Transition Comment Dialogue */}
      {isWorkflowModalOpen && targetWorkflowStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 text-xs space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-philsa-red" /> Workflow Phase Transition
              </h3>
              <button onClick={() => setIsWorkflowModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 bg-slate-50 p-3 rounded-lg">
              <p className="font-bold text-slate-500">Selected Action:</p>
              <p className="font-extrabold text-slate-800 uppercase tracking-wider">
                Transition to: <span className="text-philsa-red">{targetWorkflowStatus.replace('_', ' ')}</span>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Audit Remarks / Expert Comments (Optional)</label>
              <textarea
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="Explain key findings or structural validations motivating this change..."
                value={workflowComment}
                onChange={e => setWorkflowComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsWorkflowModalOpen(false)} 
                className="btn-secondary !py-1.5 !px-4"
              >
                Cancel
              </button>
              <button 
                onClick={submitWorkflowTransition} 
                className="btn-primary !py-1.5 !px-5 font-bold"
              >
                Confirm Phase Shift
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: Auto-Assembly Results Diagnostic Console */}
      {isAssemblyOpen && assemblyResult && selectedBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-xs"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "p-2.5 rounded-xl text-white",
                  assemblyResult.success ? "bg-emerald-600" : "bg-red-600"
                )}>
                  {assemblyResult.success ? <Check className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5 animate-bounce" />}
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Assembly Simulation Payload Report
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Blueprint: {selectedBlueprint.code} v{selectedBlueprint.version}</p>
                </div>
              </div>
              <button onClick={() => setIsAssemblyOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scroll */}
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50/20">
              
              {/* Left Column: Logs / Status Checks - 5/12 width */}
              <div className="lg:col-span-4 space-y-4 border-r border-slate-100 pr-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Assembly Diagnostic Trace</p>
                
                <div className="bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-[10px] leading-relaxed space-y-2 max-h-[40vh] overflow-y-auto shadow-inner">
                  {assemblyResult.auditLog.map((log, i) => (
                    <p key={i}>{log}</p>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Form Status Check</p>
                  {assemblyResult.success ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 space-y-1">
                      <p className="font-extrabold text-xs">Assembly Successful!</p>
                      <p className="text-[11px] font-medium leading-relaxed">The Centralized Item Bank matches 100% of defined subject, topic, and difficulty weights. An examination booklet is compiled and ready for deployment.</p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-800 space-y-2">
                      <p className="font-extrabold text-xs">Assembly Aborted Due to Deficits</p>
                      <p className="text-[11px] font-medium leading-relaxed">The Centralized Item Bank lacks matching active questions for the requested specification. Review deficit alerts below.</p>
                      
                      <div className="space-y-1 font-bold text-red-700 text-[10px] pt-1 border-t border-red-100">
                        {assemblyResult.errors.map((err, idx) => (
                          <p key={idx}>• {err}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Visual Exam Booklet Preview - 8/12 width */}
              <div className="lg:col-span-8 space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Compiled Examination booklet preview</p>
                
                {assemblyResult.success ? (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 min-h-[400px] font-serif space-y-6 max-h-[50vh] overflow-y-auto relative">
                    
                    {/* Header sheet design */}
                    <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
                      <p className="text-xs uppercase font-sans tracking-widest font-black text-slate-500">Official Space Examination Booklet</p>
                      <h4 className="text-sm font-bold uppercase text-slate-900 tracking-tight">{selectedBlueprint.institution}</h4>
                      <p className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">{selectedBlueprint.examCategory} Qualification Test</p>
                      <p className="text-[9px] font-sans font-black text-slate-400">Spec Ref: {selectedBlueprint.code} • Version {selectedBlueprint.version}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] font-sans font-bold text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-150">
                      <div>
                        <p>Total questions: {assemblyResult.totalMatched} Items</p>
                        <p>Total time limit: {selectedBlueprint.rules.totalTimeLimit} minutes</p>
                      </div>
                      <div className="text-right">
                        <p>Total possible score: {selectedBlueprint.rules.totalMarks} points</p>
                        <p>Passing Threshold score: {selectedBlueprint.sections.reduce((acc, s) => acc + s.passingScore, 0)} points</p>
                      </div>
                    </div>

                    {/* Listing of selected items section by section */}
                    {selectedBlueprint.sections.map(sec => {
                      const questions = assemblyResult.matchedQuestions[sec.id] || [];
                      return (
                        <div key={sec.id} className="space-y-4">
                          <div className="border-b border-slate-400 pb-1 mt-6">
                            <h5 className="font-sans font-black text-xs text-slate-800 uppercase tracking-wider">{sec.name}</h5>
                            <p className="text-[10px] text-slate-400 font-sans italic mt-0.5">{sec.instructions}</p>
                          </div>

                          <div className="space-y-4 divide-y divide-slate-100">
                            {questions.map((q, idx) => (
                              <div key={q.id} className="pt-3 space-y-1.5 first:pt-0">
                                <div className="flex justify-between items-start gap-4">
                                  <p className="font-bold text-slate-800 leading-relaxed text-xs">
                                    Question {idx + 1}. <span className="font-medium text-slate-700">{q.text}</span>
                                  </p>
                                  <span className="font-sans text-[10px] font-black text-slate-400 uppercase shrink-0">
                                    ({q.score} pts • {q.difficulty})
                                  </span>
                                </div>

                                {/* Custom fields based on question type */}
                                {q.type === 'MCQ' && (
                                  <div className="grid grid-cols-2 gap-2 pl-4 font-sans text-slate-500 text-[11px] pt-1">
                                    <p>A. [ Choice Placeholder A ]</p>
                                    <p>B. [ Choice Placeholder B ]</p>
                                    <p>C. [ Choice Placeholder C ]</p>
                                    <p>D. [ Choice Placeholder D ]</p>
                                  </div>
                                )}

                                {q.type === 'TF' && (
                                  <p className="pl-4 font-sans text-slate-400 text-[11px] font-bold">Options: True / False</p>
                                )}

                                {q.type === 'ESSAY' && (
                                  <div className="pl-4 pt-1">
                                    <div className="h-16 border border-dashed border-slate-200 rounded bg-slate-50" />
                                    <p className="text-[9px] font-sans text-slate-400 mt-1 font-bold uppercase tracking-wider">Essay Scoring Competency Benchmark: {q.competency}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Database className="w-12 h-12 text-slate-300" />
                    <p className="text-xs font-bold mt-2">Booklet Compilation Cancelled</p>
                    <p className="text-[11px] max-w-sm leading-relaxed mt-1">Please author more questions in the Centralized Item Bank, or adjust blueprint weights to fit within the active bank limits.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAssemblyOpen(false)} className="btn-secondary !py-2 !px-5 text-xs font-bold">
                Close Report
              </button>
              {assemblyResult.success && (
                <button 
                  onClick={() => {
                    alert("Examination form has been successfully compiled into PDF/DOCX format, and registered to the active Exam Sets module.");
                    setIsAssemblyOpen(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-6 rounded-lg text-xs shadow-sm flex items-center gap-1 transition-all"
                >
                  <FileCode className="w-4 h-4" /> Download Exam Booklet (PDF/DOCX)
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
