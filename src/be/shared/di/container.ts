/**
 * Basic Dependency Injection Container
 */

export class Container {
  private static instances = new Map<string, any>();
  private static factories = new Map<string, () => any>();

  /**
   * Register a singleton instance directly
   */
  static register<T>(token: string, instance: T): void {
    this.instances.set(token, instance);
  }

  /**
   * Register a factory function to create the instance lazily
   */
  static registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  /**
   * Resolve an instance by token
   */
  static resolve<T>(token: string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      // Cache the instance as a singleton
      this.instances.set(token, instance);
      return instance as T;
    }

    throw new Error(`Dependency '${token}' not found in DI container.`);
  }

  /**
   * Clear the container (useful for testing)
   */
  static clear(): void {
    this.instances.clear();
    this.factories.clear();
  }
}

/**
 * Decorator for property injection (Optional, if using experimentalDecorators)
 */
export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol) {
    Object.defineProperty(target, propertyKey, {
      get: () => Container.resolve(token),
      enumerable: true,
      configurable: true,
    });
  };
}
