import Phaser from 'phaser';

/**
 * Utility class for creating platforms with custom collision boundaries
 * to compensate for sprite padding and improve collision accuracy
 */
export class PlatformUtils {
  /**
   * Creates a platform with custom collision padding adjustments
   * @param scene - The Phaser scene
   * @param platforms - The static physics group to add the platform to
   * @param x - X position
   * @param y - Y position  
   * @param texture - Texture key
   * @param scaleX - X scale factor (default: 1)
   * @param scaleY - Y scale factor (default: 1)
   * @param paddingTop - Percentage of height to remove from top (0-1, default: 0)
   * @param paddingBottom - Percentage of height to remove from bottom (0-1, default: 0)
   * @param paddingLeft - Percentage of width to remove from left (0-1, default: 0)
   * @param paddingRight - Percentage of width to remove from right (0-1, default: 0)
   */
  static createPlatformWithPadding(
    scene: Phaser.Scene,
    platforms: Phaser.Physics.Arcade.StaticGroup,
    x: number, 
    y: number, 
    texture: string, 
    scaleX: number = 1, 
    scaleY: number = 1,
    paddingTop: number = 0,
    paddingBottom: number = 0,
    paddingLeft: number = 0,
    paddingRight: number = 0
  ): Phaser.Physics.Arcade.Sprite {
    const platform = platforms.create(x, y, texture).setScale(scaleX, scaleY).refreshBody();
    
    // Calculate new collision body dimensions
    const originalWidth = platform.displayWidth;
    const originalHeight = platform.displayHeight;
    
    const newWidth = originalWidth * (1 - paddingLeft - paddingRight);
    const newHeight = originalHeight * (1 - paddingTop - paddingBottom);
    
    const offsetX = originalWidth * paddingLeft;
    const offsetY = originalHeight * paddingTop;
    
    // Apply collision body adjustments
    platform.body.setSize(newWidth, newHeight);
    platform.body.setOffset(offsetX, offsetY);
    
    return platform;
  }

  /**
   * Preset configurations for common platform types
   */
  static readonly PLATFORM_PRESETS = {
    // Ground platform with 5% padding removed from top
    GROUND: {
      paddingTop: 0.025,
      paddingBottom: 0.025,
      paddingLeft: 0.04,
      paddingRight: 0.04
    },
    
    // Ground2 platform with 20% padding removed all around
    GROUND_2: {
      paddingTop: 0.2,
      paddingBottom: 0.2,
      paddingLeft: 0.2,
      paddingRight: 0.2
    },

    // Grassy floor - surface at 30% from top (resolution 538 × 107)
    GRASSY_FLOOR: {
      paddingTop: 0.3,     // Surface is at 30% from top, so remove top 30%
      paddingBottom: 0.05, // Small bottom padding for visual accuracy
      paddingLeft: 0.02,   // Minimal side padding
      paddingRight: 0.02
    },

    // No padding (default platform)
    DEFAULT: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0
    }
  };

  /**
   * Creates a platform using predefined presets
   * @param scene - The Phaser scene
   * @param platforms - The static physics group to add the platform to
   * @param x - X position
   * @param y - Y position
   * @param texture - Texture key
   * @param preset - Preset configuration key
   * @param scaleX - X scale factor (default: 1)
   * @param scaleY - Y scale factor (default: 1)
   */
  static createPlatformWithPreset(
    scene: Phaser.Scene,
    platforms: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    texture: string,
    preset: keyof typeof PlatformUtils.PLATFORM_PRESETS,
    scaleX: number = 1,
    scaleY: number = 1
  ): Phaser.Physics.Arcade.Sprite {
    const config = this.PLATFORM_PRESETS[preset];
    return this.createPlatformWithPadding(
      scene,
      platforms,
      x,
      y,
      texture,
      scaleX,
      scaleY,
      config.paddingTop,
      config.paddingBottom,
      config.paddingLeft,
      config.paddingRight
    );
  }
} 