const knex = require("../configs/knex/knex");
const jobService = require("../services/database/jobService");
const logger = require("../utils/logger");

const handleModelWebhook = async (req) => {
  try {
    /* SUCCESS: 
    body: 
    {
  "image_job_id": "1acf237a-87a0-52bc-a90c-09b0484ea295",
  "results": [
    {
      "external_url": "https://image.example.com",
      "image_id": "5eaed525-6c5a-39gn-9613-d7c50000000f"
    }
  ],
  "cost_to_client": 1.2,
  "success": true
}
    */
    const job = await knex("job").where({ job_id: req.params.job_id }).first();
    if (!job) {
      return;
    }
    if (req?.body?.success) {
      console.log("Success model job", req.body);
      const { image_job_id, workflow_job_id, results, cost_to_client } =
        req.body;
      const job_id = req.params.job_id;
      await jobService.completeJob({
        job_id,
        job_result: results,
        cost_to_client,
      });
    } else {
      //failed model job
      console.log("Failed model job", req.body);
      const { image_job_id, workflow_job_id, error, success } = req.body;
      const job_id = req.params.job_id;
      await jobService.failJob({
        job_id,
        job_result: error,
      });
      //TODO: add balance back to customer
      // await addBalance({
      //   customerId: job.customer_id,
      //   amount: job.cost_to_customer,
      //   jobId: job_id,
      // });
    }
  } catch (error) {
    logger.error("handleModelWebhook Error", {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    throw error;
  }
};
const handleWorkflowWebhook = async (req) => {
  /*
  workflow_job_id: 'b39bb0a0-e50a-4052-a3de-8702d235d829',
  workflow_definition_id: '321718f8-64a2-4638-82f3-19f1c3a2f4de',
  input_params: { prompt: 'Logo of URO AI' },
  status: 'completed',
  cost_to_client: 1.2,
  created_at: '2025-05-13T12:49:45.149Z',
  processing_at: null,
  completed_at: '2025-05-13T15:49:54.917Z',
  failed_at: null,
  client_id: '3d3bad42-aa48-4e2f-94a1-dbe2ee97410e',
  results: { results: [ [Object] ] }
  */
  const {
    workflow_job_id,
    workflow_definition_id,
    input_params,
    status,
    cost_to_client,
    created_at,
    processing_at,
    completed_at,
    failed_at,
    client_id,
    results,
  } = req.body;
  const job_id = req.params.job_id;
  if (status === "completed") {
    await jobService.completeJob({
      job_id,
      job_result: results?.results || results,
      cost_to_client,
    });
  } else {
    //failed workflow job
    console.log("Failed workflow job", req.body);
    const {
      workflow_job_id,
      workflow_definition_id,
      input_params,
      status,
      cost_to_client,
      created_at,
      processing_at,
      completed_at,
      failed_at,
      client_id,
      results,
    } = req.body;
    const job_id = req.params.job_id;
    await jobService.failJob({
      job_id,
      job_result: req.body,
    });
  }
  return true;
};
const webhookStore = {
  handleModelWebhook,
  handleWorkflowWebhook,
};

module.exports = webhookStore;
