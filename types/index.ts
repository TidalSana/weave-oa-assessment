// GitHub API response types
export interface GitHubCommit {
  sha: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  created_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
  commits: number;
  labels: Array<{ name: string }>;
}

export interface GitHubReview {
  user: {
    login: string;
  } | null;
  submitted_at: string;
  body: string;
  state: string;
}

// Analysis types
export interface EngineerImpact {
  username: string;
  avatar_url: string;
  impactScore: number;
  metrics: {
    prsAuthored: number;
    prsMerged: number;
    reviewsGiven: number;
    reviewDepth: number; // avg comments per review
    codeImpact: number; // weighted by complexity
    crossFunctionalReach: number; // unique directories touched
    unblockingScore: number; // reviews on old/critical PRs
    qualityScore: number; // PRs that don't need follow-up fixes
  };
  reasoning: string[];
}

export interface DashboardData {
  engineers: EngineerImpact[];
  metadata: {
    dataFrom: string;
    dataTo: string;
    totalPRs: number;
    totalReviews: number;
    analysisTimestamp: string;
  };
}
