// Selects the local or Supabase content store for the combined admin server.
import {
  createResearch,
  readAdminContent,
  reorderResearch,
  saveProfile,
  trashResearch,
  updateResearch,
} from './store';
import {
  createCloudResearch,
  readCloudAdminContent,
  reorderCloudResearch,
  saveCloudProfile,
  trashCloudResearch,
  updateCloudResearch,
} from '@/lib/supabase/cloud-store';

const cloud = () => process.env.PORTFOLIO_DATA_SOURCE === 'supabase';

export async function adminContent() {
  return cloud() ? readCloudAdminContent() : readAdminContent();
}

export async function adminSaveProfile(input: unknown, expectedVersion: string) {
  return cloud()
    ? saveCloudProfile(input, expectedVersion)
    : saveProfile(input, { expectedVersion });
}

export async function adminCreateResearch(input: unknown) {
  return cloud() ? createCloudResearch(input) : createResearch(input);
}

export async function adminUpdateResearch(id: string, input: unknown, expectedVersion: string) {
  return cloud()
    ? updateCloudResearch(id, input, expectedVersion)
    : updateResearch(id, input, { expectedVersion });
}

export async function adminTrashResearch(
  id: string,
  expectedVersion: string,
  removedBy: 'admin-1' | 'admin-2',
) {
  return cloud()
    ? trashCloudResearch(id, expectedVersion, removedBy)
    : trashResearch(id, { expectedVersion });
}

export async function adminReorderResearch(input: unknown, expectedVersion: string) {
  return cloud()
    ? reorderCloudResearch(input, expectedVersion)
    : reorderResearch(input, { expectedVersion });
}
