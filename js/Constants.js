export const FPS           = 60,                                                   // 'update' frame rate fixed at 60fps independent of rendering loop
      WIDTH         = 720,                                                  // must have width multiple of 360...
      HEIGHT        = 540,                                                  // ... and 4:3 w:h ratio
      HORIZON       = HEIGHT/10,                                             // how much ground to show below the tower
      METER         = HEIGHT/20,                                            // how many pixels represent 1 meter
      COL_WIDTH     = METER * 3,                                            // 2D column width
      ROW_HEIGHT    = METER,                                                // 2D row height
      ROW_SURFACE   = ROW_HEIGHT * 0.3,                                     // amount of row considered 'near' enough to surface to allow jumping onto that row (instead of bouncing off again)
      PLAYER_WIDTH  = METER * 1.5,                                          // player logical width
      PLAYER_HEIGHT = METER * 2,                                            // player logical height
      GROUND_SPEED  = 2,                                                    // how fast ground scrolls left-right
      GRAVITY       = 9.8 * 4,                                              // (exagerated) gravity
      MAXDX         = 10,                                                   // player max horizontal speed (meters per second)
      MAXDY         = (ROW_SURFACE*FPS/METER),                              // player max vertical speed (meters per second) - ENSURES CANNOT FALL THROUGH PLATFORM SURFACE
      CLIMBDY       = 8,                                                    // player climbing speed (meters per second)
      ACCEL         = 1/4,                                                  // player take 1/4 second to reach maxdx (horizontal acceleration)
      FRICTION      = 1/8,                                                  // player take 1/8 second to stop from maxdx (horizontal friction)
      IMPULSE       = 15 * FPS,                                             // player jump impulse
      FALLING_JUMP  = FPS/5,                                                // player allowed to jump for 1/5 second after falling off a platform
      LADDER_EDGE   = 0.6,                                                  // how far from ladder center (60%) is ladder's true collision boundary, e.g. you fall off if you get more than 60% away from center of ladder
      COIN          = { W: ROW_HEIGHT, H: ROW_HEIGHT },                     // logical size of coin
      DIR           = { NONE: 0, LEFT: 1, RIGHT: 2, UP: 3, DOWN: 4 },       // useful enum for declaring an abstract direction
      STEP          = { FRAMES: 8, W: COL_WIDTH/10, H: ROW_HEIGHT },        // attributes of player stepping up
      KEY           = { SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 }, // input key codes
      IMAGES        = ['ground', 'ladder', 'player', 'monster', 'coins'],   // sprite image files for loading
      PSW           = 72,                                                   // player sprite width
      PSH           = 96,                                                   // player sprite height
      PLAYER        = { 
        DEBUG: false, // enable player debug rendering (bounding box and collision points)
        STAND: { x: 0,  y: 0, w: PSW, h: PSH, frames: 1,  fps: 30 },        // animation - player standing still
        BACK:  { x: 72, y: 0, w: PSW, h: PSH, frames: 1,  fps: 30 },        // animation - player standing still with back to camera (on ladder but not moving)
        RIGHT: { x: 144,    y: 0, w: PSW, h: PSH, frames: 4, fps: 30 },        // animation - player running right
        LEFT:  { x: 432, y: 0, w: PSW, h: PSH, frames: 4, fps: 30 },        // animation - player running left
        CLIMB: { x: 864, y: 0, w: PSW, h: PSH, frames: 4, fps: 20 },        // animation - player climbing ladder
        HURTL: { x: 792, y: 0, w: PSW, h: PSH, frames: 1,  fps: 10 },        // animation - player hurt while running left
        HURTR: { x: 720, y: 0, w: PSW, h: PSH, frames: 1,  fps: 10 }         // animation - player hurt while running right
      },
      MONSTERS = [
        { 
          name: "NAUKA", 
          nx: -0.5, ny: -0.5, 
          w: 1.5*METER, h: 1.5*METER, 
          speed: 4*METER, 
          dir: 'up', 
          vertical: true, horizontal: false, 
          animation: { 
            up:   { x: 0, y: 0, w: 50, h: 50, frames: 2, fps: 5 }, 
            down: { x: 0, y: 0, w: 50, h: 50, frames: 2, fps: 5 } 
          } 
        },
        { 
          name: "RANDO", 
          nx: -0.5, ny: -0.5, 
          w: 2.5*METER, h: 1.0*METER, 
          speed: 8*METER, 
          dir: 'left', 
          vertical: false, horizontal: true, 
          animation: { 
            left:   { x: 100, y: 7, w: 76, h: 36, frames: 2, fps: 5 }, 
            right:  { x: 252, y: 7, w: 76, h: 36, frames: 2, fps: 5 } 
          } 
        },
        { name: "OOKER", 
          nx: -0.5, ny: 0.0, 
          w: 1.5*METER, h: 1.0*METER, 
          speed: 4*METER, 
          dir: 'right', 
          vertical: false, horizontal: true, 
          animation: { 
            left:   { x: 404, y: 11, w: 50, h: 28, frames: 2, fps: 5 }, 
            right:  { x: 504, y: 11, w: 50, h: 28, frames: 2, fps: 5 } 
          } 
        },
        { 
          name: "KARIN", 
          nx: -0.5, ny: 0.0, 
          w: 1.5*METER, h: 1.0*METER, 
          speed: 2*METER, 
          dir: 'left', 
          vertical: false, horizontal: true, 
          animation: { 
            left:   { x: 604, y: 9, w: 58, h: 32, frames: 2, fps: 5 }, 
            right:  { x: 720, y: 9, w: 58, h: 32, frames: 2, fps: 5 } 
          } 
        }
      ];