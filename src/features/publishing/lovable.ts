/**
 * What the user pastes into their Lovable project so it exposes the routes
 * Rankoya's `lovable` connection calls (`GET /api/public/rankoya/health`,
 * `POST /api/public/rankoya/articles`, `PUT /api/public/rankoya/articles/{id}`),
 * checked with the `X-Rankoya-API-Key` header. Lovable then shows the
 * generated RANKOYA_API_KEY once, which goes into the connect form with the
 * site's URL. In English on purpose: it's an instruction for Lovable, not UI copy.
 */
export const LOVABLE_PROMPT = `# Connect this existing Lovable project to Rankoya

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
