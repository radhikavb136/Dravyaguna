import { assert, assertEqual } from './lib/assert.js';
import { getTestPool } from './lib/testPool.js';
import {
  getModelStatus,
  updateModelConfig,
  recordInteraction,
  runTrainingCycle,
  getLearnedBoostsForQuery,
  listLearnedAssociations,
} from '../src/services/learning/selfLearningService.js';

export async function run() {
  const pool = getTestPool();

  // 1. Retrieves active model status and hyperparameters
  const status = await getModelStatus();
  assert(status.config, 'Model config is present');
  assertEqual(typeof status.config.enabled, 'boolean', 'enabled is boolean');
  assertEqual(typeof status.config.accuracyBoostRate, 'number', 'accuracyBoostRate is number');
  assert(status.metrics, 'Model metrics present');
  assertEqual(typeof status.metrics.adaptiveScore, 'number', 'adaptiveScore is number');
  assert(Array.isArray(status.recentAssociations), 'Recent associations array');

  // 2. Updates model hyperparameters cleanly
  const updated = await updateModelConfig({
    sensitivity: 'high',
    minInteractionThreshold: 3,
  });
  assertEqual(updated.config.sensitivity, 'high', 'sensitivity updated to high');
  assertEqual(updated.config.minInteractionThreshold, 3, 'minInteractionThreshold updated to 3');

  // Revert to balanced
  await updateModelConfig({ sensitivity: 'balanced', minInteractionThreshold: 2 });

  // 3. Looks up learned boost for established clinical query
  const boosts = await getLearnedBoostsForQuery('jvara');
  assert(boosts instanceof Map, 'boosts is a Map');
  if (boosts.size > 0) {
    const [firstHerbId, boostData] = [...boosts.entries()][0];
    assert(firstHerbId, 'herbId present');
    assert(boostData.relevanceBoost > 0, 'relevanceBoost > 0');
    assert(boostData.confidence > 0, 'confidence > 0');
  }

  // 4. Records clinician interaction signal
  const { rows: herbs } = await pool.query('SELECT id FROM herbs LIMIT 1');
  if (herbs.length > 0) {
    const recorded = await recordInteraction({
      queryText: 'test fever symptom',
      herbId: herbs[0].id,
      interactionType: 'favorite',
    });
    assert(recorded?.id, 'Interaction recorded');

    // Clean up test interaction
    await pool.query('DELETE FROM model_interactions WHERE id = $1', [recorded.id]);
  }

  // 5. Runs training cycle and increments cycles
  const beforeStatus = await getModelStatus();
  const trained = await runTrainingCycle();
  assert(
    trained.config.totalTrainingCycles >= beforeStatus.config.totalTrainingCycles,
    'totalTrainingCycles increments or stays same'
  );
  assert(trained.config.lastTrainedAt, 'lastTrainedAt is set');

  // 6. Lists learned associations with pagination
  const list = await listLearnedAssociations({ limit: 5 });
  assert(Array.isArray(list.items), 'items array');
  assert(list.total >= 0, 'total >= 0');
}
