import { GAME_CONFIG } from '../config';

/**
 * Game states for the turn-based state machine
 */
export enum GameState {
  AIMING = 'AIMING',       // Player is adjusting angle/power
  FIRING = 'FIRING',       // Projectile is in flight
  RESOLVING = 'RESOLVING', // Explosion/damage being calculated
  TURN_END = 'TURN_END',   // Transitioning to next player
  GAME_OVER = 'GAME_OVER'  // A player has won
}

/**
 * TurnManager - handles turn-based game flow and state machine.
 * Manages whose turn it is, wind generation, and game state transitions.
 */
export class TurnManager {
  // Current game state
  public state: GameState = GameState.AIMING;

  // Current player (1 or 2)
  public currentPlayer: number = 1;

  // Wind value for current turn (positive = right, negative = left)
  public wind: number = 0;

  // Winner (0 = no winner yet, 1 or 2 = player who won)
  public winner: number = 0;

  // Callback for state changes (so scene can react)
  private onStateChange?: (newState: GameState) => void;

  constructor() {
    this.generateWind();
  }

  /**
   * Set callback for state changes
   */
  setStateChangeCallback(callback: (newState: GameState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Generate random wind for the current turn
   */
  generateWind(): void {
    // Random wind between -MAX_WIND and +MAX_WIND
    this.wind = (Math.random() * 2 - 1) * GAME_CONFIG.MAX_WIND;
  }

  /**
   * Transition to a new state
   */
  setState(newState: GameState): void {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  /**
   * Called when player fires - transition from AIMING to FIRING
   */
  fire(): void {
    if (this.state === GameState.AIMING) {
      this.setState(GameState.FIRING);
    }
  }

  /**
   * Called when projectile lands/explodes - transition to RESOLVING
   */
  projectileLanded(): void {
    if (this.state === GameState.FIRING) {
      this.setState(GameState.RESOLVING);
    }
  }

  /**
   * Called after damage is resolved - check for winner or end turn
   */
  resolveComplete(player1Alive: boolean, player2Alive: boolean): void {
    if (this.state !== GameState.RESOLVING) return;

    // Check for winner
    if (!player1Alive) {
      this.winner = 2;
      this.setState(GameState.GAME_OVER);
      return;
    }
    if (!player2Alive) {
      this.winner = 1;
      this.setState(GameState.GAME_OVER);
      return;
    }

    // No winner, move to turn end
    this.setState(GameState.TURN_END);
  }

  /**
   * Called to start the next player's turn
   */
  nextTurn(): void {
    if (this.state !== GameState.TURN_END) return;

    // Switch players
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

    // Generate new wind for this turn
    this.generateWind();

    // Back to aiming
    this.setState(GameState.AIMING);
  }

  /**
   * Get wind direction as a string for UI
   */
  getWindDirection(): string {
    if (Math.abs(this.wind) < 5) return 'Calm';
    return this.wind > 0 ? 'Right' : 'Left';
  }

  /**
   * Get wind strength for UI (0-100 scale)
   */
  getWindStrength(): number {
    return Math.round((Math.abs(this.wind) / GAME_CONFIG.MAX_WIND) * 100);
  }

  /**
   * Get formatted wind string for UI
   */
  getWindDisplay(): string {
    const strength = this.getWindStrength();
    const direction = this.getWindDirection();
    if (direction === 'Calm') return 'Wind: Calm';

    // Create arrow indicator
    const arrow = this.wind > 0 ? '→' : '←';
    return `Wind: ${arrow} ${strength}%`;
  }

  /**
   * Reset for a new game
   */
  reset(): void {
    this.state = GameState.AIMING;
    this.currentPlayer = 1;
    this.winner = 0;
    this.generateWind();
  }

  /**
   * Check if it's currently the aiming phase (player can adjust)
   */
  canAim(): boolean {
    return this.state === GameState.AIMING;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.state === GameState.GAME_OVER;
  }
}
