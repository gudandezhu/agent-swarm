/**
 * 依赖注入容器
 *
 * 简单的服务容器，支持延迟初始化和单例模式
 */

type ServiceFactory<T> = () => T;

class ServiceContainer {
  private services = new Map<string, unknown>();
  private factories = new Map<string, ServiceFactory<unknown>>();

  /**
   * 注册服务工厂
   */
  register<T>(key: string, factory: ServiceFactory<T>): void {
    this.factories.set(key, factory);
  }

  /**
   * 注册单例实例
   */
  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * 获取服务
   */
  get<T>(key: string): T {
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service not found: ${key}`);
    }

    const instance = factory();
    this.services.set(key, instance);
    return instance as T;
  }

  /**
   * 检查服务是否已注册
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * 清除所有服务
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  /**
   * 获取所有注册的服务键
   */
  keys(): string[] {
    return Array.from(new Set([...this.services.keys(), ...this.factories.keys()]));
  }
}

/**
 * 全局容器实例
 */
export const container = new ServiceContainer();

/**
 * 容器类型导出
 */
export type { ServiceContainer };
