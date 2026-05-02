/**
 * StateMachine Tests
 * Comprehensive test suite for the Vectorium state machine
 */

import { StateMachine } from './StateMachine';

// Test helpers
let logs: string[] = [];
const log = (message: string) => logs.push(message);
const clearLogs = () => logs = [];

describe('StateMachine', () => {
  beforeEach(() => {
    clearLogs();
  });
  
  describe('Basic functionality', () => {
    it('should create with initial state', () => {
      const fsm = new StateMachine<'idle' | 'active'>('idle');
      expect(fsm.getCurrentState()).toBe('idle');
    });
    
    it('should create without initial state', () => {
      const fsm = new StateMachine<'idle' | 'active'>();
      expect(fsm.getCurrentState()).toBeNull();
    });
    
    it('should transition between states', () => {
      const fsm = new StateMachine<'idle' | 'active'>('idle');
      fsm.transition('active');
      expect(fsm.getCurrentState()).toBe('active');
      expect(fsm.getPreviousState()).toBe('idle');
    });
    
    it('should check if in specific state', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('a');
      expect(fsm.isInState('a')).toBe(true);
      expect(fsm.isInState('b')).toBe(false);
    });
    
    it('should check if in any of multiple states', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('b');
      expect(fsm.isInAnyState('a', 'b', 'c')).toBe(true);
      expect(fsm.isInAnyState('a', 'c')).toBe(false);
    });
    
    it('should ignore transition to same state', () => {
      const fsm = new StateMachine<'idle'>('idle');
      fsm.onEnter('idle', () => log('enter'));
      fsm.onExit('idle', () => log('exit'));
      
      clearLogs();
      fsm.transition('idle');
      
      expect(logs).toEqual([]); // No callbacks called
      expect(fsm.getCurrentState()).toBe('idle');
    });
  });
  
  describe('Lifecycle callbacks', () => {
    it('should call onEnter when entering state', () => {
      const fsm = new StateMachine<'idle' | 'active'>();
      
      fsm.onEnter('active', () => log('entered active'));
      fsm.transition('active');
      
      expect(logs).toContain('entered active');
    });
    
    it('should call onExit when leaving state', () => {
      const fsm = new StateMachine<'idle' | 'active'>('idle');
      
      fsm.onExit('idle', () => log('exited idle'));
      fsm.transition('active');
      
      expect(logs).toContain('exited idle');
    });
    
    it('should call onUpdate in game loop', () => {
      const fsm = new StateMachine<'playing'>('playing');
      
      fsm.onUpdate('playing', (dt) => log(`update: ${dt}`));
      fsm.update(0.016);
      
      expect(logs).toContain('update: 0.016');
    });
    
    it('should only update current state', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.onUpdate('a', () => log('update a'));
      fsm.onUpdate('b', () => log('update b'));
      
      fsm.update(0.016);
      expect(logs).toEqual(['update a']);
      
      clearLogs();
      fsm.transition('b');
      fsm.update(0.016);
      expect(logs).toContain('update b');
      expect(logs).not.toContain('update a');
    });
    
    it('should call callbacks in correct order: exit -> enter', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.onExit('a', () => log('exit a'));
      fsm.onEnter('b', () => log('enter b'));
      
      fsm.transition('b');
      
      expect(logs).toEqual(['exit a', 'enter b']);
    });
    
    it('should handle errors in callbacks gracefully', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.onExit('a', () => { throw new Error('Exit error'); });
      fsm.onEnter('b', () => log('enter b'));
      
      // Should not throw, but log error
      expect(() => fsm.transition('b')).not.toThrow();
      expect(fsm.getCurrentState()).toBe('b');
      expect(logs).toContain('enter b');
    });
  });
  
  describe('State timing', () => {
    it('should track time in state', () => {
      const fsm = new StateMachine<'idle'>('idle');
      
      expect(fsm.getStateTime()).toBe(0);
      
      fsm.update(1.0);
      expect(fsm.getStateTime()).toBeCloseTo(1.0);
      
      fsm.update(0.5);
      expect(fsm.getStateTime()).toBeCloseTo(1.5);
    });
    
    it('should reset time on state transition', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.update(1.0);
      expect(fsm.getStateTime()).toBeCloseTo(1.0);
      
      fsm.transition('b');
      expect(fsm.getStateTime()).toBe(0);
      
      fsm.update(0.5);
      expect(fsm.getStateTime()).toBeCloseTo(0.5);
    });
  });
  
  describe('Transition validation', () => {
    it('should allow any transition by default', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('a');
      
      expect(fsm.transition('b')).toBe(true);
      expect(fsm.transition('c')).toBe(true);
      expect(fsm.transition('a')).toBe(true);
    });
    
    it('should validate transitions when rules defined', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('a');
      
      fsm.allowTransition('a', 'b');
      fsm.allowTransition('b', 'c');
      
      expect(fsm.transition('b')).toBe(true); // a -> b allowed
      expect(fsm.getCurrentState()).toBe('b');
      
      expect(fsm.transition('a')).toBe(false); // b -> a not allowed
      expect(fsm.getCurrentState()).toBe('b'); // Still in b
      
      expect(fsm.transition('c')).toBe(true); // b -> c allowed
      expect(fsm.getCurrentState()).toBe('c');
    });
    
    it('should support bidirectional transitions', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.allowBidirectionalTransition('a', 'b');
      
      expect(fsm.transition('b')).toBe(true);
      expect(fsm.transition('a')).toBe(true);
    });
    
    it('should support multiple transitions from one state', () => {
      const fsm = new StateMachine<'menu' | 'playing' | 'settings' | 'credits'>('menu');
      
      fsm.allowTransitions('menu', 'playing', 'settings', 'credits');
      
      expect(fsm.transition('playing')).toBe(true);
      expect(fsm.getCurrentState()).toBe('playing');
      
      fsm.transition('menu');
      expect(fsm.transition('settings')).toBe(true);
    });
    
    it('should disable/enable validation', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.allowTransition('a', 'b'); // Only a -> b allowed
      
      // With validation
      expect(fsm.transition('b')).toBe(true);
      fsm.transition('a');
      expect(fsm.transition('a')).toBe(true); // Should stay in a (invalid transition)
      
      // Disable validation
      fsm.disableValidation();
      expect(fsm.transition('b')).toBe(true); // Now works
      
      // Re-enable validation
      fsm.enableValidation();
      expect(fsm.transition('a')).toBe(false); // Blocked again
    });
    
    it('should check if transition is allowed', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('a');
      
      fsm.allowTransition('a', 'b');
      
      expect(fsm.isTransitionAllowed('a', 'b')).toBe(true);
      expect(fsm.isTransitionAllowed('a', 'c')).toBe(false);
      expect(fsm.isTransitionAllowed('b', 'c')).toBe(false);
    });
    
    it('should get allowed transitions from current state', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('a');
      
      fsm.allowTransitions('a', 'b', 'c');
      
      const allowed = fsm.getAllowedTransitions();
      expect(allowed).toContain('b');
      expect(allowed).toContain('c');
      expect(allowed.length).toBe(2);
    });
  });
  
  describe('Return to previous state', () => {
    it('should return to previous state', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.transition('b');
      expect(fsm.getCurrentState()).toBe('b');
      
      fsm.returnToPreviousState();
      expect(fsm.getCurrentState()).toBe('a');
    });
    
    it('should return false if no previous state', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      expect(fsm.returnToPreviousState()).toBe(false);
      expect(fsm.getCurrentState()).toBe('a');
    });
  });
  
  describe('Reset and clear', () => {
    it('should reset state machine', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.onEnter('a', () => log('enter a'));
      fsm.onExit('a', () => log('exit a'));
      
      fsm.transition('b');
      fsm.update(1.0);
      
      clearLogs();
      fsm.reset('a');
      
      expect(logs).toEqual(['exit b', 'enter a']); // Should call exit for 'b', enter for 'a'
      expect(fsm.getCurrentState()).toBe('a');
      expect(fsm.getPreviousState()).toBeNull();
      expect(fsm.getStateTime()).toBe(0);
    });
    
    it('should clear all callbacks', () => {
      const fsm = new StateMachine<'a' | 'b'>('a');
      
      fsm.onEnter('a', () => log('enter'));
      fsm.onUpdate('a', () => log('update'));
      fsm.onExit('a', () => log('exit'));
      fsm.allowTransition('a', 'b');
      
      fsm.clear();
      
      fsm.transition('b');
      fsm.update(0.016);
      
      expect(logs).toEqual([]); // No callbacks called
    });
  });
  
  describe('Method chaining', () => {
    it('should support fluent API', () => {
      const fsm = new StateMachine<'idle' | 'walk' | 'run'>('idle');
      
      fsm
        .onEnter('walk', () => log('enter walk'))
        .onUpdate('walk', () => log('update walk'))
        .onExit('walk', () => log('exit walk'))
        .allowTransition('idle', 'walk')
        .allowTransition('walk', 'run')
        .allowBidirectionalTransition('walk', 'idle');
      
      expect(fsm.transition('walk')).toBe(true);
      expect(logs).toContain('enter walk');
    });
  });
  
  describe('Debug info', () => {
    it('should provide debug information', () => {
      const fsm = new StateMachine<'a' | 'b' | 'c'>('a');
      
      fsm.onEnter('a', () => {});
      fsm.onUpdate('b', () => {});
      fsm.onExit('c', () => {});
      fsm.allowTransition('a', 'b');
      
      const info = fsm.getDebugInfo();
      
      expect(info.currentState).toBe('a');
      expect(info.previousState).toBeNull();
      expect(info.stateTime).toBe(0);
      expect(info.registeredStates).toContain('a');
      expect(info.registeredStates).toContain('b');
      expect(info.registeredStates).toContain('c');
      expect(info.validationEnabled).toBe(true);
    });
  });
  
  describe('Real-world scenarios', () => {
    it('should handle game state transitions', () => {
      type GameState = 'menu' | 'playing' | 'paused' | 'gameover';
      const fsm = new StateMachine<GameState>('menu');
      
      let playerHealth = 100;
      let score = 0;
      
      fsm.onEnter('playing', () => {
        log('Game started');
        playerHealth = 100;
        score = 0;
      });
      
      fsm.onUpdate('playing', (dt) => {
        score += dt * 10;
        if (playerHealth <= 0) {
          fsm.transition('gameover');
        }
      });
      
      fsm.onEnter('paused', () => log('Game paused'));
      fsm.onEnter('gameover', () => log(`Game over! Score: ${Math.floor(score)}`));
      
      // Start game
      fsm.transition('playing');
      expect(logs).toContain('Game started');
      
      // Play for a bit
      clearLogs();
      fsm.update(1.0);
      expect(score).toBeCloseTo(10);
      
      // Pause
      fsm.transition('paused');
      expect(logs).toContain('Game paused');
      
      // Resume
      clearLogs();
      fsm.transition('playing');
      
      // Die
      playerHealth = 0;
      fsm.update(0.016);
      expect(logs).toContain('Game over! Score: 10');
      expect(fsm.getCurrentState()).toBe('gameover');
    });
    
    it('should handle animation state machine', () => {
      type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall';
      const fsm = new StateMachine<AnimState>('idle');
      
      let animationName = '';
      
      fsm.onEnter('idle', () => animationName = 'idle');
      fsm.onEnter('walk', () => animationName = 'walk');
      fsm.onEnter('run', () => animationName = 'run');
      fsm.onEnter('jump', () => animationName = 'jump');
      
      // Setup valid transitions
      fsm.allowTransitions('idle', 'walk', 'jump');
      fsm.allowTransitions('walk', 'idle', 'run', 'jump');
      fsm.allowTransitions('run', 'walk', 'jump');
      fsm.allowTransitions('jump', 'fall');
      fsm.allowTransitions('fall', 'idle');
      
      // Idle -> Walk
      fsm.transition('walk');
      expect(animationName).toBe('walk');
      
      // Walk -> Run
      fsm.transition('run');
      expect(animationName).toBe('run');
      
      // Run -> Jump
      fsm.transition('jump');
      expect(animationName).toBe('jump');
      
      // Can't jump from jump
      expect(fsm.transition('jump')).toBe(false);
      expect(fsm.getCurrentState()).toBe('jump');
    });
    
    it('should handle time-based state transitions', () => {
      type State = 'intro' | 'gameplay' | 'outro';
      const fsm = new StateMachine<State>('intro');
      
      const INTRO_DURATION = 2.0;
      const GAMEPLAY_DURATION = 10.0;
      
      fsm.onUpdate('intro', () => {
        if (fsm.getStateTime() >= INTRO_DURATION) {
          fsm.transition('gameplay');
        }
      });
      
      fsm.onUpdate('gameplay', () => {
        if (fsm.getStateTime() >= GAMEPLAY_DURATION) {
          fsm.transition('outro');
        }
      });
      
      // Simulate time passing
      expect(fsm.getCurrentState()).toBe('intro');
      
      fsm.update(1.0);
      expect(fsm.getCurrentState()).toBe('intro');
      
      fsm.update(1.5); // Total 2.5s, should transition
      expect(fsm.getCurrentState()).toBe('gameplay');
      
      fsm.update(10.0);
      expect(fsm.getCurrentState()).toBe('outro');
    });
  });
});
