/**
 * Vectorium State Machine
 * Simple, fast, type-safe finite state machine for game states, UI states, and basic AI
 * 
 * Features:
 * - Type-safe state names (TypeScript union types)
 * - Enter/Update/Exit lifecycle callbacks
 * - Previous state tracking
 * - Optional transition validation
 * - Zero allocations in hot path
 * - Fluent API (method chaining)
 * 
 * Usage:
 * ```typescript
 * // Game state machine
 * const gameState = new StateMachine<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
 * 
 * gameState.onEnter('playing', () => {
 *   console.log('Game started!');
 *   spawnPlayer();
 * });
 * 
 * gameState.onUpdate('playing', (dt) => {
 *   updateGameplay(dt);
 *   
 *   if (isGameOver()) {
 *     gameState.transition('gameover');
 *   }
 * });
 * 
 * gameState.onExit('playing', () => {
 *   console.log('Game ended');
 *   cleanup();
 * });
 * 
 * // In game loop
 * gameState.update(deltaTime);
 * 
 * // Trigger transitions
 * if (pressedEscape) {
 *   gameState.transition('paused');
 * }
 * ```
 * 
 * Performance:
 * - Zero allocations during transitions
 * - Direct Map lookups (O(1))
 * - No virtual function calls
 * - No string concatenation
 */

export class StateMachine<TState extends string = string> {
  private currentState: TState | null = null;
  private previousState: TState | null = null;
  
  // Lifecycle callbacks
  private enterCallbacks = new Map<TState, () => void>();
  private updateCallbacks = new Map<TState, (dt: number) => void>();
  private exitCallbacks = new Map<TState, () => void>();
  
  // Transition validation (optional)
  private allowedTransitions = new Map<TState, Set<TState>>();
  private validateTransitions = false;
  
  // State timing (useful for debugging and time-based logic)
  private stateElapsedTime = 0;
  
  /**
   * Create a new state machine
   * @param initialState - Starting state (optional, can be set later with transition())
   */
  constructor(initialState?: TState) {
    if (initialState) {
      this.currentState = initialState;
      
      // Call enter callback if registered
      const enterCallback = this.enterCallbacks.get(initialState);
      if (enterCallback) {
        enterCallback();
      }
    }
  }
  
  /**
   * Get current state
   */
  getCurrentState(): TState | null {
    return this.currentState;
  }
  
  /**
   * Get previous state (useful for "return to previous" logic)
   */
  getPreviousState(): TState | null {
    return this.previousState;
  }
  
  /**
   * Check if currently in specific state
   */
  isInState(state: TState): boolean {
    return this.currentState === state;
  }
  
  /**
   * Check if in any of the provided states
   */
  isInAnyState(...states: TState[]): boolean {
    return states.some(state => this.currentState === state);
  }
  
  /**
   * Get time spent in current state (seconds)
   */
  getStateTime(): number {
    return this.stateElapsedTime;
  }
  
  /**
   * Transition to a new state
   * @param newState - Target state
   * @returns true if transition succeeded, false if blocked by validation
   */
  transition(newState: TState): boolean {
    // Ignore if already in this state
    if (this.currentState === newState) {
      return true;
    }
    
    // Validate transition if enabled
    if (this.validateTransitions && this.currentState) {
      const allowed = this.allowedTransitions.get(this.currentState);
      if (allowed && !allowed.has(newState)) {
        console.warn(`[StateMachine] Invalid transition: ${this.currentState} -> ${newState}`);
        return false;
      }
    }
    
    // Exit current state
    if (this.currentState) {
      const exitCallback = this.exitCallbacks.get(this.currentState);
      if (exitCallback) {
        try {
          exitCallback();
        } catch (error) {
          console.error(`[StateMachine] Error in exit callback for state "${this.currentState}":`, error);
        }
      }
    }
    
    // Perform transition
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateElapsedTime = 0;
    
    // Enter new state
    const enterCallback = this.enterCallbacks.get(newState);
    if (enterCallback) {
      try {
        enterCallback();
      } catch (error) {
        console.error(`[StateMachine] Error in enter callback for state "${newState}":`, error);
      }
    }
    
    return true;
  }
  
  /**
   * Return to previous state (if exists)
   * @returns true if transition succeeded, false if no previous state
   */
  returnToPreviousState(): boolean {
    if (this.previousState) {
      return this.transition(this.previousState);
    }
    return false;
  }
  
  /**
   * Update current state (call once per frame)
   * @param dt - Delta time in seconds
   */
  update(dt: number): void {
    if (this.currentState) {
      // Update state elapsed time
      this.stateElapsedTime += dt;
      
      // Call update callback
      const updateCallback = this.updateCallbacks.get(this.currentState);
      if (updateCallback) {
        try {
          updateCallback(dt);
        } catch (error) {
          console.error(`[StateMachine] Error in update callback for state "${this.currentState}":`, error);
        }
      }
    }
  }
  
  /**
   * Register enter callback for a state
   * Called once when entering the state
   * @param state - State name
   * @param callback - Function to call on enter
   * @returns this (for method chaining)
   */
  onEnter(state: TState, callback: () => void): this {
    this.enterCallbacks.set(state, callback);
    return this;
  }
  
  /**
   * Register update callback for a state
   * Called every frame while in the state
   * @param state - State name
   * @param callback - Function to call on update (receives delta time)
   * @returns this (for method chaining)
   */
  onUpdate(state: TState, callback: (dt: number) => void): this {
    this.updateCallbacks.set(state, callback);
    return this;
  }
  
  /**
   * Register exit callback for a state
   * Called once when leaving the state
   * @param state - State name
   * @param callback - Function to call on exit
   * @returns this (for method chaining)
   */
  onExit(state: TState, callback: () => void): this {
    this.exitCallbacks.set(state, callback);
    return this;
  }
  
  /**
   * Define an allowed transition (enables validation)
   * Once any transition is defined, only explicitly allowed transitions will work
   * @param from - Source state
   * @param to - Target state
   * @returns this (for method chaining)
   */
  allowTransition(from: TState, to: TState): this {
    if (!this.allowedTransitions.has(from)) {
      this.allowedTransitions.set(from, new Set());
    }
    this.allowedTransitions.get(from)!.add(to);
    this.validateTransitions = true;
    return this;
  }
  
  /**
   * Allow bidirectional transition (from -> to and to -> from)
   * @param stateA - First state
   * @param stateB - Second state
   * @returns this (for method chaining)
   */
  allowBidirectionalTransition(stateA: TState, stateB: TState): this {
    this.allowTransition(stateA, stateB);
    this.allowTransition(stateB, stateA);
    return this;
  }
  
  /**
   * Allow transitions from one state to multiple target states
   * @param from - Source state
   * @param toStates - Array of target states
   * @returns this (for method chaining)
   */
  allowTransitions(from: TState, ...toStates: TState[]): this {
    for (const to of toStates) {
      this.allowTransition(from, to);
    }
    return this;
  }
  
  /**
   * Disable transition validation (allow any transition)
   */
  disableValidation(): this {
    this.validateTransitions = false;
    return this;
  }
  
  /**
   * Enable transition validation
   */
  enableValidation(): this {
    this.validateTransitions = true;
    return this;
  }
  
  /**
   * Check if a transition is allowed
   * @param from - Source state
   * @param to - Target state
   * @returns true if transition is allowed (or validation is disabled)
   */
  isTransitionAllowed(from: TState, to: TState): boolean {
    if (!this.validateTransitions) {
      return true;
    }
    
    const allowed = this.allowedTransitions.get(from);
    return allowed ? allowed.has(to) : false;
  }
  
  /**
   * Get all states that can be transitioned to from current state
   * @returns Array of allowed target states (empty if validation disabled or no current state)
   */
  getAllowedTransitions(): TState[] {
    if (!this.validateTransitions || !this.currentState) {
      return [];
    }
    
    const allowed = this.allowedTransitions.get(this.currentState);
    return allowed ? Array.from(allowed) : [];
  }
  
  /**
   * Clear all callbacks and transition rules
   */
  clear(): void {
    this.enterCallbacks.clear();
    this.updateCallbacks.clear();
    this.exitCallbacks.clear();
    this.allowedTransitions.clear();
    this.validateTransitions = false;
  }
  
  /**
   * Reset state machine (clear state but keep callbacks)
   */
  reset(initialState?: TState): void {
    // Exit current state
    if (this.currentState) {
      const exitCallback = this.exitCallbacks.get(this.currentState);
      if (exitCallback) {
        try {
          exitCallback();
        } catch (error) {
          console.error(`[StateMachine] Error in exit callback during reset:`, error);
        }
      }
    }
    
    this.currentState = null;
    this.previousState = null;
    this.stateElapsedTime = 0;
    
    // Transition to initial state if provided
    if (initialState) {
      this.transition(initialState);
    }
  }
  
  /**
   * Get debug info (useful for logging/debugging)
   */
  getDebugInfo(): {
    currentState: TState | null;
    previousState: TState | null;
    stateTime: number;
    registeredStates: TState[];
    validationEnabled: boolean;
  } {
    // Collect all registered states
    const registeredStates = new Set<TState>();
    this.enterCallbacks.forEach((_, state) => registeredStates.add(state));
    this.updateCallbacks.forEach((_, state) => registeredStates.add(state));
    this.exitCallbacks.forEach((_, state) => registeredStates.add(state));
    
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      stateTime: this.stateElapsedTime,
      registeredStates: Array.from(registeredStates),
      validationEnabled: this.validateTransitions
    };
  }
}
