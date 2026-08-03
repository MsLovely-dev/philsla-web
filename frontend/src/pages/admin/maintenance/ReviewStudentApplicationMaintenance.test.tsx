import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import MaintenancePageTemplate from '../../../components/maintenance/MaintenancePageTemplate';
import ReviewStudentApplicationMaintenance from './ReviewStudentApplicationMaintenance';

const LEGACY_STORAGE_KEY = 'philsa_review_student_app_configs';

describe('ReviewStudentApplicationMaintenance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty and clears legacy mock configuration', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify([{ id: 'app_st_1', category: 'Application Status', code: 'APP-002' }]),
    );

    render(<ReviewStudentApplicationMaintenance />);

    expect(screen.getByText('No Records Found')).toBeInTheDocument();
    expect(screen.queryByText('APP-002')).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('does not invent audit or approval values when a row omits them', () => {
    render(
      <MaintenancePageTemplate
        title="Configuration"
        subtitle="Configuration records"
        columns={[{ key: 'code', label: 'Code' }]}
        data={[{ id: 'configuration-1', code: 'CFG-001' }]}
        fields={[]}
      />,
    );

    expect(screen.queryByText('admin_user')).not.toBeInTheDocument();
    expect(screen.queryByText('2026-05-14 08:30')).not.toBeInTheDocument();
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
  });
});
