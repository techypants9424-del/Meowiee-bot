const JOB_PREFIX = 'hire:';

/**
 * Generate a unique Job ID
 */
export function generateJobId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Get the database key for a job
 */
export function getJobKey(jobId) {
    return `${JOB_PREFIX}${jobId}`;
}

/**
 * Create a new job
 */
export async function createJob(client, jobData) {
    const jobId = generateJobId();

    const job = {
        id: jobId,

        guildId: jobData.guildId,
        employerId: jobData.employerId,

        reason: jobData.reason,
        coins: Number(jobData.coins),

        status: 'open',

        workerId: null,
        channelId: null,

        createdAt: Date.now(),
        acceptedAt: null,
        completedAt: null,
        approvedAt: null,
        updatedAt: Date.now(),
    };

    await client.db.set(getJobKey(jobId), job);

    return job;
}

/**
 * Get a job by ID
 */
export async function getJob(client, jobId) {
    const job = await client.db.get(
        getJobKey(jobId),
        null
    );

    return job || null;
}

/**
 * Update an existing job
 */
export async function updateJob(client, jobId, updates) {
    const job = await getJob(client, jobId);

    if (!job) {
        return null;
    }

    const updatedJob = {
        ...job,
        ...updates,
        updatedAt: Date.now(),
    };

    await client.db.set(
        getJobKey(jobId),
        updatedJob
    );

    return updatedJob;
}

/**
 * Delete a job
 */
export async function deleteJob(client, jobId) {
    await client.db.delete(
        getJobKey(jobId)
    );

    return true;
}

/**
 * Get jobs
 */
export async function getJobs(client, filters = {}) {
    const {
        status = null,
        guildId = null,
        limit = 50,
    } = filters;

    if (!client.db || typeof client.db.list !== 'function') {
        return [];
    }

    let keys = await client.db.list(JOB_PREFIX);

    if (!Array.isArray(keys)) {
        if (typeof keys === 'object' && keys !== null) {
            keys = Object.keys(keys)
                .filter(key => key.startsWith(JOB_PREFIX));
        } else {
            return [];
        }
    }

    const jobs = [];

    for (const key of keys) {
        try {
            const job = await client.db.get(key, null);

            if (!job) continue;

            if (status && job.status !== status) {
                continue;
            }

            if (guildId && job.guildId !== guildId) {
                continue;
            }

            jobs.push(job);
        } catch {
            // Ignore invalid job entries
        }
    }

    jobs.sort(
        (a, b) =>
            (b.createdAt || 0) - (a.createdAt || 0)
    );

    return jobs.slice(0, limit);
}

/**
 * Get only open jobs
 */
export async function getOpenJobs(client, guildId = null) {
    return getJobs(client, {
        status: 'open',
        guildId,
        limit: 50,
    });
}

/**
 * Get jobs where a user is involved
 */
export async function getUserActiveJobs(client, userId) {
    const jobs = await getJobs(client, {
        limit: 100,
    });

    return jobs.filter(job =>
        (
            job.employerId === userId ||
            job.workerId === userId
        ) &&
        [
            'open',
            'in_progress',
            'completed',
            'approved'
        ].includes(job.status)
    );
}
