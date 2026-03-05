/**
 * Message - 单次消息传递，路由控制
 */

export type MessageType = 'request' | 'response' | 'event' | 'error';

export interface MessagePayload {
  task?: string;
  data?: unknown;
}

export interface MessageACK {
  required: boolean;
  timeout: number; // 毫秒
  retry: number;
}

export interface Message {
  // 元数据
  id: string;
  timestamp: number;
  version: '1.0';

  // 路由
  from: string; // 发送者 ID
  to: string | string[]; // 目标 Agent ID（核心路由字段）
  sessionId: string; // 关联会话，用于读取上下文

  // 类型
  type: MessageType;

  // 异步响应
  correlationId?: string; // 匹配请求和响应
  replyTo?: string; // 响应目标

  // 内容
  payload: MessagePayload;

  // ACK（仅确认"收到"，不等待业务完成）
  ack: MessageACK;
}

export type MessageHandler = (message: Message) => Promise<void> | void;

export interface MessageOptions {
  from: string;
  to: string | string[];
  sessionId: string;
  type?: MessageType;
  payload: MessagePayload;
  ack?: Partial<MessageACK>;
  correlationId?: string;
  replyTo?: string;
}
