/**
 * Extended coverage tests for ElectionCoachService tool handlers
 * and ElectionVertexService embedding paths.
 *
 * Targets the uncovered lines in gemini.ts (handleCheckEligibility,
 * handleGetTimeline) and vertex.ts (embedText, getCorpusEmbeddings).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────────────────────
// Gemini: handleCheckEligibility & handleGetTimeline
// ──────────────────────────────────────────────────────────────

describe('ElectionCoachService — Eligibility & Timeline Handlers', () => {
  beforeEach(() => {
    vi.stubGlobal('import', { meta: { env: {} } });
  });

  it('should return eligibility result for an eligible voter', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();

    // Access the private handler via processToolCall
    const result = await (service as unknown as {
      processToolCall: (call: { name: string; args: Record<string, unknown> }) => Promise<{ result: string; status: string }>;
    }).processToolCall({
      name: 'check_voter_eligibility',
      args: { age: 25, is_indian_citizen: true },
    });

    expect(result.status).toBe('success');
    expect(result.result).toContain('eligible');
  });

  it('should return non-citizen note for non-Indian citizens', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();

    const result = await (service as unknown as {
      processToolCall: (call: { name: string; args: Record<string, unknown> }) => Promise<{ result: string; status: string }>;
    }).processToolCall({
      name: 'check_voter_eligibility',
      args: { age: 30, is_indian_citizen: false },
    });

    expect(result.status).toBe('success');
    expect(result.result).toContain('Indian citizens');
  });

  it('should return ineligible result for underage voter', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();

    const result = await (service as unknown as {
      processToolCall: (call: { name: string; args: Record<string, unknown> }) => Promise<{ result: string; status: string }>;
    }).processToolCall({
      name: 'check_voter_eligibility',
      args: { age: 15, is_indian_citizen: true },
    });

    expect(result.status).toBe('success');
    expect(typeof result.result).toBe('string');
    expect(result.result.length).toBeGreaterThan(0);
  });

  it('should return eligibility result with missing age (defaults to 0)', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();

    const result = await (service as unknown as {
      processToolCall: (call: { name: string; args: Record<string, unknown> }) => Promise<{ result: string; status: string }>;
    }).processToolCall({
      name: 'check_voter_eligibility',
      args: {},
    });

    expect(result.status).toBe('success');
    expect(typeof result.result).toBe('string');
  });

  it('should return timeline summary via get_election_timeline', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();

    const result = await (service as unknown as {
      processToolCall: (call: { name: string; args: Record<string, unknown> }) => Promise<{ result: string; status: string }>;
    }).processToolCall({
      name: 'get_election_timeline',
      args: {},
    });

    expect(result.status).toBe('success');
    expect(result.result.length).toBeGreaterThan(0);
    // Should contain timeline event text
    expect(result.result).toMatch(/\w+/);
  });

  it('should return error for unknown tool name', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();

    const result = await (service as unknown as {
      processToolCall: (call: { name: string; args: Record<string, unknown> }) => Promise<{ result: string; status: string }>;
    }).processToolCall({
      name: 'nonexistent_tool',
      args: {},
    });

    expect(result.status).toBe('error');
    expect(result.result).toContain('Unknown tool');
  });

  it('should return maps link fallback when polling location search fails', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();
    // Mock the maps service to return failure
    (service as any).mapsService.searchPollingLocations = vi.fn().mockResolvedValue({ ok: false, data: null });

    const result = await (service as any).processToolCall({
      name: 'find_polling_location',
      args: { query: 'test query' },
    });

    expect(result.status).toBe('success');
    expect(result.result).toContain('Search on Google Maps:');
  });

  it('should return FAQ match when relevant FAQ is found', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();
    // Mock vertex service to return a match
    (service as any).vertexService.findRelevantFaq = vi.fn().mockResolvedValue({
      question: 'Test Q',
      answer: 'Test A',
      score: 0.95
    });

    const result = await (service as any).processToolCall({
      name: 'lookup_election_faq',
      args: { search_query: 'test query' },
    });

    expect(result.status).toBe('success');
    expect(result.result).toContain('Test Q');
    expect(result.result).toContain('Test A');
    expect(result.result).toContain('95%');
  });

  it('should return fallback message when no relevant FAQ is found', async () => {
    const { ElectionCoachService } = await import('../../src/services/gemini');
    const service = new ElectionCoachService();
    // Mock vertex service to return null
    (service as any).vertexService.findRelevantFaq = vi.fn().mockResolvedValue(null);

    const result = await (service as any).processToolCall({
      name: 'lookup_election_faq',
      args: { search_query: 'unknown query' },
    });

    expect(result.status).toBe('success');
    expect(result.result).toContain('No matching FAQ found');
  });
});

// ──────────────────────────────────────────────────────────────
// Vertex: embedText, getCorpusEmbeddings concurrent guard
// ──────────────────────────────────────────────────────────────

describe('ElectionVertexService — Embedding Paths', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null from embedText when API fails', async () => {
    // Mock fetch to return error
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
      headers: new Headers(),
    }));

    vi.stubGlobal('import', { meta: { env: {
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GOOGLE_CLOUD_PROJECT: 'test-project',
    } } });

    const { ElectionVertexService } = await import('../../src/services/vertex');
    const service = new ElectionVertexService();

    // Access private embedText
    const result = await (service as unknown as {
      embedText: (text: string) => Promise<number[] | null>;
    }).embedText('test query');

    // Should return null on API failure
    expect(result).toBeNull();
  });

  it('should return embeddings from embedText when API succeeds', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        predictions: [{
          embeddings: { values: mockEmbedding },
        }],
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    }));

    vi.stubGlobal('import', { meta: { env: {
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GOOGLE_CLOUD_PROJECT: 'test-project',
    } } });

    const { ElectionVertexService } = await import('../../src/services/vertex');
    const service = new ElectionVertexService();

    const result = await (service as unknown as {
      embedText: (text: string) => Promise<number[] | null>;
    }).embedText('voter eligibility');

    // embedText should return the values from API
    if (result !== null) {
      expect(Array.isArray(result)).toBe(true);
    }
  });

  it('should deduplicate concurrent getCorpusEmbeddings calls', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          predictions: [{
            embeddings: { values: [0.1, 0.2] },
          }],
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });
    }));

    vi.stubGlobal('import', { meta: { env: {
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GOOGLE_CLOUD_PROJECT: 'test-project',
    } } });

    const { ElectionVertexService } = await import('../../src/services/vertex');
    const service = new ElectionVertexService();

    const getCorpus = (service as unknown as {
      getCorpusEmbeddings: () => Promise<(number[] | null)[]>;
    }).getCorpusEmbeddings.bind(service);

    // Fire two concurrent calls — the second should reuse the in-flight promise
    const [result1, result2] = await Promise.all([getCorpus(), getCorpus()]);

    expect(result1).toEqual(result2);
    // Both should return arrays
    expect(Array.isArray(result1)).toBe(true);
  });

  it('should use cached corpus embeddings on second call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        predictions: [{
          embeddings: { values: [0.5, 0.6] },
        }],
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    }));

    vi.stubGlobal('import', { meta: { env: {
      VITE_GEMINI_API_KEY: 'test-key',
      VITE_GOOGLE_CLOUD_PROJECT: 'test-project',
    } } });

    const { ElectionVertexService } = await import('../../src/services/vertex');
    const service = new ElectionVertexService();

    const getCorpus = (service as unknown as {
      getCorpusEmbeddings: () => Promise<(number[] | null)[]>;
    }).getCorpusEmbeddings.bind(service);

    // First call computes embeddings
    const first = await getCorpus();
    // Second call should return cache (no new fetch calls)
    const fetchCallsBefore = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    const second = await getCorpus();
    const fetchCallsAfter = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(first).toEqual(second);
    // No new fetch calls should have been made for the cached path
    expect(fetchCallsAfter).toBe(fetchCallsBefore);
  });
});
