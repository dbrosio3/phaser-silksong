# Platform Collision Utilities

This utility helps create more accurate collision detection for platform sprites that have visual padding around the actual solid area.

## Problem

Many platform sprites have transparent padding or decorative elements that shouldn't be part of the collision detection. For example:
- `ground.png` has 5% padding on the top 
- `ground_2.png` has 20% padding all around

Without adjustment, players can appear to "float" above platforms or collide with invisible areas.

## Solution

The `PlatformUtils` class provides methods to create platforms with custom collision boundaries that compensate for sprite padding.

## Usage

### Method 1: Using Presets (Recommended)

```typescript
import { PlatformUtils } from '../utils/PlatformUtils';

// Create a ground platform with 5% padding removed from top
PlatformUtils.createPlatformWithPreset(this, this.platforms, 500, 1000, 'ground', 'GROUND', 1.5, 1);

// Create a ground2 platform with 20% padding removed all around  
PlatformUtils.createPlatformWithPreset(this, this.platforms, 800, 800, 'ground2', 'GROUND_2', 1, 1);
```

### Method 2: Custom Padding Values

```typescript
// Remove 10% from top and 5% from left/right
PlatformUtils.createPlatformWithPadding(
  this,           // scene
  this.platforms, // physics group
  400, 600,       // x, y position
  'my-texture',   // texture key
  1, 1,          // scaleX, scaleY
  0.10,          // paddingTop (10%)
  0,             // paddingBottom
  0.05,          // paddingLeft (5%)
  0.05           // paddingRight (5%)
);
```

## Available Presets

- `GROUND`: 5% padding removed from top (for ground.png)
- `GROUND_2`: 20% padding removed all around (for ground_2.png)  
- `DEFAULT`: No padding adjustments

## Adding New Presets

To add a new preset, edit the `PLATFORM_PRESETS` object in `PlatformUtils.ts`:

```typescript
MY_PLATFORM: {
  paddingTop: 0.15,
  paddingBottom: 0.05, 
  paddingLeft: 0.10,
  paddingRight: 0.10
}
```

## Parameters

- **paddingTop/Bottom/Left/Right**: Percentage (0-1) of the sprite dimension to remove from collision
- **scaleX/Y**: Visual scaling of the sprite (doesn't affect collision calculation)
- All padding values are applied to the collision body, not the visual sprite 