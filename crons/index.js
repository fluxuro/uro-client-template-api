const jobCronFunctions = require('./jobs');

const cron = require('cron');
const modelsCronFunctions = require('./models');
// Schedule job to run every 1 minutes
const jobCron = new cron.CronJob('*/1 * * * *', () => {
  jobCronFunctions.failStuckJobs();
  console.log('Failed stuck jobs');
});
jobCron.start();

const modelsCron = new cron.CronJob('*/1 * * * *', () => {
  modelsCronFunctions.updateModelsETA();
  console.log('Updated models ETA');
});
modelsCron.start();

module.exports = {
  jobCron,
  modelsCron,
};
