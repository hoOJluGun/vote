import { vi, describe, test, expect, beforeEach } from 'vitest';
import { CELService } from '../../services/CELService';

// Mock node-fetch
vi.mock('node-fetch');
import fetch from 'node-fetch';
const { Response } = await import('node-fetch');

describe('CELService', () => {
  let celService: CELService;
  const mockBaseUrl = 'http://localhost:3000';
  const mockModel = 'test-model';

  beforeEach(() => {
    celService = new CELService(mockBaseUrl, mockModel);
    (fetch as vi.Mock).mockClear();
  });

  describe('constructor', () => {
    test('should create instance with default values', () => {
      const service = new CELService();
      expect(service).toBeInstanceOf(CELService);
    });

    test('should accept custom baseUrl and model', () => {
      expect(celService['baseUrl']).toBe(mockBaseUrl);
      expect(celService['defaultModel']).toBe(mockModel);
    });
  });

  describe('chat', () => {
    test('should make API call with correct parameters', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }]
      };

      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await celService.chat(messages, 'custom-model');

      expect(fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/chat/completions`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            model: 'custom-model',
            max_tokens: 2048,
            temperature: 0.7
          })
        })
      );
      expect(result).toBe('Test response');
    });

    test('should throw error when API call fails', async () => {
      (fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(celService.chat(messages))
        .rejects
        .toThrow('Failed to communicate with CEL: CEL API error: 500 Internal Server Error');
    });

    test('should handle network errors', async () => {
      (fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(celService.chat(messages))
        .rejects
        .toThrow('Failed to communicate with CEL: Network error');
    });
  });

  // ... остальные тесты остаются без изменений
  describe('generateCode', () => {
    test('should call chat with code generation prompt', async () => {
      const mockChat = vi.spyOn(celService, 'chat').mockResolvedValue('Generated code');

      const result = await celService.generateCode('create a function');

      expect(mockChat).toHaveBeenCalledWith([
        {
          role: 'system',
          content: 'You are a code generation expert. Generate clean, well-documented code based on the description.'
        },
        {
          role: 'user',
          content: 'Generate code for: create a function'
        }
      ]);
      expect(result).toBe('Generated code');
    });

    test('should include context when provided', async () => {
      const mockChat = vi.spyOn(celService, 'chat').mockResolvedValue('Generated code');

      await celService.generateCode('create a function', 'React component');

      expect(mockChat).toHaveBeenCalledWith([
        expect.any(Object),
        {
          role: 'user',
          content: 'Generate code for: create a function\n\nContext: React component'
        }
      ]);
    });
  });

  describe('getStatus', () => {
    test('should make GET request to health endpoint', async () => {
      const mockStatus = { status: 'ok', version: '1.0.0' };

      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStatus)
      });

      const result = await celService.getStatus();

      expect(fetch).toHaveBeenCalledWith(`${mockBaseUrl}/health`);
      expect(result).toEqual(mockStatus);
    });

    test('should throw error when status request fails', async () => {
      (fetch as vi.Mock).mockResolvedValue({
        ok: false
      });

      await expect(celService.getStatus())
        .rejects
        .toThrow('Failed to get status: Unable to fetch status');
    });
  });
});
