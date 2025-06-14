/**
 * DependencyManager - Handles module dependencies and initialization order
 */

import { Utils, eventBus } from './Utils.js';

export class DependencyManager {
  constructor() {
    this.dependencies = new Map();
    this.initialized = new Set();
    this.initializing = new Set();
    this.failed = new Set();
    
    this.setupDependencyGraph();
  }

  /**
   * Setup the dependency graph for all modules
   */
  setupDependencyGraph() {
    // Define module dependencies (what each module needs before it can initialize)
    this.dependencies.set('utils', []);
    this.dependencies.set('audioManager', ['utils']);
    this.dependencies.set('uiManager', ['utils']);
    this.dependencies.set('visualEffects', ['utils']);
    this.dependencies.set('canvasVisualizers', ['utils']);
    this.dependencies.set('threeJSScene', ['utils']);
    this.dependencies.set('app', ['utils', 'audioManager', 'uiManager', 'visualEffects', 'canvasVisualizers', 'threeJSScene']);
  }

  /**
   * Check if all dependencies for a module are satisfied
   */
  areDependenciesSatisfied(moduleName) {
    const deps = this.dependencies.get(moduleName) || [];
    return deps.every(dep => this.initialized.has(dep));
  }

  /**
   * Get modules that are ready to initialize
   */
  getReadyModules() {
    const ready = [];
    for (const [moduleName] of this.dependencies) {
      if (!this.initialized.has(moduleName) && 
          !this.initializing.has(moduleName) && 
          !this.failed.has(moduleName) &&
          this.areDependenciesSatisfied(moduleName)) {
        ready.push(moduleName);
      }
    }
    return ready;
  }

  /**
   * Mark a module as starting initialization
   */
  markInitializing(moduleName) {
    this.initializing.add(moduleName);
    eventBus.emit('dependency:initializing', { module: moduleName });
  }

  /**
   * Mark a module as successfully initialized
   */
  markInitialized(moduleName) {
    this.initializing.delete(moduleName);
    this.initialized.add(moduleName);
    eventBus.emit('dependency:initialized', { module: moduleName });
  }

  /**
   * Mark a module as failed to initialize
   */
  markFailed(moduleName, error) {
    this.initializing.delete(moduleName);
    this.failed.add(moduleName);
    eventBus.emit('dependency:failed', { module: moduleName, error });
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      total: this.dependencies.size,
      initialized: this.initialized.size,
      initializing: this.initializing.size,
      failed: this.failed.size,
      pending: this.dependencies.size - this.initialized.size - this.initializing.size - this.failed.size
    };
  }

  /**
   * Check if all modules are initialized
   */
  isComplete() {
    return this.initialized.size + this.failed.size === this.dependencies.size;
  }

  /**
   * Get dependency chain for a module
   */
  getDependencyChain(moduleName, visited = new Set()) {
    if (visited.has(moduleName)) {
      throw new Error(`Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${moduleName}`);
    }

    visited.add(moduleName);
    const deps = this.dependencies.get(moduleName) || [];
    const chain = [];

    for (const dep of deps) {
      chain.push(...this.getDependencyChain(dep, new Set(visited)));
      chain.push(dep);
    }

    return [...new Set(chain)]; // Remove duplicates
  }

  /**
   * Validate dependency graph for circular dependencies
   */
  validateDependencies() {
    try {
      for (const [moduleName] of this.dependencies) {
        this.getDependencyChain(moduleName);
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Reset dependency manager
   */
  reset() {
    this.initialized.clear();
    this.initializing.clear();
    this.failed.clear();
    eventBus.emit('dependency:reset');
  }
}

// Create and export singleton instance
export const dependencyManager = new DependencyManager();

// Validate dependencies on load
const validation = dependencyManager.validateDependencies();
if (!validation.valid) {
  console.error('Dependency validation failed:', validation.error);
}
