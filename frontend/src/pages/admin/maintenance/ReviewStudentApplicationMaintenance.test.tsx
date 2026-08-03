import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ReviewStudentApplicationMaintenance from './ReviewStudentApplicationMaintenance';

const STORAGE_KEY = 'philsa_review_student_app_configs';

describe('ReviewStudentApplicationMaintenance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads the updated source defaults when no saved configuration exists', () => {
    render(<ReviewStudentApplicationMaintenance />);

    expect(screen.getByText('APP-002')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(7);
  });

  it('restores a saved configuration', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'app_st_custom', category: 'Application Status', code: 'APP-099', name: 'Custom', status: 'Active' }]),
    );

    render(<ReviewStudentApplicationMaintenance />);

    expect(screen.getByText('APP-099')).toBeInTheDocument();
  });
});
