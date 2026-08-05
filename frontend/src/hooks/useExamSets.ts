import { useCallback, useEffect, useRef, useState } from 'react';
import type { Blueprint } from '../pages/admin/hub/blueprintMockData';
import { examBlueprintService, type BackendExamBlueprintService } from '../services/backendExamBlueprintService';
import { examSetService, type BackendExamSetService, type ExamSetDraft, type ExamSetRecord, type ExamSetTransitionInput } from '../services/backendExamSetService';
import { BackendQuestionBankService, type QuestionBankItem } from '../services/backendQuestionBankService';
import type { ServiceError, ServiceResult } from '../services/serviceResult';

export type ExamSetsLoadState = 'loading' | 'ready' | 'empty' | 'error';
export type ExamSetsMutationState = 'idle' | 'pending';

export interface UseExamSetsServices {
  examSetService: Pick<BackendExamSetService, 'listExamSets' | 'createExamSet' | 'updateExamSet' | 'cloneExamSet' | 'transitionExamSet' | 'deleteExamSet'>;
  blueprintService: Pick<BackendExamBlueprintService, 'listBlueprints'>;
  questionBankService: Pick<BackendQuestionBankService, 'listQuestions'>;
}

const defaultServices: UseExamSetsServices = {
  examSetService,
  blueprintService: examBlueprintService,
  questionBankService: new BackendQuestionBankService(),
};

export function useExamSets(services: UseExamSetsServices = defaultServices) {
  const [examSets, setExamSets] = useState<ExamSetRecord[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loadState, setLoadState] = useState<ExamSetsLoadState>('loading');
  const [loadError, setLoadError] = useState<ServiceError | null>(null);
  const [mutationState, setMutationState] = useState<ExamSetsMutationState>('idle');
  const [mutationError, setMutationError] = useState<ServiceError | null>(null);
  const loadGeneration = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    const generation = ++loadGeneration.current;
    setLoadState('loading');
    setLoadError(null);

    const [examSetResult, blueprintResult, questionResult] = await Promise.all([
      services.examSetService.listExamSets(),
      services.blueprintService.listBlueprints(),
      services.questionBankService.listQuestions(),
    ]);

    if (!mounted.current || generation !== loadGeneration.current) return;

    const failure = [examSetResult, blueprintResult, questionResult].find((result) => result.ok === false);
    if (failure?.ok === false) {
      setLoadError(failure.error);
      setLoadState('error');
      return;
    }

    if (examSetResult.ok && blueprintResult.ok && questionResult.ok) {
      setExamSets(examSetResult.data);
      setBlueprints(blueprintResult.data);
      setQuestions(questionResult.data);
      setLoadState(examSetResult.data.length > 0 ? 'ready' : 'empty');
    }
  }, [services.blueprintService, services.examSetService, services.questionBankService]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyMutation = useCallback(async (
    request: () => Promise<ServiceResult<ExamSetRecord>>,
  ): Promise<ServiceResult<ExamSetRecord>> => {
    setMutationState('pending');
    setMutationError(null);
    const result = await request();
    if (!mounted.current) return result;

    if (result.ok === false) {
      setMutationError(result.error);
      setMutationState('idle');
      return result;
    }

    setExamSets((current) => {
      const exists = current.some((record) => record.id === result.data.id);
      return exists
        ? current.map((record) => record.id === result.data.id ? result.data : record)
        : [result.data, ...current];
    });
    setLoadState('ready');
    setMutationState('idle');
    return result;
  }, []);

  const create = useCallback(
    (draft: ExamSetDraft) => applyMutation(() => services.examSetService.createExamSet(draft)),
    [applyMutation, services.examSetService],
  );

  const update = useCallback(
    (id: string, draft: ExamSetDraft) => applyMutation(() => services.examSetService.updateExamSet(id, draft)),
    [applyMutation, services.examSetService],
  );

  const clone = useCallback(
    (id: string) => applyMutation(() => services.examSetService.cloneExamSet(id)),
    [applyMutation, services.examSetService],
  );

  const transition = useCallback(
    (id: string, input: ExamSetTransitionInput) => applyMutation(() => services.examSetService.transitionExamSet(id, input)),
    [applyMutation, services.examSetService],
  );

  const remove = useCallback(async (id: string): Promise<ServiceResult<null>> => {
    setMutationState('pending');
    setMutationError(null);
    const result = await services.examSetService.deleteExamSet(id);
    if (!mounted.current) return result;

    if (result.ok === false) {
      setMutationError(result.error);
      setMutationState('idle');
      return result;
    }

    setExamSets((current) => {
      const next = current.filter((record) => record.id !== id);
      setLoadState(next.length > 0 ? 'ready' : 'empty');
      return next;
    });
    setMutationState('idle');
    return result;
  }, [services.examSetService]);

  return {
    examSets,
    blueprints,
    questions,
    loadState,
    loadError,
    mutationState,
    mutationError,
    reload,
    create,
    update,
    clone,
    transition,
    remove,
  };
}
