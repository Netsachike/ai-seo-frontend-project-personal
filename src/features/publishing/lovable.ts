/**
 * What the user pastes into their Lovable project so it exposes the routes
 * Rankoya's `lovable` connection calls (`GET /api/public/rankoya/health`,
 * `POST /api/public/rankoya/articles`, `PUT /api/public/rankoya/articles/{id}`),
 * checked with the `X-Rankoya-API-Key` header. Two prompts, in order:
 * 1. LOVABLE_SETUP_PROMPT builds or reuses the blog, adds the routes and gives
 *    the user a RANKOYA_API_KEY through a one-time Generate and Copy form;
 * 2. lovableRoutingPrompt(origin) makes sure the routes answer JSON on the
 *    published domain. It needs the site URL, so the UI unlocks it once entered.
 * In English on purpose: they're instructions for Lovable, not UI copy.
 */
/* Previous prompt (before Rankoya Publishing API v1), kept for reference:
const LOVABLE_PROMPT_LEGACY = `# Connect this existing Lovable project to Rankoya

I want to connect this application to Rankoya, an SEO and content publishing platform.

IMPORTANT: This is an existing application. Do not rebuild it, replace it, or create a new project.

Your task is to add Rankoya publishing support to the existing application while preserving all current functionality.

## 1. First, inspect my existing application

Before making changes, inspect:

- The existing framework and project structure.
- The current database and database tables.
- Any existing blog, posts, articles or CMS functionality.
- Existing authentication and authorization.
- Existing public routes and page layouts.
- Existing image and media handling.

If a blog or article system already exists, integrate with it.

Do not create a second blog, duplicate existing tables, replace the database, change the authentication system, or redesign existing pages.

If no blog system exists, implement a simple blog that fits the current application's architecture and design.

## 2. Configure Rankoya authentication

Generate a cryptographically secure random API secret with at least 32 bytes of randomness.

Save it as a server-side Lovable Cloud secret named:

RANKOYA_API_KEY

Never expose this secret in frontend code, public environment variables, browser responses, or client-side storage.

IMPORTANT: Show me the generated secret in your final response ONCE so I can copy it into my Rankoya connection settings.

Do not log the secret or expose it anywhere else.

## 3. Implement the Rankoya API

Create these server-side endpoints:

### Health check

GET /api/public/rankoya/health

Authenticate using the X-Rankoya-API-Key request header.

Return HTTP 200 for a valid key and HTTP 401 for an invalid key.

Successful response:

{
  "success": true,
  "message": "Rankoya publishing API is operational"
}

### Create or publish an article

POST /api/public/rankoya/articles

Accept:

- rankoya_article_id
- delivery_id
- title
- slug
- content (HTML)
- excerpt
- meta_title
- meta_description
- cover_image_url
- target_status (draft or publish)

Create the article in the existing blog/CMS system.

If an article with the same rankoya_article_id already exists, update it instead of creating a duplicate.

### Update an article

PUT /api/public/rankoya/articles/{rankoya_article_id}

Update the matching article without creating a duplicate.

All endpoints must authenticate the request using the server-side secret.

## 4. Preserve existing application functionality

- Reuse the existing article database and content management system where possible.
- Preserve existing user accounts, authentication and authorization.
- Preserve existing website design and navigation.
- Do not interfere with existing blog functionality.
- Do not expose unpublished articles to public visitors.
- Only published articles should be publicly accessible.
- Integrate with the existing public blog pages.
- If no public blog exists, add /blog and /blog/{slug} using the application's existing design system.

## 5. Article publishing requirements

Support:

- Draft publishing.
- Immediate publishing.
- Article updates.
- SEO title and description.
- Article slug.
- HTML article content.
- Excerpts.
- Featured image URLs.
- Idempotent delivery IDs.

Return a JSON response containing success, message, article ID, rankoya_article_id, slug, status and public article URL.

## 6. Security requirements

- Validate all incoming data.
- Authenticate every Rankoya publishing request.
- Keep the API secret server-side.
- Prevent unauthenticated article creation and modification.
- Allow public visitors to read published articles only.
- Do not weaken existing database security policies.

## 7. Final testing

Test:

1. Health endpoint authentication.
2. Creating a draft article.
3. Publishing an article.
4. Updating an existing article.
5. Duplicate delivery protection.
6. Public visibility of published articles.
7. Public invisibility of drafts.

Do not create unnecessary duplicate test articles.

## 8. Final instructions

Deploy the changes.

At the end, tell me:

- The website's public URL.
- The health endpoint URL.
- The articles endpoint URL.
- Whether the integration was successfully deployed.
- Whether all tests passed.
- The generated RANKOYA_API_KEY secret, displayed once so I can copy it into Rankoya.

Do not claim success for any endpoint that has not actually been implemented and tested.
`;
*/

/* v1 single prompt (before the two-step flow), kept for reference:
const LOVABLE_PROMPT_V1 = `# Install Rankoya Publishing Integration v1 in This Existing Lovable Project

I want to integrate this existing application with Rankoya, an SEO, content generation and publishing platform.

IMPORTANT: This is an existing application. Do not rebuild it, replace it, or create a new project.

Implement the official Rankoya Publishing API v1 specification below. This specification is the source of truth. Do not invent a different request format, response format, endpoint, or authentication mechanism.

## 1. Inspect the existing application first

Before changing anything, inspect:

- Existing framework and project structure.
- Database provider, schema and existing tables.
- Existing blog, article, post or CMS functionality.
- Existing authentication and authorization.
- Existing public routes and blog pages.
- Existing image and media handling.
- Existing server-side functions and environment secrets.

Reuse the existing article system and database wherever possible.

Do not create a duplicate blog or article system if one already exists. Do not replace the database, authentication system, existing user accounts, design or navigation.

If the application has no blog functionality, implement a simple blog using its existing architecture and design system.

## 2. Configure secure Rankoya authentication

Generate a cryptographically secure API secret using at least 32 bytes of random entropy.

Save it as a server-side secret named:

RANKOYA_API_KEY

Requirements:

- Keep the key exclusively on the server.
- Never expose it in frontend code, browser responses, public environment variables or client-side storage.
- Never log the key.
- Authenticate all three Rankoya endpoints using the X-Rankoya-API-Key HTTP header.
- Compare secrets securely.
- Reject missing, invalid or empty keys with HTTP 401.
- Show the generated secret ONCE in the final implementation report so the website owner can copy it into Rankoya.
- Do not store the key in a public database or expose it through an API.

## 3. Implement these exact API endpoints

All endpoints must be server-side endpoints.

Base path:

/api/public/rankoya

### A. Health check

Method: GET

Path:

/api/public/rankoya/health

Authentication:

X-Rankoya-API-Key: <RANKOYA_API_KEY>

Successful response — HTTP 200:

\`\`\`json
{
  "success": true,
  "message": "Rankoya publishing API is operational",
  "integration": "rankoya",
  "api_version": "v1"
}
\`\`\`

Invalid authentication — HTTP 401:

\`\`\`json
{
  "success": false,
  "message": "Invalid or missing API key"
}
\`\`\`

### B. Create or publish an article

Method: POST

Path:

/api/public/rankoya/articles

Authentication:

X-Rankoya-API-Key: <RANKOYA_API_KEY>

The endpoint MUST accept the following JSON structure. All fields are at the ROOT level, not nested inside an article object.

Example request:

\`\`\`json
{
  "rankoya_article_id": "123",
  "title": "Example article",
  "content": "<h1>Example article</h1><p>Article content.</p>",
  "slug": "example-article",
  "meta_title": "Example SEO title",
  "meta_description": "Example SEO description",
  "excerpt": "An example article excerpt.",
  "cover_image_url": "https://example.com/image.jpg",
  "status": "published",
  "target_status": "publish",
  "published_at": "2026-11-15T10:00:00+01:00",
  "url": null,
  "event": "article.published",
  "source": "rankoya",
  "delivery_id": "f6c84036-ee7f-4567-865e-a2f2712a8ef9",
  "sent_at": "2026-11-15T10:00:00+01:00",
  "site": {
    "id": 23,
    "name": "Example website",
    "domain": "example.com",
    "url": "https://example.com"
  }
}
\`\`\`

#### Field validation

Required:

- rankoya_article_id: string or integer identifier; normalize and store as a string.
- title: non-empty string.
- content: non-empty HTML string.
- target_status: exactly draft or publish.

Optional:

- delivery_id: string.
- slug: string.
- meta_title: string or null.
- meta_description: string or null.
- excerpt: string or null.
- cover_image_url: valid URL or null.
- status: draft or published.
- published_at: valid date/time or null.
- url: valid URL or null.
- event: string.
- source: string.
- sent_at: valid date/time or null.
- site: object or null.

Allow additional optional fields without rejecting the entire request, so future Rankoya-compatible metadata does not break this integration.

#### Publishing behavior

When target_status is draft:

- Save the article as a draft.
- Do not expose it publicly.
- Do not assign a public published URL unless the existing application has a draft preview URL.

When target_status is publish:

- Create or update the article.
- Set its status to published.
- Make it accessible through the existing public blog.
- Generate or preserve its slug.
- Return the canonical public article URL.

#### Idempotency and duplicate protection

- Use rankoya_article_id as the permanent external identity of an article.
- If that Rankoya article ID already exists, update the existing article rather than creating another.
- Repeated requests must never create duplicate articles.
- Store and use delivery_id for delivery tracking and duplicate delivery protection.
- A repeated delivery ID for the same article must not create a second article.
- If a delivery ID has already been processed successfully, return the original successful result where appropriate.
- Do not let a duplicate request overwrite a newer article version with stale content without considering delivery ordering.

### C. Update an existing article

Method: PUT

Path:

/api/public/rankoya/articles/{rankoya_article_id}

Authentication:

X-Rankoya-API-Key: <RANKOYA_API_KEY>

The URL identifier is Rankoya's article ID, not the Lovable database UUID.

Accept the same root-level request fields as the POST endpoint.

Requirements:

- Find the article using its stored rankoya_article_id.
- Update the existing article.
- Never create a second article through this update endpoint.
- Support switching between draft and published status.
- Return HTTP 404 if the matching Rankoya article does not exist.
- Preserve existing local article functionality and relationships.

## 4. Standard response format — mandatory

All successful POST and PUT requests MUST return this exact response structure.

Example:

\`\`\`json
{
  "success": true,
  "message": "Article published successfully",
  "data": {
    "id": "lovable-database-id",
    "rankoya_article_id": "123",
    "slug": "example-article",
    "status": "published",
    "url": "https://example.com/blog/example-article"
  },
  "duplicate": false,
  "api_version": "v1"
}
\`\`\`

Field requirements:

- success: boolean.
- message: string.
- data.id: actual database ID of the article in this Lovable application, returned as a string.
- data.rankoya_article_id: original Rankoya article ID, returned as a string.
- data.slug: final article slug.
- data.status: exactly draft or published.
- data.url: canonical public article URL for published articles; null for drafts without a public URL.
- duplicate: boolean.
- api_version: v1.

Do not return success: true if the article was not actually saved.

Do not omit data.id or data.rankoya_article_id.

For drafts, return status: "draft" and url: null when there is no public draft URL.

## 5. Standard error responses

All validation errors must identify the failing field.

Example — HTTP 400:

\`\`\`json
{
  "success": false,
  "message": "Invalid article payload",
  "errors": [
    {
      "field": "title",
      "message": "Required"
    }
  ],
  "api_version": "v1"
}
\`\`\`

Use:

- HTTP 400 for invalid request data.
- HTTP 401 for missing or invalid API authentication.
- HTTP 404 for an article not found during PUT.
- HTTP 409 for genuine idempotency conflicts.
- HTTP 500 for unexpected server errors.

Never return a generic validation error when the exact failing field is known.

Never expose database credentials, API secrets, stack traces or sensitive server information in API responses.

## 6. Public blog integration

Integrate with the existing blog system.

Requirements:

- Published articles must appear on the existing blog.
- Draft articles must never be publicly accessible.
- Public article pages must use the existing website design.
- Preserve existing blog routes and navigation.
- Support SEO title and meta description.
- Support article slugs.
- Display featured images where the existing design supports them.
- Avoid changing existing user authentication or permissions.

## 7. Security requirements

- Authenticate every Rankoya publishing request.
- Keep the API secret server-side.
- Validate and sanitize incoming data appropriately.
- Preserve existing database security and access policies.
- Do not allow public visitors to create, modify or delete articles.
- Do not expose unpublished articles.
- Do not weaken existing application security.

## 8. Required implementation tests

Test the actual endpoints, not just internal functions.

Perform these tests:

- Health endpoint with a valid key returns HTTP 200.
- Health endpoint with an invalid key returns HTTP 401.
- POST creates a draft article.
- POST publishes an article.
- POST with the same Rankoya article ID updates rather than duplicates.
- PUT updates the existing article.
- Repeated delivery IDs do not create duplicate articles.
- Published articles are publicly accessible.
- Draft articles are not publicly accessible.
- Successful responses contain every mandatory response field.
- Validation errors identify the exact failing fields.
- API secrets are never exposed to the browser.

Use safe test records and clean them up without deleting existing customer data.

Do not claim a test passed unless it was actually executed and verified.

## 9. Preserve existing application functionality

Do not:

- Rebuild the project.
- Replace the database.
- Replace authentication.
- Create a separate blog unnecessarily.
- Change unrelated pages.
- Remove existing functionality.
- Expose API credentials.
- Create unnecessary test articles.

Make only the changes required to implement Rankoya Publishing API v1.

## 10. Final implementation report

At completion, report:

- Website public URL.
- Health endpoint URL.
- Article creation endpoint URL.
- Article update endpoint URL.
- API version implemented.
- Whether the integration was deployed.
- Which tests actually passed and failed.
- Whether existing blog functionality was reused.
- Generated RANKOYA_API_KEY, displayed once for the owner to copy into Rankoya.
- Any remaining limitations.

Do not claim that the integration is ready if the required endpoints and tests have not been successfully implemented.

This is the official Rankoya Publishing API v1 specification. Follow it exactly.

---

# Section 2: SPECIAL REQUIREMENT: EXISTING BLOGS MUST BE PRESERVED

This integration is primarily intended for applications that already have a functioning blog or content management system.

If an existing blog is detected:

- Treat the existing blog as the only source of truth for articles.
- Reuse its existing article database tables, models, relationships and publishing workflows.
- Map Rankoya article fields to the existing database fields. Do not assume the existing database uses field names such as title, content or slug; inspect the actual schema.
- Store rankoya_article_id as an external identifier associated with the existing article. Prefer an existing integration or metadata field if suitable; otherwise add a minimal migration without altering existing article records.
- Store delivery IDs for idempotency without creating duplicate articles.
- Use the existing blog's article creation, update, draft and publishing mechanisms.
- Ensure articles received from Rankoya appear in the existing blog and use its existing public article pages.
- Preserve existing article URLs and slugs wherever possible.
- Do not overwrite, delete, migrate or modify existing articles unnecessarily.
- Do not introduce a second blog dashboard, article editor, public blog or duplicate article table.

If the existing application has no blog, implement one using its existing architecture.

Before making database changes, explain which existing tables and models will be reused and what minimal changes are necessary.
`;
*/

/**
 * Step 1 of 2 (Rankoya Lovable Publishing Integration v2): builds or reuses the
 * blog, adds Rankoya's three routes and generates the RANKOYA_API_KEY through a
 * one-time Generate and Copy form in the user's Lovable project.
 */
export const LOVABLE_SETUP_PROMPT = `Rankoya Lovable Publishing Integration v2
Universal Installation Instructions for Existing Lovable Projects

I want to connect this existing Lovable application to Rankoya, a content generation, SEO and publishing platform.
This is an integration into an existing application, not a request to build a new application.
The official Rankoya API specification below is mandatory. Follow it exactly.

1. Inspect the existing application before implementation
First inspect:
- Existing framework and version.
- Application routing and server-side capabilities.
- Hosting and deployment architecture.
- Database provider, tables and schema.
- Existing blog, article, post or CMS functionality.
- Existing article models and publishing workflows.
- Existing authentication and authorization.
- Existing public website routes and page layouts.
- Existing image and media handling.
- Existing server-side functions and secrets.
Identify the existing blog and publishing architecture.
If a blog already exists:
- Reuse its existing database, tables, models and relationships.
- Reuse its existing article creation and publishing workflows.
- Reuse its existing public article pages and design.
- Do not create a duplicate blog, editor or article table.
If no blog exists, implement a simple blog using the existing application's architecture and design system.
Before making database changes, explain which existing tables and models will be reused and which minimal changes are necessary.

2. Mandatory customer-facing URL requirement
The website owner must only need to provide:
- Their published website URL.
- Their Rankoya API key.
Do not ask the website owner to provide a separate API URL, Supabase URL, Edge Function URL or backend URL.
Example:
Published website:
https://example.lovable.app
The following API endpoints must be accessible through that same published website domain:
GET https://example.lovable.app/api/public/rankoya/health
POST https://example.lovable.app/api/public/rankoya/articles
PUT https://example.lovable.app/api/public/rankoya/articles/{rankoya_article_id}
The published website URL must remain the single customer-facing base URL.
Internal infrastructure such as Supabase, Edge Functions or server-side services may be used internally, but must never become an additional customer configuration requirement.

3. Architecture-aware implementation
Do not assume that every Lovable project uses the same framework, routing system or hosting architecture.
Based on the initial inspection, select the implementation method that actually works with this project's architecture.
Possible approaches include:
- Native server-side application routes.
- Server-side API handlers.
- Secure server-side proxy or rewrite to an existing Edge Function.
- An approved framework or hosting migration if technically necessary.
Requirements:
- Implement the three Rankoya endpoints on the published website's own domain.
- If using an internal Edge Function, securely forward requests from the public website routes to that function.
- Preserve the original HTTP method, request body and required authentication header.
- Do not expose API secrets in browser code.
- Do not return the website homepage for Rankoya API requests.
- Do not use frontend JavaScript routing as a substitute for real API endpoints.
- Do not claim that an internal function test proves that the public website endpoints work.
- Do not automatically migrate the application or introduce a paid upgrade without explaining the technical reason, expected changes and possible costs and obtaining the owner's approval.
If the existing architecture cannot expose these routes on the published website domain, stop and explain the limitation. Do not claim the integration is ready.

4. Secure API key generation
Generate a cryptographically secure random API key with at least 32 bytes of randomness.
Store it as a server-side secret:
RANKOYA_API_KEY
Requirements:
- Keep the key exclusively on the server.
- Never expose it to the browser.
- Never store it in public environment variables.
- Never log it.
- Authenticate every Rankoya endpoint using the X-Rankoya-API-Key header.
- Compare keys securely.
- Reject missing, invalid or empty keys with HTTP 401.
For key delivery, use a secure one-time form with a Generate and Copy action. The website owner must be able to copy the key directly into Rankoya.
Do not expose the key in chat messages, logs or public API responses.
If a valid existing Rankoya key is already configured, preserve it unless the owner explicitly requests replacement.

5. Official Rankoya API v1 specification
All three endpoints must use the same authentication mechanism.

A. Health check
Method: GET
Path:
/api/public/rankoya/health
Successful response — HTTP 200:
{
"success": true,
"message": "Rankoya publishing API is operational",
"integration": "rankoya",
"api_version": "v1"
}
Invalid or missing authentication — HTTP 401:
{
"success": false,
"message": "Invalid or missing API key"
}
The health endpoint must verify the actual API authentication and service availability.

B. Create or publish an article
Method: POST
Path:
/api/public/rankoya/articles
Authentication:
X-Rankoya-API-Key: <RANKOYA_API_KEY>
Accept the following JSON structure. All fields are at the root level, not nested inside an article object.
{
"rankoya_article_id": "123",
"title": "Example article",
"content": "<h1>Example article</h1><p>Article content.</p>",
"slug": "example-article",
"meta_title": "Example SEO title",
"meta_description": "Example SEO description",
"excerpt": "An example excerpt.",
"cover_image_url": "https://example.com/image.jpg",
"status": "published",
"target_status": "publish",
"published_at": "2026-11-20T10:00:00+01:00",
"url": null,
"event": "article.published",
"source": "rankoya",
"delivery_id": "f6c84036-ee7f-4567-865e-a2f2712a8ef9",
"sent_at": "2026-11-20T10:00:00+01:00",
"site": {
"id": 23,
"name": "Example website",
"domain": "example.com",
"url": "https://example.com"
}
}
Required fields:
- rankoya_article_id: string or integer identifier.
- title: non-empty string.
- content: non-empty HTML string.
- target_status: exactly draft or publish.
Optional fields:
- delivery_id
- slug
- meta_title
- meta_description
- excerpt
- cover_image_url
- status
- published_at
- url
- event
- source
- sent_at
- site
Accept nullable optional fields and additional optional metadata without rejecting an otherwise valid request.
Do not reject the payload merely because optional fields are null.

C. Update an existing article
Method: PUT
Path:
/api/public/rankoya/articles/{rankoya_article_id}
The URL identifier is Rankoya's original article ID, not the destination database UUID.
Accept the same root-level JSON structure as POST.
Requirements:
- Find the article using rankoya_article_id.
- Update the existing article.
- Never create another article through PUT.
- Support switching between draft and published status.
- Return HTTP 404 if the article does not exist.
- Preserve existing article relationships and functionality.

6. Article publishing and database mapping
Map Rankoya's fields to the actual existing destination database schema.
Do not assume the destination database has columns named title, content or slug without inspecting it.
Requirements:
- Save articles in the existing article system.
- Store rankoya_article_id as a permanent external identifier.
- Use a suitable existing integration or metadata field where possible.
- Otherwise, add only the minimal required database changes.
- Store delivery_id for duplicate delivery protection.
- Never create duplicate articles for the same Rankoya article ID.
- A repeated delivery must not create another article.
- Do not allow an older delivery to overwrite a newer version.
- Preserve existing slugs and URLs where possible.
When target_status is draft:
- Save as a draft.
- Do not expose the article publicly.
- Return a null public URL unless a legitimate draft preview URL exists.
When target_status is publish:
- Save and publish the article.
- Make it available through the existing public blog.
- Generate or preserve its slug.
- Return its canonical public article URL.

7. Mandatory successful response format
All successful POST and PUT requests must return:
{
"success": true,
"message": "Article published successfully",
"data": {
"id": "lovable-database-id",
"rankoya_article_id": "123",
"slug": "example-article",
"status": "published",
"url": "https://example.com/blog/example-article"
},
"duplicate": false,
"api_version": "v1"
}
Requirements:
- data.id must be the actual destination database ID, returned as a string.
- data.rankoya_article_id must be the original Rankoya ID, returned as a string.
- data.slug must be the final slug.
- data.status must be exactly draft or published.
- data.url must be the canonical public article URL for published articles and null for drafts without public URLs.
- duplicate must be a boolean.
- api_version must be v1.
- Do not report success if the article was not actually saved.
- Do not omit mandatory response fields.

8. Error response format
Validation errors must identify the exact failing field.
Example:
{
"success": false,
"message": "Invalid article payload",
"errors": [
{
"field": "title",
"message": "Required"
}
],
"api_version": "v1"
}
Use:
- HTTP 400 for invalid request data.
- HTTP 401 for missing or invalid authentication.
- HTTP 404 for an article not found during PUT.
- HTTP 409 for genuine idempotency conflicts.
- HTTP 500 for unexpected server errors.
Never hide a known validation error behind a generic error response.
Never expose credentials, stack traces or sensitive database information.

9. Public blog integration
- Published articles must appear on the existing public blog.
- Drafts must remain private.
- Use the existing website design.
- Preserve existing public routes and navigation.
- Support SEO title and meta description.
- Support article slugs and featured images where available.
- Do not interfere with existing authentication or permissions.

10. Mandatory security requirements
- Authenticate every Rankoya publishing request.
- Keep the API key server-side.
- Validate and sanitize incoming data appropriately.
- Never expose the API key to visitors.
- Do not weaken existing database security policies.
- Public visitors must not be able to create, update or delete articles.
- Public visitors must not access unpublished articles.
- Ensure any internal proxy cannot be used to bypass authentication.

11. Mandatory deployment and live testing
Test the actual published website domain, not just internal functions.
The following tests are mandatory:
- GET health endpoint with a valid key returns HTTP 200 and api_version v1.
- GET health endpoint with an invalid key returns HTTP 401.
- GET health endpoint without a key returns HTTP 401.
- POST creates a draft article.
- POST publishes an article.
- POST with an existing rankoya_article_id updates rather than duplicates.
- PUT updates the existing article.
- PUT with an unknown Rankoya article ID returns HTTP 404.
- Repeated delivery IDs are handled correctly.
- Published articles are publicly accessible.
- Draft articles are not publicly accessible.
- Successful responses contain all mandatory response fields.
- Validation errors identify the exact failing fields.
- No API key is exposed in browser responses or logs.
Use safe test records and clean them up without deleting existing customer data.
For authentication tests, use the configured server-side secret without displaying it.
If a test cannot be completed, state that clearly. Never claim an untested endpoint passed.

12. Final deployment report
After implementation, deployment and live testing, report:
- Published website URL.
- Health endpoint URL.
- Article creation endpoint URL.
- Article update endpoint URL.
- API version.
- Hosting and routing implementation used.
- Whether the application was deployed.
- Which tests passed and failed.
- Whether the existing blog was reused.
- Whether the existing database and articles were preserved.
- Whether the existing API key was preserved or a new one was generated.
- Any required framework migration or additional hosting costs.
- Any remaining limitations.
The website owner must only need their published website URL and API key to connect Rankoya.
Never require the owner to configure a second API URL.
Do not claim the integration is ready until the actual published website endpoints have been verified.
`;

/**
 * The site's origin from whatever the user typed ("museboard.lovable.app",
 * "https://museboard.lovable.app/blog/"), or null when it isn't a usable
 * public host. Step 2 and the health check both build on this origin.
 */
export function lovableOrigin(input: string): string | null {
  const raw = input.trim();
  // An email (or user@host) is never a site URL.
  if (!raw || raw.includes("@")) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!/^[a-z\d-]+(\.[a-z\d-]+)+$/i.test(url.hostname)) return null;
    return `https://${url.host.toLowerCase()}`;
  } catch {
    return null;
  }
}

/** The health endpoint Rankoya checks, on the site's own domain. */
export const lovableHealthUrl = (origin: string) => `${origin}/api/public/rankoya/health`;

/**
 * Step 2 of 2: makes Lovable register the three routes server-side (not in
 * the SPA's HTML fallback) and verify the health endpoint on the published
 * domain. Needs the site URL, which is why it stays locked until it's entered.
 */
export const lovableRoutingPrompt = (
  origin: string,
) => `My Rankoya health endpoint is currently returning this response:
{
"error": "Only HTML requests are supported here"
}
The URL is:
${lovableHealthUrl(origin)}
This is incorrect. Rankoya requires a real server-side JSON API endpoint, not an HTML page.
Please inspect the existing implementation and fix the routing.
Requirements:
- Implement a real server-side GET route at /api/public/rankoya/health.
- Implement POST /api/public/rankoya/articles.
- Implement PUT /api/public/rankoya/articles/{rankoya_article_id}.
- Ensure these routes are registered in the server-side routing system, not the frontend page router.
- Ensure API requests are not intercepted by the website's HTML fallback, page router or SPA handler.
- Return application/json responses for all three endpoints.
- Read and validate the existing RANKOYA_API_KEY from server-side secrets using the X-Rankoya-API-Key header.
- Preserve the existing API key. Do not generate another one.
- Preserve the existing blog, database, articles, design and publishing logic.
- Do not create another blog or duplicate article tables.
The health endpoint must return HTTP 200 with this exact response for a valid key:
{
"success": true,
"message": "Rankoya publishing API is operational",
"integration": "rankoya",
"api_version": "v1"
}
It must return HTTP 401 for a missing or invalid key.
IMPORTANT:
First identify why the current application returns "Only HTML requests are supported here".
Do not simply change the error message or return a hardcoded success response.
After fixing the implementation, deploy the application and test the actual published website URL using an authenticated GET request.
Do not claim success until the public endpoint returns the correct JSON response.
`;
