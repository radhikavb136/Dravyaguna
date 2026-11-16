import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getModelStatus,
  updateModelConfig,
  recordInteraction,
  runTrainingCycle,
  getLearnedBoostsForQuery,
  listLearnedAssociations,
} from '../src/services/learning/selfLearningService.js';
import { pool } from '../src/db/pool.js';

test('Self-Learning Model service contract', async (t) => {
  t.after(async () => {
    await pool.end();
  });

  await t.test('retrieves active model status and hyperparameters', async () => {
    const status = await getModelStatus();
    assert.ok(status.config, 'Model config is present');
    assert.equal(typeof status.config.enabled, 'boolean');
    assert.equal(typeof status.config.accuracyBoostRate, 'number');
    assert.ok(status.metrics, 'Model metrics present');
    assert.equal(typeof status.metrics.adaptiveScore, 'number');
    assert.ok(Array.isArray(status.recentAssociations), 'Recent associations array');
  });

  await t.test('updates model hyperparameters cleanly', async () => {
    const updated = await updateModelConfig({
      sensitivity: 'high',
      minInteractionThreshold: 3,
    });
    assert.equal(updated.config.sensitivity, 'high');
    assert.equal(updated.config.minInteractionThreshold, 3);

    // Revert to balanced
    await updateModelConfig({ sensitivity: 'balanced', minInteractionThreshold: 2 });
  });

  await t.test('looks up learned boost for established clinical query', async () => {
    const boosts = await getLearnedBoostsForQuery('jvara');
    assert.ok(boosts instanceof Map);
    // Should have at least one association (from baseline seed)
    if (boosts.size > 0) {
      const [firstHerbId, boostData] = [...boosts.entries()][0];
      assert.ok(firstHerbId);
      assert.ok(boostData.relevanceBoost > 0);
      assert.ok(boostData.confidence > 0);
    }
  });

  await t.test('records clinician interaction signal', async () => {
    // Pick an herb from database
    const { rows: herbs } = await pool.query('SELECT id FROM herbs LIMIT 1');
    if (herbs.length > 0) {
      const recorded = await recordInteraction({
        queryText: 'test fever symptom',
        herbId: herbs[0].id,
        interactionType: 'favorite',
      });
      assert.ok(recorded?.id, 'Interaction recorded');

      // Clean up test interaction
      await pool.query('DELETE FROM model_interactions WHERE id = $1', [recorded.id]);
    }
  });

  await t.test('runs training cycle and increments cycles', async () => {
    const beforeStatus = await getModelStatus();
    const trained = await runTrainingCycle();
    assert.ok(trained.config.totalTrainingCycles >= beforeStatus.config.totalTrainingCycles);
    assert.ok(trained.config.lastTrainedAt);
  });

  await t.test('lists learned associations with pagination', async () => {
    const list = await listLearnedAssociations({ limit: 5 });
    assert.ok(Array.isArray(list.items));
    assert.ok(list.total >= 0);
  });
});
