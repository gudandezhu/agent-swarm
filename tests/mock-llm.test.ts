/**
 * MockLLM 测试 - TC-MOCK-001/002/003
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLM, createMockLLM } from './mocks/index.js';

describe('TC-MOCK-001: LLM Mock 基础响应', () => {
  let mockLLM: MockLLM;

  beforeEach(() => {
    mockLLM = new MockLLM();
  });

  it('应返回预设的 Mock 响应', async () => {
    mockLLM.setResponse('你好，这是一个测试响应。');

    const result = await mockLLM.chat({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result.content).toEqual([{ type: 'text', text: '你好，这是一个测试响应。' }]);
  });

  it('应记录调用历史', async () => {
    mockLLM.setResponse('响应1');

    await mockLLM.chat({ model: 'claude', messages: [{ role: 'user', content: 'A' }] });
    await mockLLM.chat({ model: 'claude', messages: [{ role: 'user', content: 'B' }] });

    const history = mockLLM.getCallHistory();
    expect(history.length).toBe(2);
    expect(history[0]).toMatchObject({
      type: 'chat',
      params: { model: 'claude', messages: [{ role: 'user', content: 'A' }] },
    });
  });

  it('应统计调用次数', async () => {
    mockLLM.setResponse('test');

    expect(mockLLM.callCount).toBe(0);

    await mockLLM.chat({ model: 'test', messages: [] });
    expect(mockLLM.callCount).toBe(1);

    await mockLLM.chat({ model: 'test', messages: [] });
    expect(mockLLM.callCount).toBe(2);
  });

  it('应始终返回 actualAPICalled 为 false', async () => {
    mockLLM.setResponse('test');
    await mockLLM.chat({ model: 'test', messages: [] });

    expect(mockLLM.actualAPICalled).toBe(false);
  });

  it('应支持工厂函数创建', () => {
    const mock = createMockLLM({ provider: 'anthropic' });
    expect(mock).toBeInstanceOf(MockLLM);
  });
});

describe('TC-MOCK-002: LLM Mock 流式响应', () => {
  let mockLLM: MockLLM;

  beforeEach(() => {
    mockLLM = new MockLLM();
  });

  it('应支持流式响应', async () => {
    const chunks = ['Hello', ' World', '!'];
    mockLLM.setStreamResponse(chunks);

    const stream = mockLLM.chatStream({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: '流式测试' }],
    });

    const collected: string[] = [];
    for await (const chunk of stream) {
      collected.push(chunk.content);
    }

    expect(collected).toEqual(chunks);
    expect(collected.join('')).toBe('Hello World!');
  });

  it('应记录流式调用历史', async () => {
    const chunks = ['A', 'B'];
    mockLLM.setStreamResponse(chunks);

    const stream = mockLLM.chatStream({
      model: 'claude',
      messages: [{ role: 'user', content: 'test' }],
    });

    // 消费流
    for await (const _ of stream) {
      // empty
    }

    const history = mockLLM.getCallHistory();
    expect(history.length).toBe(1);
    expect(history[0].type).toBe('stream');
  });
});

describe('TC-MOCK-003: LLM Mock 工具调用', () => {
  let mockLLM: MockLLM;

  beforeEach(() => {
    mockLLM = new MockLLM();
  });

  it('应模拟工具调用', async () => {
    mockLLM.setToolCallResponse({
      id: 'call_123',
      name: 'web_scraper',
      input: { url: 'https://example.com' },
    });

    const result = await mockLLM.chatWithTools({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: '爬取这个网站' }],
      tools: [
        {
          name: 'web_scraper',
          description: '爬取网页',
          inputSchema: {
            type: 'object',
            properties: { url: { type: 'string' } },
          },
        },
      ],
    });

    expect(result.stopReason).toBe('tool_use');
    expect(result.content).toEqual([
      {
        type: 'tool_use',
        id: 'call_123',
        name: 'web_scraper',
        input: { url: 'https://example.com' },
      },
    ]);
  });

  it('应支持多轮工具调用', async () => {
    // 第一轮：工具调用
    mockLLM.setToolCallResponse({
      id: 'call_1',
      name: 'search',
      input: { query: 'TypeScript' },
    });

    // 第二轮：基于工具结果回复
    mockLLM.setResponse('根据搜索结果，TypeScript 是...');

    // 第一轮
    const result1 = await mockLLM.chatWithTools({
      model: 'claude',
      messages: [{ role: 'user', content: '搜索 TypeScript' }],
      tools: [],
    });

    expect(result1.content[0].type).toBe('tool_use');

    // 第二轮
    const result2 = await mockLLM.chat({
      model: 'claude',
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result2.content[0].type).toBe('text');
  });
});

describe('MockLLM: reset 功能', () => {
  it('应重置所有状态', async () => {
    const mockLLM = new MockLLM();
    mockLLM.setResponse('test');
    mockLLM.setStreamResponse(['a', 'b']);
    mockLLM.setToolCallResponse({ id: 'x', name: 'y', input: {} });

    await mockLLM.chat({ model: 'test', messages: [] });

    expect(mockLLM.callCount).toBe(1);

    mockLLM.reset();

    expect(mockLLM.callCount).toBe(0);
    expect(mockLLM.getCallHistory()).toEqual([]);
  });
});
