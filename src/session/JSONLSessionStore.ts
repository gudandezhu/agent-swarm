/**
 * JSONLSessionStore - JSONL 格式的 Session 持久化（向后兼容入口）
 *
 * @deprecated 请直接使用 `src/session/store/JSONLSessionStore`
 * 此文件仅用于向后兼容，将导入重定向到新模块
 */

export * from './store/index.js';
export { JSONLSessionStore as default } from './store/JSONLSessionStore.js';
