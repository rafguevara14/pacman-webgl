Play the game here: https://rafnguevara.itch.io/pacman?secret=mdXRTNfuqDjbEQKATeOsfap20

For getting started, I read through this resource. The general idea of drawing 
multiple things by putting shape objects into arrays and creating them like this
`shapes.forEach(createShape)` was inspired by this
https://webglfundamentals.org/webgl/lessons/webgl-drawing-multiple-things.html

## Balancing:

### Score
- Lowered the points per pellet to 50
- Upped the points lost on ghost hit to -1000

These were to account for how fast pacman can move and get the outer pellets first leading 
a high score at the beginning of a game


### AI 
When determining AI movement, the distance between pacman and the ghost is calculated for each component.
Two metrics were added to the ghost AI based on this result.

### Direct Movement
This means moving on the axis of the largest component difference
eg component difference (0.1, 0.5) the AI will choose to move along the Y axis

### Correct Direction
Once the axis is determined, the correct direction will decide whether the AI will move 
towards or away from pacman.

Each ghost has a probability of moving directly towards pacman and a probability of moving
in the correct direction. The red ghost is more aggressive while the blue ghost is more aimless

## Additional features:
- On a ghost hit, the game pauses for a brief moment before the ghost position is reset to emphasize impact
- When pacman consumes the special pellet, pacman shines between red green and blue by implementing
a simple timer that updates the color uniforms in pacman's vertex shader
- When the score increases, the score briefly turns green; if it decreases it briefly turns red
- The special pellet is placed randomly within the maze at the start of every game

