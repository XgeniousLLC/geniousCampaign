import { SettingsService } from '../settings/settings.service';
import { AiAssistService } from './ai-assist.service';

describe('AiAssistService', () => {
  let fetchSpy: jest.SpyInstance;

  afterEach(() => fetchSpy?.mockRestore());

  it('throws instead of faking output when the selected provider has no API key', async () => {
    const config = { get: (key: string) => (key === 'LLM_PROVIDER' ? 'openai' : undefined) } as unknown as SettingsService;
    const service = new AiAssistService(config);

    await expect(service.generateCopy({ prompt: 'write something' })).rejects.toThrow(/OpenAI is not configured/);
  });

  it('rejects an unknown LLM_PROVIDER value rather than silently falling back to one', async () => {
    const config = { get: (key: string) => (key === 'LLM_PROVIDER' ? 'anthropic' : undefined) } as unknown as SettingsService;
    const service = new AiAssistService(config);

    await expect(service.generateCopy({ prompt: 'write something' })).rejects.toThrow(/Unknown LLM_PROVIDER/);
  });

  it('calls the real OpenAI chat completions endpoint when configured, with the prompt plus the spintax-variety instruction', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Generated copy here' } }] }),
    } as Response);

    const values: Record<string, string> = { LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' };
    const config = { get: (key: string) => values[key] } as unknown as SettingsService;
    const service = new AiAssistService(config);

    const result = await service.generateCopy({ prompt: 'Friendly intro, under 90 words' });

    expect(result).toBe('Generated copy here');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }),
    );
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe('gpt-5.4-mini');
    expect(body.messages[1].content).toContain('Friendly intro, under 90 words');
    expect(body.messages[1].content.toLowerCase()).toContain('spintax');
  });

  it('routes to DeepSeek instead when LLM_PROVIDER=deepseek', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'DeepSeek copy' } }] }),
    } as Response);

    const values: Record<string, string> = { LLM_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'ds-key' };
    const config = { get: (key: string) => values[key] } as unknown as SettingsService;
    const service = new AiAssistService(config);

    const result = await service.generateCopy({ prompt: 'write something' });

    expect(result).toBe('DeepSeek copy');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.deepseek.com/chat/completions', expect.anything());
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe('deepseek-v4-flash');
  });

  it('a quick action wraps the previous result with a refinement instruction, not the original prompt', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Shorter version' } }] }),
    } as Response);

    const values: Record<string, string> = { LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' };
    const config = { get: (key: string) => values[key] } as unknown as SettingsService;
    const service = new AiAssistService(config);

    await service.generateCopy({ prompt: 'original prompt', quickAction: 'shorter', previousResult: 'the long draft to shrink' });

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[1].content).toContain('the long draft to shrink');
    expect(body.messages[1].content).not.toContain('original prompt');
    expect(body.messages[1].content.toLowerCase()).toContain('shorter');
  });
});
