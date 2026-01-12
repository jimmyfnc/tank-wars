import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { AIPersonality } from '../ai/TankAI';

/**
 * MenuScene - Title screen with game mode selection
 */
export class MenuScene extends Phaser.Scene {
  private selectedAI: AIPersonality = AIPersonality.SHARPSHOOTER;
  private aiButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const centerX = GAME_CONFIG.SCREEN_WIDTH / 2;

    // Title
    this.add.text(centerX, 80, 'TANK WARS', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, 140, 'Destructible Terrain Edition', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Game mode section
    this.add.text(centerX, 190, 'Select Game Mode:', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Button style
    const buttonStyle = {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#444444',
      padding: { x: 25, y: 12 }
    };

    // 2 Player Button
    const twoPlayerBtn = this.add.text(centerX, 240, '2 PLAYERS', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    twoPlayerBtn.on('pointerover', () => {
      twoPlayerBtn.setStyle({ backgroundColor: '#666666' });
    });
    twoPlayerBtn.on('pointerout', () => {
      twoPlayerBtn.setStyle({ backgroundColor: '#444444' });
    });
    twoPlayerBtn.on('pointerdown', () => {
      this.startGame(false);
    });

    // VS AI Button
    const vsAiBtn = this.add.text(centerX, 300, 'VS COMPUTER', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    vsAiBtn.on('pointerover', () => {
      vsAiBtn.setStyle({ backgroundColor: '#666666' });
    });
    vsAiBtn.on('pointerout', () => {
      vsAiBtn.setStyle({ backgroundColor: '#444444' });
    });
    vsAiBtn.on('pointerdown', () => {
      this.startGame(true);
    });

    // AI Selection section
    this.add.text(centerX, 360, 'AI Personality:', {
      fontSize: '18px',
      color: '#cccccc',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // AI personality buttons
    const aiTypes = [
      { type: AIPersonality.SHARPSHOOTER, label: 'SHARPSHOOTER', desc: 'Precise & deadly' },
      { type: AIPersonality.ARTILLERY, label: 'ARTILLERY', desc: 'High arcs & power' },
      { type: AIPersonality.DRUNK, label: 'DRUNK', desc: 'Unpredictable chaos' }
    ];

    const aiButtonStyle = {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333333',
      padding: { x: 10, y: 6 }
    };

    const startX = centerX - 200;
    const spacing = 140;

    aiTypes.forEach((ai, index) => {
      const x = startX + index * spacing;

      const btn = this.add.text(x, 400, ai.label, aiButtonStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      // Description text below button
      this.add.text(x, 425, ai.desc, {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      btn.on('pointerover', () => {
        if (this.selectedAI !== ai.type) {
          btn.setStyle({ backgroundColor: '#555555' });
        }
      });

      btn.on('pointerout', () => {
        if (this.selectedAI !== ai.type) {
          btn.setStyle({ backgroundColor: '#333333' });
        }
      });

      btn.on('pointerdown', () => {
        this.selectAI(ai.type);
      });

      this.aiButtons.push(btn);

      // Store the AI type on the button for reference
      (btn as Phaser.GameObjects.Text & { aiType: AIPersonality }).aiType = ai.type;
    });

    // Highlight initial selection
    this.updateAIButtonStyles();

    // Controls info
    const controlsText = [
      'Controls:',
      'LEFT/RIGHT - Adjust Angle',
      'UP/DOWN - Adjust Power',
      'SPACE - Fire',
      'R - Restart | ESC - Menu'
    ].join('\n');

    this.add.text(centerX, 510, controlsText, {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
      align: 'center'
    }).setOrigin(0.5);

    // Version
    this.add.text(GAME_CONFIG.SCREEN_WIDTH - 10, GAME_CONFIG.SCREEN_HEIGHT - 10, 'v0.3.0', {
      fontSize: '12px',
      color: '#666666',
      fontFamily: 'monospace'
    }).setOrigin(1, 1);
  }

  private selectAI(personality: AIPersonality): void {
    this.selectedAI = personality;
    this.updateAIButtonStyles();
  }

  private updateAIButtonStyles(): void {
    this.aiButtons.forEach(btn => {
      const typedBtn = btn as Phaser.GameObjects.Text & { aiType: AIPersonality };
      if (typedBtn.aiType === this.selectedAI) {
        btn.setStyle({ backgroundColor: '#006600', color: '#ffffff' });
      } else {
        btn.setStyle({ backgroundColor: '#333333', color: '#ffffff' });
      }
    });
  }

  private startGame(vsAI: boolean): void {
    this.scene.start('GameScene', {
      vsAI,
      aiPersonality: this.selectedAI
    });
  }
}
