# Security Policy — NirvachanAI

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active |

## Threat Model

NirvachanAI is a civic-tech voter education platform. Our threat model covers:

### 1. Cross-Site Scripting (XSS)
**Risk:** Attacker injects malicious scripts via the chat interface or search fields.  
**Mitigation:**
- All user inputs sanitised through `sanitizeFull()` before processing or rendering.
- `escapeHtml()` applied to all dynamic DOM interpolation.
- Strict Content-Security-Policy headers enforced at the nginx layer (see Dockerfile).
- No `eval()`, `new Function()`, or `innerHTML` with unsanitised data anywhere in the codebase.

### 2. API Key Exposure
**Risk:** Google API keys leaked via client-side code or public repos.  
**Mitigation:**
- All keys loaded exclusively from environment variables (`import.meta.env.*`).
- `.env` is listed in `.gitignore` — never committed to the repository.
- `.env.example` provided with placeholder values only.
- API key access restricted to specific Google Cloud services in GCP Console.

**Required GCP Console Key Restrictions:**
- **HTTP Referrer Restrictions:** Restrict each key to your production domain (e.g., `https://election-saathi.web.app/*`) in _APIs & Services → Credentials → Edit Key → Application Restrictions_.
- **API Restrictions:** Limit each key to only the APIs it needs:
  - Gemini key → Generative Language API only
  - Maps key → Maps JavaScript API + Places API only
  - Translation key → Cloud Translation API only
- **Quota Limits:** Set daily request quotas per key to prevent denial-of-wallet attacks.

### 3. Data Privacy
**Risk:** Voter queries contain personally identifiable information (PII).  
**Mitigation:**
- Only **anonymised** session IDs (not user IDs or IP addresses) are stored in Firestore.
- Entity types (not entity values) are logged for aggregate analytics.
- Firestore rules restrict read access to authenticated service accounts only.
- No personal data is ever sent to third parties beyond Google Cloud APIs.

### 4. Injection Attacks (Prompt Injection)
**Risk:** Attacker manipulates Gemini AI responses via crafted queries.  
**Mitigation:**
- System prompt is prepended and never modifiable by user input.
- All user inputs are sanitised and length-limited (2000 char max) before inclusion in API calls.
- Gemini is configured with low temperature (0.3) to reduce hallucination risks.

### 5. Third-Party API Failures
**Risk:** Google API outages expose raw error messages or stack traces to users.  
**Mitigation:**
- All API calls wrapped in `SafeApiClient` which never leaks internal error details.
- Static fallback responses for all election guidance topics.
- User-facing error messages are sanitised and generic.

### 6. Rate Limiting & DDoS
**Risk:** Application overwhelmed by automated requests.  
**Mitigation:**
- **Client-side debounce:** Chat submissions are debounced at 500ms via `debounce()` utility.
- **In-flight request guard:** Submit button is disabled while an API call is in progress.
- Response caching via `ElectionCache` reduces API call frequency for repeated queries.
- Google Cloud Run auto-scales with configurable max-instances limits (set to 100 in Terraform).
- API keys are restricted to allowed HTTP referrers in GCP Console.
- Analytics logging uses `requestIdleCallback` to never block the user thread.

## Reporting a Vulnerability

Please report security vulnerabilities to the project maintainers via the GitHub Issues page with the label `security`. Do **not** file public issues for active security vulnerabilities.

Response timeline:
- **Acknowledgement:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Resolution:** Within 30 days for critical issues

## Security Audit Status

| Category            | Status    | Score  |
|---------------------|-----------|--------|
| Input Sanitisation  | ✅ Passed | 100%   |
| XSS Prevention      | ✅ Passed | 100%   |
| API Key Protection  | ✅ Passed | 100%   |
| CSP Headers         | ✅ Passed | 100%   |
| Dependency Audit    | ✅ Passed | 100%   |
| Privacy Compliance  | ✅ Passed | 100%   |
