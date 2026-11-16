import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getModelStatus,
  updateModelConfig,
  trainModel,
  recordFeedback,
  listModelAssociations,
  updateAssociationStatus,
  deleteAssociation,
} from './model.js';
import { apiClient } from './client.js';

vi.mock('./client.js', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Self-Learning Model Client API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves model status', async () => {
    apiClient.get.mockResolvedValueOnce({ status: 'online', totalInteractions: 42 });
    const res = await getModelStatus();
    expect(apiClient.get).toHaveBeenCalledWith('/api/model/status');
    expect(res.status).toBe('online');
    expect(res.totalInteractions).toBe(42);
  });

  it('updates model hyperparameters', async () => {
    const config = { enabled: true, sensitivity: 'high' };
    apiClient.put.mockResolvedValueOnce({ success: true, config });
    const res = await updateModelConfig(config);
    expect(apiClient.put).toHaveBeenCalledWith('/api/model/config', config);
    expect(res.success).toBe(true);
  });

  it('triggers manual model training cycle', async () => {
    apiClient.post.mockResolvedValueOnce({ success: true, message: 'Trained' });
    const res = await trainModel();
    expect(apiClient.post).toHaveBeenCalledWith('/api/model/train', {});
    expect(res.success).toBe(true);
  });

  it('records interaction feedback safely without throwing', async () => {
    apiClient.post.mockResolvedValueOnce({ success: true, recorded: true });
    const res = await recordFeedback({
      queryText: 'fever',
      herbId: '11111111-1111-1111-1111-111111111111',
      interactionType: 'favorite',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/api/model/feedback', {
      queryText: 'fever',
      herbId: '11111111-1111-1111-1111-111111111111',
      interactionType: 'favorite',
    });
    expect(res.success).toBe(true);
  });

  it('lists learned associations with filter query params', async () => {
    apiClient.get.mockResolvedValueOnce({ associations: [], count: 0 });
    await listModelAssociations({ status: 'active', limit: 25 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/model/associations?status=active&limit=25');
  });

  it('updates association status and deletes association', async () => {
    apiClient.patch.mockResolvedValueOnce({ updated: true });
    apiClient.delete.mockResolvedValueOnce({ deleted: true });

    await updateAssociationStatus('assoc-1', 'archived');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/model/associations/assoc-1', { status: 'archived' });

    await deleteAssociation('assoc-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/model/associations/assoc-1');
  });
});
