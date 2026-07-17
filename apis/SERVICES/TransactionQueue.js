const Queue = require('bull');
const redisUrl = 'redis://127.0.0.1:6379';

class TransactionQueueManager {
  constructor() {
    this.transactionQueue = new Queue('transaction-queue', redisUrl);
  }

  // Add a job to the queue
  async addJob(data) {
    try {
      const job = await this.transactionQueue.add(data);
      console.log('Job added:', job.id);
    } catch (error) {
      console.error('Error adding job:', error);
    }
  }
  // Add multiple jobs to the queue
  async addMultipleJobs(jobs) {
    try {
      const addedJobs = await this.transactionQueue.addBulk(jobs.map(data => ({ data })));
      console.log('Jobs added:', addedJobs.map(job => job.id));
    } catch (error) {
      console.error('Error adding multiple jobs:', error);
    }
  }
   // Delete multiple jobs based on filter criteria
   async deleteFilteredJobs(filterFunction) {
    try {
      const jobs = await this.transactionQueue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
      const filteredJobs = jobs.filter(job => filterFunction(job.data));
      for (const job of filteredJobs) {
        await job.remove();
        console.log('Job deleted:', job.id);
      }
    } catch (error) {
      console.error('Error deleting filtered jobs:', error);
    }
  }
  // Delete a job by job ID
  async deleteJob(jobId) {
    try {
      const job = await this.transactionQueue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log('Job deleted:', jobId);
      } else {
        console.log('Job not found:', jobId);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  }

  // Empty the queue
  async emptyQueue() {
    try {
      await this.transactionQueue.empty();
      console.log('Queue emptied');
    } catch (error) {
      console.error('Error emptying queue:', error);
    }
  }

  // Fetch and filter jobs by custom criteria
  async filterJobs(filterFunction) {
    try {
      const jobs = await this.transactionQueue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
      const filteredJobs = jobs.filter(job => filterFunction(job.data));
      return filteredJobs;
    } catch (error) {
      console.error('Error filtering jobs:', error);
      return [];
    }
  }

  // Start processing jobs in the queue
  startQueueProcessing() {
    console.log('Queue processing started');

    this.transactionQueue.process(async (job) => {
      const { uid, activity } = job.data;
      try {
        // Log the job details
        console.log('Processing job:');
        console.log('  UID:', uid);
        console.log('  Activity:', activity);

        // Here you can add code to process the job if needed
        // For example: await Action.actInternally(uid, activity);
      } catch (error) {
        console.error('Error processing job:', error);
        logConditionFailure(`Failed to process ROI activity for UID: ${uid}, Error: ${error.message}`);
      }
    });

    // Optional: Add a listener to log queue events (e.g., completed, failed)
    this.transactionQueue.on('completed', (job, result) => {
      console.log('Job completed:', job.id, 'Result:', result);
    });

    this.transactionQueue.on('failed', (job, err) => {
      console.error('Job failed:', job.id, 'Error:', err.message);
    });
  }
}

// Example usage
const queueManager = new TransactionQueueManager();
module.exports = queueManager;
