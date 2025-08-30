const knex = require('../src/configs/knex/knex');

// Calculates average ETA (in seconds) of the last 10 completed jobs for each model
// and updates the model_eta field on the model table.
const updateModelsETA = async () => {
  try {
    // Fetch all models (you can filter out deleted/inactive ones if needed)
    const models = await knex('model').select('model_id');

    await Promise.all(
      models.map(async ({ model_id }) => {
        // Get last 10 completed jobs for this model
        const jobs = await knex('job')
          .where({ model_id, status: 'completed', deleted: 0 })
          .orderBy('completed_at', 'desc')
          .limit(10)
          .select('processing_at', 'completed_at');

        if (jobs.length === 0) {
          return; // No finished jobs yet – skip
        }

        // Sum the differences between completed_at and processing_at (in ms)
        const totalEtaMs = jobs.reduce(
          (sum, job) => sum + (job.completed_at - job.processing_at),
          0
        );

        // Average ETA in seconds (rounded up)
        const averageEtaSec = Math.ceil(totalEtaMs / jobs.length / 1000);

        // Update model_eta on the model table
        await knex('model')
          .where({ model_id })
          .update({ model_eta: averageEtaSec });
      })
    );
  } catch (error) {
    console.error('updateModelsETA Error', error);
  }
};

const modelsCronFunctions = {
  updateModelsETA,
};

module.exports = modelsCronFunctions;
