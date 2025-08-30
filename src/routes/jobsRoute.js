const {
  handlePaginationAndParams,
} = require('../middleware/paginationMiddleware');
const jobsStore = require('../store/jobsStore');

const router = require('express').Router();

router.get('/', handlePaginationAndParams, async (req, res, next) => {
  try {
    const jobs = await jobsStore.getJobs(req);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

router.get('/job/:id', async (req, res, next) => {
  try {
    const job = await jobsStore.getJobById(req);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/delete-job', async (req, res, next) => {
  try {
    const job = await jobsStore.deleteJob(req);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/update-job-publicity', async (req, res, next) => {
  try {
    const job = await jobsStore.updateJobPublic(req);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.get('/images', handlePaginationAndParams, async (req, res, next) => {
  try {
    const images = await jobsStore.getImagesFromJobs(req);
    res.json(images);
  } catch (error) {
    next(error);
  }
});
module.exports = router;
