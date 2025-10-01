export declare class JobController {
    createJob(user: any, jobData: any): Promise<{
        message: string;
        createdBy: {
            id: any;
            email: any;
            role: any;
        };
        job: {
            id: number;
            description: any;
            status: string;
            customerId: any;
        };
        note: string;
    }>;
    getMyJobs(user: any): Promise<{
        message: string;
        customerId: any;
        role: any;
        jobs: {
            id: number;
            description: string;
            status: string;
        }[];
    }>;
    getAssignedJobs(user: any): Promise<{
        message: string;
        providerId: any;
        role: any;
        jobs: {
            id: number;
            description: string;
            status: string;
            customer: string;
        }[];
        note: string;
    }>;
    updateJobStatus(jobId: number, user: any, statusData: any): Promise<{
        message: string;
        jobId: number;
        newStatus: any;
        updatedBy: {
            id: any;
            email: any;
            role: any;
        };
        note: string;
    }>;
    getAllJobs(user: any): Promise<{
        message: string;
        viewedBy: {
            id: any;
            email: any;
            role: any;
        };
        totalJobs: number;
        jobs: ({
            id: number;
            description: string;
            status: string;
            customer: string;
            provider?: undefined;
        } | {
            id: number;
            description: string;
            status: string;
            provider: string;
            customer?: undefined;
        })[];
        note: string;
    }>;
    deleteJob(jobId: number, user: any): Promise<{
        message: string;
        jobId: number;
        deletedBy: {
            id: any;
            email: any;
            role: any;
        };
        note: string;
    }>;
    testAuth(user: any): Promise<{
        message: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            role: any;
        };
        note: string;
    }>;
}
