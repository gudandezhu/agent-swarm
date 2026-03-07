/**
 * DingTalkMessageStore - 钉钉消息持久化存储（向后兼容入口）
 *
 * @deprecated 请直接使用 `src/channel/dingtalk/DingTalkMessageStore`
 * 此文件仅用于向后兼容，将导入重定向到新模块
 */

export * from './dingtalk/index.js';
export { DingTalkMessageStore as default } from './dingtalk/DingTalkMessageStore.js';
