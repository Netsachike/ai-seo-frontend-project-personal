import api, { LONG_REQUEST_TIMEOUT_MS } from "./api/api";
import { sitePath } from "./api/helpers";
import type {
  ApiSuccess,
  FixDeploymentPackage,
  FixProposal,
  FixVerification,
  SiteGuardAnalyzeResult,
  SiteGuardIssue,
  SiteGuardIssueParams,
  SiteGuardIssueStatus,
  SiteGuardIssueWithPage,
  SiteGuardIssuesResponse,
} from "@/types/types";

/** Technical SEO issues, fix proposals and live verification. */
const siteGuardService = {
  /** Scans crawled pages for issues. */
  analyze: async (siteId: number) => {
    const response = await api.post<ApiSuccess<SiteGuardAnalyzeResult>>(sitePath(siteId, "site-guard/analyze"), null, {
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },

  /** 50 per page. Paginator URLs keep the filters. */
  issues: async (siteId: number, params: SiteGuardIssueParams = {}) => {
    const response = await api.get<SiteGuardIssuesResponse>(sitePath(siteId, "site-guard/issues"), { params });
    return response.data;
  },

  issue: async (siteId: number, issueId: number) => {
    const response = await api.get<ApiSuccess<SiteGuardIssueWithPage>>(
      sitePath(siteId, `site-guard/issues/${issueId}`),
    );
    return response.data;
  },

  /** `resolved` is rejected: an issue only resolves through `verifyFix`. */
  updateStatus: async (siteId: number, issueId: number, status: Exclude<SiteGuardIssueStatus, "resolved">) => {
    const response = await api.patch<ApiSuccess<SiteGuardIssue>>(sitePath(siteId, `site-guard/issues/${issueId}`), {
      status,
    });
    return response.data;
  },

  /** Generates a canonical or meta description fix. Nothing is published. */
  proposeFix: async (siteId: number, issueId: number) => {
    const response = await api.post<ApiSuccess<FixProposal>>(
      sitePath(siteId, `site-guard/issues/${issueId}/propose-fix`),
      null,
      { timeout: LONG_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },

  /** Builds a manual deployment package for the proposed fix. Nothing is deployed. */
  applyFix: async (siteId: number, issueId: number) => {
    const response = await api.post<ApiSuccess<FixDeploymentPackage>>(
      sitePath(siteId, `site-guard/issues/${issueId}/apply-fix`),
    );
    return response.data;
  },

  /** Fetches the live page. When `verified`, the issue becomes `resolved`. */
  verifyFix: async (siteId: number, issueId: number) => {
    const response = await api.post<ApiSuccess<FixVerification>>(
      sitePath(siteId, `site-guard/issues/${issueId}/verify-fix`),
      null,
      { timeout: LONG_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },
};

export default siteGuardService;
