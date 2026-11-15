/**
 * What the user pastes into their Lovable project so it exposes the routes
 * Rankoya's `lovable` connection calls (`GET /api/public/rankoya/health`,
 * `POST /api/public/rankoya/articles`, `PUT /api/public/rankoya/articles/{id}`),
 * checked with the `X-Rankoya-API-Key` header. Lovable then shows the
 * generated RANKOYA_API_KEY once, which goes into the connect form with the
 * site's URL. In English on purpose: it's an instruction for Lovable, not UI copy.
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

/** Rankoya Publishing API v1: root-level article fields, `target_status`, idempotent by `rankoya_article_id`. */
export const LOVABLE_PROMPT = `# Install Rankoya Publishing Integration v1 in This Existing Lovable Project

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
