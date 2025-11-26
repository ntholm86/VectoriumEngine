// 🍭 State Machine Demo - Simple Game Example
import { VectoriumBuilder } from './vectorium/core/EngineBuilder';
import { Scene } from './vectorium/core/Engine';
import type { StateMachine } from './vectorium/core/StateMachine';

/**
 * 🎮 GAME STATE MACHINE DEMO
 * 
 * Demonstrates:
 * - Menu -> Playing -> Paused -> GameOver state flow
 * - Score tracking
 * - Lives system
 * - Time-based challenges
 * - State-specific rendering
 */

type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

class GameScene extends Scene {
  private gameState!: StateMachine<GameState>;
  
  // Game data
  private score = 0;
  private lives = 3;
  private comboMultiplier = 1;
  private difficultyTimer = 0;
  private spawnTimer = 0;
  
  // Entity tracking
  private playerEntity: number | null = null;
  private enemies: number[] = [];
  
  constructor() {
    super('game');
    
    // Create state machine
    this.gameState = this.createStateMachine<GameState>('menu');
    
    this.setupStateMachine();
  }
  
  private setupStateMachine(): void {
    // ============================================================================
    // MENU STATE
    // ============================================================================
    this.gameState.onEnter('menu', () => {
      console.log('📋 Entered MENU state');
      console.log('Press ENTER or SPACE to start game');
      this.clearGame();
      this.renderMenuText();
    });
    
    this.gameState.onUpdate('menu', (dt) => {
      // Debug: Log input state every 2 seconds
      if (Math.floor(this.gameState.getStateTime()) % 2 === 0 && this.gameState.getStateTime() % 2 < dt) {
        console.log('Menu update - waiting for input. InputManager:', !!this.inputManager);
        if (this.inputManager) {
          console.log('  Enter pressed:', this.inputManager.isKeyDown('Enter'));
          console.log('  Space pressed:', this.inputManager.isKeyDown(' ') || this.inputManager.isKeyDown('Space'));
        }
      }
      
      // Check for start game input
      if (this.inputManager?.isKeyJustPressed('Enter') || 
          this.inputManager?.isKeyJustPressed(' ') ||
          this.inputManager?.isKeyJustPressed('Space')) {
        console.log('🎮 Starting game from menu!');
        this.gameState.transition('playing');
      }
    });
    
    // ============================================================================
    // PLAYING STATE
    // ============================================================================
    this.gameState.onEnter('playing', () => {
      console.log('🎮 Entered PLAYING state');
      this.startGame();
    });
    
    this.gameState.onUpdate('playing', (dt) => {
      this.updateGameplay(dt);
      
      // Check for pause
      if (this.inputManager?.isKeyJustPressed('Escape') || this.inputManager?.isKeyJustPressed('p')) {
        this.gameState.transition('paused');
      }
      
      // Check for game over
      if (this.lives <= 0) {
        this.gameState.transition('gameover');
      }
    });
    
    this.gameState.onExit('playing', () => {
      console.log('⏸️ Exiting PLAYING state');
    });
    
    // ============================================================================
    // PAUSED STATE
    // ============================================================================
    this.gameState.onEnter('paused', () => {
      console.log('⏸️ Entered PAUSED state');
      this.renderPausedText();
    });
    
    this.gameState.onUpdate('paused', () => {
      // Check for resume
      if (this.inputManager?.isKeyJustPressed('Escape') || this.inputManager?.isKeyJustPressed('p')) {
        this.gameState.transition('playing');
      }
      
      // Check for quit to menu
      if (this.inputManager?.isKeyJustPressed('q')) {
        this.gameState.transition('menu');
      }
    });
    
    this.gameState.onExit('paused', () => {
      console.log('▶️ Resuming game');
      this.clearUI();
    });
    
    // ============================================================================
    // GAMEOVER STATE
    // ============================================================================
    this.gameState.onEnter('gameover', () => {
      console.log('💀 Entered GAMEOVER state');
      this.renderGameOverText();
    });
    
    this.gameState.onUpdate('gameover', () => {
      // Check for restart
      if (this.inputManager?.isKeyJustPressed('Enter') || this.inputManager?.isKeyJustPressed(' ')) {
        this.gameState.transition('menu');
      }
    });
    
    // Setup valid transitions (optional - for validation)
    this.gameState
      .allowTransitions('menu', 'playing')
      .allowTransitions('playing', 'paused', 'gameover')
      .allowTransitions('paused', 'playing', 'menu')
      .allowTransitions('gameover', 'menu');
  }
  
  // ============================================================================
  // GAME LOGIC
  // ============================================================================
  
  private startGame(): void {
    this.score = 0;
    this.lives = 3;
    this.comboMultiplier = 1;
    this.difficultyTimer = 0;
    this.spawnTimer = 0;
    this.enemies = [];
    
    // Clear world - destroy existing entities
    for (const enemyId of this.enemies) {
      if (this.world.isEntityActive(enemyId)) {
        this.world.destroyEntity(enemyId);
      }
    }
    if (this.playerEntity !== null && this.world.isEntityActive(this.playerEntity)) {
      this.world.destroyEntity(this.playerEntity);
    }
    this.enemies = [];
    this.playerEntity = null;
    this.clearUI();
    
    // Spawn player
    this.spawnPlayer();
    
    // Spawn initial enemies
    for (let i = 0; i < 5; i++) {
      this.spawnEnemy();
    }
  }
  
  private clearGame(): void {
    // Destroy all entities
    for (const enemyId of this.enemies) {
      if (this.world.isEntityActive(enemyId)) {
        this.world.destroyEntity(enemyId);
      }
    }
    if (this.playerEntity !== null && this.world.isEntityActive(this.playerEntity)) {
      this.world.destroyEntity(this.playerEntity);
    }
    this.enemies = [];
    this.playerEntity = null;
  }
  
  private updateGameplay(dt: number): void {
    // Increase difficulty over time
    this.difficultyTimer += dt;
    const difficulty = Math.min(1 + this.difficultyTimer / 30, 3); // Max 3x at 30 seconds
    
    // Spawn enemies
    this.spawnTimer += dt;
    const spawnRate = 2.0 / difficulty; // Spawn faster as difficulty increases
    
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }
    
    // Update player movement
    console.log('updateGameplay - playerEntity:', this.playerEntity, 'inputManager:', !!this.inputManager);
    if (this.playerEntity !== null) {
      this.updatePlayerMovement(dt);
    }
    
    // Check collisions
    this.checkCollisions();
    
    // Remove off-screen enemies
    this.cleanupOffscreenEntities();
    
    // Update score display
    this.updateGameUI();
  }
  
  private spawnPlayer(): void {
    console.log('🎮 Spawning player, spawnService:', !!this.spawnService);
    
    if (!this.spawnService) {
      // Fallback: create entity directly
      this.playerEntity = this.world.createEntity(
        this.worldWidth / 2,
        this.worldHeight - 100,
        0,
        0
      );
      const sizes = this.world.getSizes();
      const colorR = this.world.getColorR();
      const colorG = this.world.getColorG();
      const colorB = this.world.getColorB();
      
      sizes[this.playerEntity] = 30;
      colorR[this.playerEntity] = 0;
      colorG[this.playerEntity] = 255;
      colorB[this.playerEntity] = 0;
      
      console.log('✅ Player spawned directly:', this.playerEntity);
      return;
    }
    
    const entities = this.spawnService.spawnBatch({
      count: 1,
      shape: 'triangle' as const,
      physics: 'none' as const,
      size: { min: 30, max: 30 },
      color: 0x00FF00, // Green
      position: {
        x: this.worldWidth / 2,
        y: this.worldHeight - 100
      }
    });
    
    this.playerEntity = entities[0];
    console.log('✅ Player spawned via service:', this.playerEntity);
  }
  
  private spawnEnemy(): void {
    if (!this.spawnService) return;
    
    const entities = this.spawnService.spawnBatch({
      count: 1,
      shape: 'circle' as const,
      physics: 'gravity' as const,
      size: { min: 20, max: 40 },
      color: 0xFF0000, // Red
      position: {
        x: Math.random() * this.worldWidth,
        y: -50
      },
      velocity: {
        vx: { min: -50, max: 50 },
        vy: { min: 100, max: 300 }
      }
    });
    
    const enemyId = entities[0];
    this.enemies.push(enemyId);
  }
  
  private updatePlayerMovement(dt: number): void {
    if (this.playerEntity === null) {
      console.warn('No player entity!');
      return;
    }
    if (!this.inputManager) {
      console.warn('No input manager!');
      return;
    }
    
    const speed = 400; // pixels per second
    const posX = this.world.getX();
    const posY = this.world.getY();
    
    let dx = 0;
    let dy = 0;
    
    if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('a')) {
      dx -= speed * dt;
    }
    if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('d')) {
      dx += speed * dt;
    }
    if (this.inputManager.isKeyDown('ArrowUp') || this.inputManager.isKeyDown('w')) {
      dy -= speed * dt;
    }
    if (this.inputManager.isKeyDown('ArrowDown') || this.inputManager.isKeyDown('s')) {
      dy += speed * dt;
    }
    
    if (dx !== 0 || dy !== 0) {
      console.log('Moving player:', dx, dy);
      console.log('Player position before:', posX[this.playerEntity], posY[this.playerEntity]);
    }
    
    // Update position
    posX[this.playerEntity] += dx;
    posY[this.playerEntity] += dy;
    
    if (dx !== 0 || dy !== 0) {
      console.log('Player position after:', posX[this.playerEntity], posY[this.playerEntity]);
      console.log('World bounds:', this.worldWidth, this.worldHeight);
    }
    
    // Clamp to world bounds
    posX[this.playerEntity] = Math.max(0, Math.min(this.worldWidth, posX[this.playerEntity]));
    posY[this.playerEntity] = Math.max(0, Math.min(this.worldHeight, posY[this.playerEntity]));
  }
  
  private checkCollisions(): void {
    if (this.playerEntity === null) return;
    
    const posX = this.world.getX();
    const posY = this.world.getY();
    const sizes = this.world.getSizes();
    
    const playerX = posX[this.playerEntity];
    const playerY = posY[this.playerEntity];
    const playerSize = sizes[this.playerEntity];
    
    // Check player collision with enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemyId = this.enemies[i];
      
      if (!this.world.isEntityActive(enemyId)) {
        this.enemies.splice(i, 1);
        continue;
      }
      
      const enemyX = posX[enemyId];
      const enemyY = posY[enemyId];
      const enemySize = sizes[enemyId];
      
      // Simple circle collision
      const dx = playerX - enemyX;
      const dy = playerY - enemyY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (playerSize + enemySize) / 2;
      
      if (distance < minDistance) {
        // Hit enemy!
        this.onEnemyHit(enemyId);
      }
    }
  }
  
  private onEnemyHit(enemyId: number): void {
    // Check if enemy is above or below player
    const posY = this.world.getY();
    const playerY = this.playerEntity !== null ? posY[this.playerEntity] : 0;
    const enemyY = posY[enemyId];
    
    if (enemyY < playerY - 10) {
      // Enemy is above player - destroy enemy, gain points
      this.score += 10 * this.comboMultiplier;
      this.comboMultiplier = Math.min(this.comboMultiplier + 0.1, 5);
      this.world.destroyEntity(enemyId);
      
      // Remove from tracking
      const index = this.enemies.indexOf(enemyId);
      if (index !== -1) {
        this.enemies.splice(index, 1);
      }
    } else {
      // Enemy hit from side/below - lose life
      this.lives--;
      this.comboMultiplier = 1;
      this.world.destroyEntity(enemyId);
      
      // Remove from tracking
      const index = this.enemies.indexOf(enemyId);
      if (index !== -1) {
        this.enemies.splice(index, 1);
      }
      
      // Flash player red
      if (this.playerEntity !== null) {
        const colorR = this.world.getColorR();
        const colorG = this.world.getColorG();
        const colorB = this.world.getColorB();
        
        colorR[this.playerEntity] = 255;
        colorG[this.playerEntity] = 0;
        colorB[this.playerEntity] = 0;
        
        setTimeout(() => {
          if (this.playerEntity !== null) {
            colorR[this.playerEntity] = 0;
            colorG[this.playerEntity] = 255;
            colorB[this.playerEntity] = 0;
          }
        }, 200);
      }
    }
  }
  
  private cleanupOffscreenEntities(): void {
    const posY = this.world.getY();
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemyId = this.enemies[i];
      
      if (!this.world.isEntityActive(enemyId) || posY[enemyId] > this.worldHeight + 100) {
        this.world.destroyEntity(enemyId);
        this.enemies.splice(i, 1);
      }
    }
  }
  
  // ============================================================================
  // UI RENDERING
  // ============================================================================
  
  private clearUI(): void {
    // Clear all text entities
    const textEntities = this.getTextEntities();
    for (const [entityId] of textEntities) {
      this.world.destroyEntity(entityId);
    }
    textEntities.clear();
  }
  
  private renderMenuText(): void {
    if (!this.textRenderer) return;
    
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;
    
    // Title
    this.createText('VECTORIUM', centerX, centerY - 100, {
      fontSize: 72,
      align: 'center',
      color: 0xFFFFFF,
      outline: true,
      outlineWidth: 4
    });
    
    // Subtitle
    this.createText('State Machine Demo', centerX, centerY - 20, {
      fontSize: 32,
      align: 'center',
      color: 0xCCCCCC
    });
    
    // Instructions
    this.createText('Press ENTER or SPACE to start', centerX, centerY + 60, {
      fontSize: 24,
      align: 'center',
      color: 0xFFFF00
    });
    
    // Controls
    this.createText('Controls: WASD or Arrow Keys', centerX, centerY + 120, {
      fontSize: 18,
      align: 'center',
      color: 0xAAAAAA
    });
    
    this.createText('Pause: ESC or P', centerX, centerY + 150, {
      fontSize: 18,
      align: 'center',
      color: 0xAAAAAA
    });
  }
  
  private renderPausedText(): void {
    if (!this.textRenderer) return;
    
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;
    
    // Paused
    this.createText('PAUSED', centerX, centerY - 40, {
      fontSize: 64,
      align: 'center',
      color: 0xFFFF00,
      outline: true,
      outlineWidth: 4
    });
    
    // Instructions
    this.createText('Press ESC or P to resume', centerX, centerY + 40, {
      fontSize: 24,
      align: 'center',
      color: 0xFFFFFF
    });
    
    this.createText('Press Q to quit to menu', centerX, centerY + 80, {
      fontSize: 24,
      align: 'center',
      color: 0xCCCCCC
    });
  }
  
  private renderGameOverText(): void {
    if (!this.textRenderer) return;
    
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;
    
    // Game Over
    this.createText('GAME OVER', centerX, centerY - 80, {
      fontSize: 64,
      align: 'center',
      color: 0xFF0000,
      outline: true,
      outlineWidth: 4
    });
    
    // Score
    this.createText(`Final Score: ${Math.floor(this.score)}`, centerX, centerY, {
      fontSize: 36,
      align: 'center',
      color: 0xFFFF00
    });
    
    // Instructions
    this.createText('Press ENTER or SPACE to return to menu', centerX, centerY + 80, {
      fontSize: 20,
      align: 'center',
      color: 0xCCCCCC
    });
  }
  
  private updateGameUI(): void {
    if (!this.textRenderer || this.gameState.getCurrentState() !== 'playing') return;
    
    // Clear previous UI
    this.clearUI();
    
    // Score
    this.createText(`Score: ${Math.floor(this.score)}`, 50, 50, {
      fontSize: 28,
      align: 'left',
      color: 0xFFFFFF,
      shadow: true
    });
    
    // Lives
    this.createText(`Lives: ${'❤️'.repeat(this.lives)}`, 50, 90, {
      fontSize: 24,
      align: 'left',
      color: 0xFF0000
    });
    
    // Combo
    if (this.comboMultiplier > 1) {
      this.createText(`Combo: x${this.comboMultiplier.toFixed(1)}`, 50, 130, {
        fontSize: 24,
        align: 'left',
        color: 0xFFFF00
      });
    }
    
    // Time
    const time = Math.floor(this.gameState.getStateTime());
    this.createText(`Time: ${time}s`, this.worldWidth - 50, 50, {
      fontSize: 24,
      align: 'right',
      color: 0xCCCCCC
    });
    
    // Enemies
    this.createText(`Enemies: ${this.enemies.length}`, this.worldWidth - 50, 90, {
      fontSize: 20,
      align: 'right',
      color: 0xFF8800
    });
  }
  
  private createText(text: string, x: number, y: number, style: any): void {
    const entityId = this.world.createEntity(x, y, 0, 0);
    this.getTextEntities().set(entityId, { text, style });
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initDemo() {
  const engine = new VectoriumBuilder()
    .withFullscreenCanvas()
    .withQuality('high')
    .withTargetFPS(60)
    .enableDebugTools()
    .withScene('game', new GameScene())
    .build();
  
  // Start engine
  engine.loadScene('game').then(() => {
    engine.start();
    console.log('🎮 Game started! Use WASD/Arrows to move, ESC/P to pause');
    
    // Hide loading screen
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
      loadingDiv.style.display = 'none';
    }
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
