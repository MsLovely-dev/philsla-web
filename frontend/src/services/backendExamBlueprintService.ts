import type { Blueprint, BlueprintHistoryEntry, BlueprintRules, BlueprintSection } from '../pages/admin/hub/blueprintMockData';
import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

type ApiBlueprintStatus = Blueprint['status'];

interface ApiBlueprintSection {
  id: string;
  name: string;
  subject: string;
  topics: string[];
  competencies: string[];
  cognitive_levels: BlueprintSection['cognitiveLevels'];
  item_count: number;
  marks_per_item: number;
  total_marks: number;
  passing_score: number;
  time_allocation: number;
  instructions: string;
  difficulty_distribution: BlueprintSection['difficultyDistribution'];
  item_type_distribution: BlueprintSection['itemTypeDistribution'];
}

interface ApiBlueprintRules {
  total_items: number;
  total_marks: number;
  total_time_limit: number;
  shared_stimulus_requirement: {
    required: boolean;
    min_count: number;
    questions_per_stimulus: number;
  };
  randomization_rules: {
    shuffle_questions: boolean;
    shuffle_choices: boolean;
    fixed_sequence: boolean;
  };
  max_reuse_limit: number;
  version_compatibility: string;
  active_item_only: boolean;
}

interface ApiBlueprintHistoryEntry {
  id: string;
  version: string;
  action: string;
  updated_by: string;
  updated_at: string;
  comments: string;
}

interface ApiBlueprint {
  id: string;
  code: string;
  name: string;
  description: string;
  exam_type: string;
  academic_year: string;
  institution: string;
  exam_category: string;
  status: ApiBlueprintStatus;
  version: string;
  owner: string;
  created_at: string;
  effective_date: string | null;
  expiration_date: string | null;
  sections: ApiBlueprintSection[];
  rules: ApiBlueprintRules;
  history: ApiBlueprintHistoryEntry[];
}

interface ApiBlueprintPayload {
  code: string;
  name: string;
  description: string;
  exam_type: string;
  academic_year: string;
  institution: string;
  exam_category: string;
  status?: string;
  version: string;
  effective_date: string | null;
  expiration_date: string | null;
  sections: ApiBlueprintSectionPayload[];
  rules: ApiBlueprintRules;
}

interface ApiBlueprintSectionPayload {
  id?: string;
  name: string;
  subject: string;
  topics: string[];
  competencies: string[];
  cognitive_levels: BlueprintSection['cognitiveLevels'];
  item_count: number;
  marks_per_item: number;
  total_marks: number;
  passing_score: number;
  time_allocation: number;
  instructions: string;
  difficulty_distribution: BlueprintSection['difficultyDistribution'];
  item_type_distribution: BlueprintSection['itemTypeDistribution'];
}

export interface BlueprintTransitionInput {
  status: Blueprint['status'];
  remarks?: string;
}

type BlueprintListResult = ServiceResult<ApiBlueprint[]>;
type BlueprintItemResult = ServiceResult<ApiBlueprint>;

export class BackendExamBlueprintService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listBlueprints(): Promise<ServiceResult<Blueprint[]>> {
    return this.mapListResult(await this.apiClient.request<ApiBlueprint[]>('/api/v1/exams/blueprints/'));
  }

  async createBlueprint(blueprint: Blueprint): Promise<ServiceResult<Blueprint>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiBlueprint>('/api/v1/exams/blueprints/', {
        method: 'POST',
        body: JSON.stringify(this.toApiPayload(blueprint)),
      }),
    );
  }

  async updateBlueprint(blueprint: Blueprint): Promise<ServiceResult<Blueprint>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiBlueprint>(`/api/v1/exams/blueprints/${blueprint.id}/`, {
        method: 'PUT',
        body: JSON.stringify(this.toApiPayload(blueprint)),
      }),
    );
  }

  async cloneBlueprint(blueprintId: string): Promise<ServiceResult<Blueprint>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiBlueprint>(`/api/v1/exams/blueprints/${blueprintId}/clone/`, {
        method: 'POST',
      }),
    );
  }

  async transitionBlueprint(blueprintId: string, input: BlueprintTransitionInput): Promise<ServiceResult<Blueprint>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiBlueprint>(`/api/v1/exams/blueprints/${blueprintId}/transition/`, {
        method: 'POST',
        body: JSON.stringify({
          status: input.status.toLowerCase(),
          remarks: input.remarks ?? '',
        }),
      }),
    );
  }

  deleteBlueprint(blueprintId: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`/api/v1/exams/blueprints/${blueprintId}/`, {
      method: 'DELETE',
    });
  }

  private mapListResult(result: BlueprintListResult): ServiceResult<Blueprint[]> {
    if (!result.ok) {
      return result;
    }
    return { ...result, data: result.data.map((item) => this.fromApiBlueprint(item)) };
  }

  private mapItemResult(result: BlueprintItemResult): ServiceResult<Blueprint> {
    if (!result.ok) {
      return result;
    }
    return { ...result, data: this.fromApiBlueprint(result.data) };
  }

  private fromApiBlueprint(blueprint: ApiBlueprint): Blueprint {
    return {
      id: blueprint.id,
      code: blueprint.code,
      name: blueprint.name,
      description: blueprint.description,
      examType: blueprint.exam_type,
      academicYear: blueprint.academic_year,
      institution: blueprint.institution,
      examCategory: blueprint.exam_category,
      status: blueprint.status,
      version: blueprint.version,
      owner: blueprint.owner,
      createdAt: blueprint.created_at,
      effectiveDate: blueprint.effective_date ?? '',
      expirationDate: blueprint.expiration_date ?? '',
      sections: blueprint.sections.map((section) => this.fromApiSection(section)),
      rules: this.fromApiRules(blueprint.rules),
      history: blueprint.history.map((entry) => this.fromApiHistoryEntry(entry)),
    };
  }

  private fromApiSection(section: ApiBlueprintSection): BlueprintSection {
    return {
      id: section.id,
      name: section.name,
      subject: section.subject,
      topics: section.topics,
      competencies: section.competencies,
      cognitiveLevels: section.cognitive_levels,
      itemCount: section.item_count,
      marksPerItem: section.marks_per_item,
      totalMarks: section.total_marks,
      passingScore: section.passing_score,
      timeAllocation: section.time_allocation,
      instructions: section.instructions,
      difficultyDistribution: section.difficulty_distribution,
      itemTypeDistribution: section.item_type_distribution,
    };
  }

  private fromApiRules(rules: ApiBlueprintRules): BlueprintRules {
    return {
      totalItems: rules.total_items,
      totalMarks: rules.total_marks,
      totalTimeLimit: rules.total_time_limit,
      sharedStimulusRequirement: {
        required: rules.shared_stimulus_requirement.required,
        minCount: rules.shared_stimulus_requirement.min_count,
        questionsPerStimulus: rules.shared_stimulus_requirement.questions_per_stimulus,
      },
      randomizationRules: {
        shuffleQuestions: rules.randomization_rules.shuffle_questions,
        shuffleChoices: rules.randomization_rules.shuffle_choices,
        fixedSequence: rules.randomization_rules.fixed_sequence,
      },
      maxReuseLimit: rules.max_reuse_limit,
      versionCompatibility: rules.version_compatibility,
      activeItemOnly: rules.active_item_only,
    };
  }

  private fromApiHistoryEntry(entry: ApiBlueprintHistoryEntry): BlueprintHistoryEntry {
    return {
      id: entry.id,
      version: entry.version,
      action: entry.action,
      updatedBy: entry.updated_by,
      updatedAt: entry.updated_at,
      comments: entry.comments,
    };
  }

  private toApiPayload(blueprint: Blueprint): ApiBlueprintPayload {
    return {
      code: blueprint.code,
      name: blueprint.name,
      description: blueprint.description,
      exam_type: blueprint.examType,
      academic_year: blueprint.academicYear,
      institution: blueprint.institution,
      exam_category: blueprint.examCategory,
      status: blueprint.status.toLowerCase(),
      version: blueprint.version,
      effective_date: blueprint.effectiveDate || null,
      expiration_date: blueprint.expirationDate || null,
      sections: blueprint.sections.map((section) => this.toApiSection(section)),
      rules: this.toApiRules(blueprint.rules),
    };
  }

  private toApiSection(section: BlueprintSection): ApiBlueprintSectionPayload {
    return {
      id: section.id,
      name: section.name,
      subject: section.subject,
      topics: section.topics,
      competencies: section.competencies,
      cognitive_levels: section.cognitiveLevels,
      item_count: section.itemCount,
      marks_per_item: section.marksPerItem,
      total_marks: section.totalMarks,
      passing_score: section.passingScore,
      time_allocation: section.timeAllocation,
      instructions: section.instructions,
      difficulty_distribution: section.difficultyDistribution,
      item_type_distribution: section.itemTypeDistribution,
    };
  }

  private toApiRules(rules: BlueprintRules): ApiBlueprintRules {
    return {
      total_items: rules.totalItems,
      total_marks: rules.totalMarks,
      total_time_limit: rules.totalTimeLimit,
      shared_stimulus_requirement: {
        required: rules.sharedStimulusRequirement.required,
        min_count: rules.sharedStimulusRequirement.minCount,
        questions_per_stimulus: rules.sharedStimulusRequirement.questionsPerStimulus,
      },
      randomization_rules: {
        shuffle_questions: rules.randomizationRules.shuffleQuestions,
        shuffle_choices: rules.randomizationRules.shuffleChoices,
        fixed_sequence: rules.randomizationRules.fixedSequence,
      },
      max_reuse_limit: rules.maxReuseLimit,
      version_compatibility: rules.versionCompatibility,
      active_item_only: rules.activeItemOnly,
    };
  }
}

export const examBlueprintService = new BackendExamBlueprintService();
