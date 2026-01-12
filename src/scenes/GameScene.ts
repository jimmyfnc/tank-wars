import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { Terrain } from '../world/Terrain';
import { Tank } from '../entities/Tank';
import { Projectile } from '../entities/Projectile';
import { TurnManager, GameState } from '../state/TurnManager';
import { TankAI, AIPersonality } from '../ai/TankAI';
import { JuiceManager } from '../juice';

/**
 * GameScene - Main game scene containing all gameplay logic.
 * Handles terrain, tanks, projectiles, input, UI, and the turn-based game loop.
 */
export class GameScene extends Phaser.Scene {
  // World objects
  private terrain!: Terrain;
  private tank1!: Tank;
  private tank2!: Tank;
  private projectile!: Projectile;

  // State management
  private turnManager!: TurnManager;

  // AI
  private vsAI: boolean = false;
  private aiPersonality: AIPersonality = AIPersonality.SHARPSHOOTER;
  private tankAI: TankAI | null = null;
  private aiReadyToFire: boolean = false;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;

  // UI elements
  private uiContainer!: Phaser.GameObjects.Container;
  private turnText!: Phaser.GameObjects.Text;
  private angleText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private windText!: Phaser.GameObjects.Text;
  private hp1Text!: Phaser.GameObjects.Text;
  private hp2Text!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;

  // Juice effects manager
  private juice!: JuiceManager;

  // Camera transition state
  private cameraTarget: { x: number; y: number } | null = null;

  // Track if tanks are currently falling
  private tanksSettling: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { vsAI?: boolean; aiPersonality?: AIPersonality }): void {
    this.vsAI = data.vsAI || false;
    this.aiPersonality = data.aiPersonality || AIPersonality.SHARPSHOOTER;
  }

  create(): void {
    // Create terrain first (background layer)
    this.terrain = new Terrain(this);

    // Create tanks on opposite sides of the map
    this.createTanks();

    // Create projectile (reused each shot)
    this.projectile = new Projectile(this);

    // Initialize juice effects system
    this.juice = new JuiceManager(this);

    // Initialize turn manager
    this.turnManager = new TurnManager();
    this.turnManager.setStateChangeCallback(this.onStateChange.bind(this));

    // Setup AI if vs computer mode
    if (this.vsAI) {
      this.tankAI = new TankAI(this.tank2, this.tank1, this.aiPersonality);
    }

    // Setup input
    this.setupInput();

    // Create UI
    this.createUI();

    // Initial UI update
    this.updateUI();

    // Center camera on active tank
    this.centerCameraOnTank(this.getActiveTank());
  }

  /**
   * Create and position tanks on the terrain
   */
  private createTanks(): void {
    // Tank 1 on left side
    const tank1X = 80;
    const tank1Y = this.terrain.getGroundY(tank1X);
    this.tank1 = new Tank(this, tank1X, tank1Y, 1);

    // Tank 2 on right side
    const tank2X = GAME_CONFIG.WORLD_WIDTH - 80;
    const tank2Y = this.terrain.getGroundY(tank2X);
    this.tank2 = new Tank(this, tank2X, tank2Y, 2);
  }

  /**
   * Setup keyboard input
   */
  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  /**
   * Create UI overlay
   */
  private createUI(): void {
    const padding = 10;
    const lineHeight = 20;

    // Create semi-transparent background for UI
    const uiBg = this.add.graphics();
    uiBg.fillStyle(0x000000, 0.7);
    uiBg.fillRect(0, 0, 200, 140);

    // Text style
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace'
    };

    // Create text elements
    this.turnText = this.add.text(padding, padding, '', textStyle);
    this.angleText = this.add.text(padding, padding + lineHeight, '', textStyle);
    this.powerText = this.add.text(padding, padding + lineHeight * 2, '', textStyle);
    this.windText = this.add.text(padding, padding + lineHeight * 3, '', textStyle);
    this.hp1Text = this.add.text(padding, padding + lineHeight * 4, '', { ...textStyle, color: '#4444ff' });
    this.hp2Text = this.add.text(padding, padding + lineHeight * 5, '', { ...textStyle, color: '#ff4444' });

    // Winner text (centered, initially hidden)
    this.winnerText = this.add.text(
      GAME_CONFIG.SCREEN_WIDTH / 2,
      GAME_CONFIG.SCREEN_HEIGHT / 2,
      '',
      {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setVisible(false);

    // Container to group UI elements (keeps them fixed on screen)
    this.uiContainer = this.add.container(0, 0, [
      uiBg,
      this.turnText,
      this.angleText,
      this.powerText,
      this.windText,
      this.hp1Text,
      this.hp2Text
    ]);

    // Make UI fixed to camera
    this.uiContainer.setScrollFactor(0);
    this.winnerText.setScrollFactor(0);
  }

  /**
   * Update UI text
   */
  private updateUI(): void {
    const activeTank = this.getActiveTank();
    const isAITurn = this.vsAI && this.turnManager.currentPlayer === 2;

    // Show whose turn with AI indicator
    if (isAITurn) {
      this.turnText.setText('Turn: Computer (thinking...)');
    } else {
      this.turnText.setText(`Turn: Player ${this.turnManager.currentPlayer}`);
    }

    this.angleText.setText(`Angle: ${Math.round(activeTank.angle)}°`);
    this.powerText.setText(`Power: ${Math.round(activeTank.power)}`);
    this.windText.setText(this.turnManager.getWindDisplay());
    this.hp1Text.setText(`P1 HP: ${this.tank1.hp}`);
    const aiLabel = this.vsAI && this.tankAI ? ` (${this.tankAI.getPersonalityName()})` : '';
    this.hp2Text.setText(`P2 HP: ${this.tank2.hp}${aiLabel}`);

    // Show winner if game over
    if (this.turnManager.isGameOver()) {
      const winnerName = this.turnManager.winner === 1 ? 'Player 1' : (this.vsAI ? 'Computer' : 'Player 2');
      this.winnerText.setText(`${winnerName} Wins!\n\nR - Restart | ESC - Menu`);
      this.winnerText.setVisible(true);
    } else {
      this.winnerText.setVisible(false);
    }
  }

  /**
   * Get the currently active tank
   */
  private getActiveTank(): Tank {
    return this.turnManager.currentPlayer === 1 ? this.tank1 : this.tank2;
  }

  /**
   * Center camera on a tank with smooth easing
   */
  private centerCameraOnTank(tank: Tank): void {
    this.cameraTarget = { x: tank.x, y: tank.y - 50 };
  }

  /**
   * Handle state machine transitions
   */
  private onStateChange(newState: GameState): void {
    switch (newState) {
      case GameState.AIMING:
        // If it's AI's turn, start AI thinking
        if (this.vsAI && this.turnManager.currentPlayer === 2 && this.tankAI) {
          this.aiReadyToFire = false;
          this.tankAI.startTurn(this.turnManager.wind);
        }
        break;

      case GameState.FIRING:
        // Camera will follow projectile (handled in update)
        break;

      case GameState.RESOLVING:
        // Explosion happens, then we check damage
        break;

      case GameState.TURN_END:
        // Small delay then move to next turn
        this.time.delayedCall(500, () => {
          this.turnManager.nextTurn();
          this.centerCameraOnTank(this.getActiveTank());
          this.updateUI();

          // Trigger AI state change if it's now AI's turn
          if (this.vsAI && this.turnManager.currentPlayer === 2 && this.tankAI) {
            this.aiReadyToFire = false;
            this.tankAI.startTurn(this.turnManager.wind);
          }
        });
        break;

      case GameState.GAME_OVER:
        this.updateUI();
        break;
    }
  }

  /**
   * Fire projectile from active tank
   */
  private fire(): void {
    const tank = this.getActiveTank();
    const tip = tank.getTurretTip();
    const vel = tank.getFireVelocity();

    // Fire juice effects (muzzle flash + sound)
    const fireAngle = Math.atan2(vel.vy, vel.vx);
    this.juice.fire(tip.x, tip.y, fireAngle);

    this.projectile.fire(tip.x, tip.y, vel.vx, vel.vy, this.turnManager.wind);
    this.turnManager.fire();
  }

  /**
   * Handle projectile impact
   */
  private handleImpact(x: number, y: number): void {
    this.projectile.deactivate();
    this.turnManager.projectileLanded();

    // Intensity is 1.0 for all explosions since we only have one weapon type.
    // When multiple weapons are added, this should vary based on weapon damage/radius.
    const intensity = 1.0;

    // Trigger juice effects (particles, shake, sound)
    this.juice.explosion(x, y, intensity);

    // Create crater in terrain (destructible terrain!)
    this.terrain.createCrater(x, y, GAME_CONFIG.EXPLOSION_RADIUS);

    // Apply damage to tanks in radius
    this.applyExplosionDamage(x, y);

    // After explosion animation, check for tank falling then resolve
    this.time.delayedCall(GAME_CONFIG.EXPLOSION_DURATION, () => {
      this.startTankSettling();
    });
  }

  /**
   * Start the tank settling phase (tanks fall if terrain destroyed beneath them)
   */
  private startTankSettling(): void {
    let anyFalling = false;

    // Check each tank
    [this.tank1, this.tank2].forEach(tank => {
      if (!tank.alive) return;

      const groundY = this.terrain.getGroundY(tank.x);
      if (tank.checkFalling(groundY)) {
        anyFalling = true;
      }
    });

    if (anyFalling) {
      this.tanksSettling = true;
      // Camera follows the falling tank(s)
    } else {
      // No tanks falling, resolve the turn immediately
      this.finishTurnResolution();
    }
  }

  /**
   * Finish turn resolution after tanks have settled
   */
  private finishTurnResolution(): void {
    this.tanksSettling = false;
    this.updateUI(); // Update HP display after any fall damage
    this.turnManager.resolveComplete(this.tank1.alive, this.tank2.alive);
  }

  /**
   * Apply explosion damage to tanks within radius
   */
  private applyExplosionDamage(x: number, y: number): void {
    const radius = GAME_CONFIG.EXPLOSION_RADIUS;
    const maxDamage = GAME_CONFIG.EXPLOSION_DAMAGE;
    const directHitBonus = GAME_CONFIG.DIRECT_HIT_BONUS;

    [this.tank1, this.tank2].forEach(tank => {
      if (!tank.alive) return;

      const distance = tank.getDistanceFrom(x, y);

      if (distance < radius) {
        // Scale damage by distance (closer = more damage)
        const damageFactor = 1 - (distance / radius);
        let damage = Math.round(maxDamage * damageFactor);

        // Bonus damage for very close hits (direct hit)
        const isDirectHit = distance < 30;
        if (isDirectHit) {
          damage += directHitBonus;
        }

        tank.takeDamage(damage);

        // Show damage number
        this.juice.showDamage(tank.x, tank.y, damage, isDirectHit);

        console.log(`Tank ${tank.playerId} hit! Distance: ${distance.toFixed(1)}, Damage: ${damage}`);
      }
    });
  }

  /**
   * Main update loop
   */
  update(_time: number, delta: number): void {
    const dt = delta / 1000; // Convert to seconds

    // Handle escape to return to menu
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.scene.start('MenuScene');
      return;
    }

    // Handle restart
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.restartGame();
      return;
    }

    // Handle input based on state
    if (this.turnManager.canAim() && !this.tanksSettling) {
      // Check if it's AI's turn
      if (this.vsAI && this.turnManager.currentPlayer === 2 && this.tankAI) {
        this.handleAITurn(dt);
      } else {
        this.handleAimingInput(dt);
      }
    }

    // Update projectile if active
    if (this.projectile.active) {
      this.projectile.update(dt);

      // Spawn smoke trail particles
      this.juice.trail(this.projectile.x, this.projectile.y);

      // Camera follows projectile
      this.cameraTarget = { x: this.projectile.x, y: this.projectile.y };

      // Check collision with terrain
      if (this.terrain.isUnderground(this.projectile.x, this.projectile.y)) {
        this.handleImpact(this.projectile.x, this.projectile.y);
      }
      // Check out of bounds
      else if (this.projectile.isOutOfBounds()) {
        // Out of bounds - just end turn, no damage
        this.projectile.deactivate();
        this.turnManager.projectileLanded();

        // Skip to resolve complete (no explosion shown for OOB)
        this.time.delayedCall(100, () => {
          this.turnManager.resolveComplete(this.tank1.alive, this.tank2.alive);
        });
      }
    }

    // Update falling tanks
    if (this.tanksSettling) {
      this.updateTankFalling(dt);
    }

    // Smooth camera movement
    this.updateCamera(dt);

    // Update UI continuously during aiming
    if (this.turnManager.canAim()) {
      this.updateUI();
    }
  }

  /**
   * Handle AI's turn
   */
  private handleAITurn(dt: number): void {
    if (!this.tankAI) return;

    // Update AI thinking/aiming
    const ready = this.tankAI.update(dt);

    if (ready && !this.aiReadyToFire) {
      this.aiReadyToFire = true;
      // Small delay before firing for visual effect
      this.time.delayedCall(300, () => {
        if (this.turnManager.canAim()) {
          this.fire();
        }
      });
    }
  }

  /**
   * Update tanks that are falling after terrain destruction
   */
  private updateTankFalling(dt: number): void {
    let anyStillFalling = false;

    [this.tank1, this.tank2].forEach(tank => {
      if (!tank.alive || !tank.isFalling) return;

      const groundY = this.terrain.getGroundY(tank.x);
      const previousY = tank.y;
      const landed = tank.updateFalling(dt, groundY);

      if (landed) {
        // Tank just landed - trigger dust and sound
        const fallDistance = groundY - previousY;
        this.juice.tankLanded(tank.x, tank.y, Math.abs(fallDistance));
      } else if (tank.isFalling) {
        anyStillFalling = true;
        // Camera follows falling tank
        this.cameraTarget = { x: tank.x, y: tank.y };
      }
    });

    // When all tanks have settled, finish the turn resolution
    if (!anyStillFalling) {
      this.finishTurnResolution();
    }
  }

  /**
   * Handle input during aiming phase
   */
  private handleAimingInput(dt: number): void {
    const tank = this.getActiveTank();

    // Adjust angle with left/right
    if (this.cursors.left.isDown) {
      tank.adjustAngle(GAME_CONFIG.ANGLE_SPEED * dt);
    }
    if (this.cursors.right.isDown) {
      tank.adjustAngle(-GAME_CONFIG.ANGLE_SPEED * dt);
    }

    // Adjust power with up/down
    if (this.cursors.up.isDown) {
      tank.adjustPower(GAME_CONFIG.POWER_SPEED * dt);
    }
    if (this.cursors.down.isDown) {
      tank.adjustPower(-GAME_CONFIG.POWER_SPEED * dt);
    }

    // Fire with space
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.fire();
    }
  }

  /**
   * Smooth camera movement toward target
   */
  private updateCamera(dt: number): void {
    // Update juice systems and get shake offset
    const { shakeOffset } = this.juice.update(dt);

    if (!this.cameraTarget) return;

    const camera = this.cameras.main;
    const currentX = camera.scrollX + camera.width / 2;
    const currentY = camera.scrollY + camera.height / 2;

    // Ease toward target
    const easeSpeed = 3;
    const newX = Phaser.Math.Linear(currentX, this.cameraTarget.x, easeSpeed * dt);
    const newY = Phaser.Math.Linear(currentY, this.cameraTarget.y, easeSpeed * dt);

    // Clamp camera to world bounds
    const halfWidth = camera.width / 2;
    const halfHeight = camera.height / 2;

    // Apply shake offset BEFORE clamping so camera stays in world bounds
    camera.scrollX = Phaser.Math.Clamp(newX - halfWidth + shakeOffset.x, 0, GAME_CONFIG.WORLD_WIDTH - camera.width);
    camera.scrollY = Phaser.Math.Clamp(newY - halfHeight + shakeOffset.y, 0, GAME_CONFIG.WORLD_HEIGHT - camera.height);
  }

  /**
   * Restart the game
   */
  private restartGame(): void {
    // Reset terrain
    this.terrain.reset();

    // Reset juice effects
    this.juice.reset();

    // Reposition tanks
    const tank1X = 80;
    const tank1Y = this.terrain.getGroundY(tank1X);
    this.tank1.setPosition(tank1X, tank1Y);
    this.tank1.reset();

    const tank2X = GAME_CONFIG.WORLD_WIDTH - 80;
    const tank2Y = this.terrain.getGroundY(tank2X);
    this.tank2.setPosition(tank2X, tank2Y);
    this.tank2.reset();

    // Reset projectile
    this.projectile.reset();

    // Reset turn manager
    this.turnManager.reset();

    // Update UI and camera
    this.updateUI();
    this.centerCameraOnTank(this.getActiveTank());
  }
}
