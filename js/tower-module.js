import * as Constants from './Constants.js';
import Tower from './Tower.js';


(function() { // private module pattern

  'use strict'

  //===========================================================================
  // VARIABLES
  //===========================================================================

  var tower,
      monsters,
      camera,
      player,
      renderer;

  //===========================================================================
  // UTILITY METHODS
  //===========================================================================

  function normalizex(x)              { return Game.Math.normalize(x,   0, tower.w);                       }  // wrap x-coord around to stay within tower boundary
  function normalizeColumn(col)       { return Game.Math.normalize(col, 0, tower.cols);                    }  // wrap column  around to stay within tower boundary
  function x2col(x)                   { return Math.floor(normalizex(x)/Constants.COL_WIDTH);                        }  // convert x-coord to tower column index
  function y2row(y)                   { return Math.floor(y/Constants.ROW_HEIGHT);                                   }  // convert y-coord to tower row    index
  function col2x(col)                 { return col * Constants.COL_WIDTH;                                            }  // convert tower column index to x-coord
  function row2y(row)                 { return row * Constants.ROW_HEIGHT;                                           }  // convert tower row    index to y-coord
  function x2a(x)                     { return 360 * (normalizex(x)/tower.w);                              }  // convert x-coord to an angle around the tower
  function tx(x, r)                   { return r * Math.sin((normalizex(x-camera.rx)/tower.w) *2*Math.PI); }  // transform x-coord for rendering
  function ty(y)                      { return Constants.HEIGHT - Constants.HORIZON - (y - camera.ry);                         }  // transform y-coord for rendering
  function nearColCenter(x,col,limit) { return limit > Math.abs(x - col2x(col + 0.5))/(Constants.COL_WIDTH/2);       }  // is x-coord "near" the center  of a tower column
  function nearRowSurface(y,row)      { return y > (row2y(row+1) - Constants.ROW_SURFACE);                           }  // is y-coord "near" the surface of a tower row

  //===========================================================================
  // GAME - SETUP/UPDATE/RENDER
  //===========================================================================

  function run() {
    Game.Load.images(Constants.IMAGES, function(images) {
      Game.Load.json("levels/demo", function(level) {
        setup(images, level);
        Game.run({
          fps:    Constants.FPS,
          update: update,
          render: render
        });
        Dom.on(document, 'keydown', function(ev) { return onkey(ev, ev.keyCode, true);  }, false);
        Dom.on(document, 'keyup',   function(ev) { return onkey(ev, ev.keyCode, false); }, false);
      });
    });
  }

  function setup(images, level) {
    tower    = new Tower(level);
    tower.initialize(level);
    monsters = new Monsters(level);
    player   = new Player();
    camera   = new Camera();
    renderer = new Renderer(images, tower);
  }

  function update(dt) {
    player.update(dt);
    monsters.update(dt);
    camera.update(dt);
  }

  function render(dt) {
    renderer.render(dt);
  }

  function onkey(ev, key, pressed) {
    switch(key) {
      case Constants.KEY.LEFT:  player.input.left  = pressed; ev.preventDefault(); return false;
      case Constants.KEY.RIGHT: player.input.right = pressed; ev.preventDefault(); return false;
      case Constants.KEY.UP:    player.input.up    = pressed; ev.preventDefault(); return false;
      case Constants.KEY.DOWN:  player.input.down  = pressed; ev.preventDefault(); return false;

      case Constants.KEY.SPACE:
        player.input.jump          = pressed && player.input.jumpAvailable;
        player.input.jumpAvailable = !pressed;
        break;
    }
  }








  //===========================================================================
  // PLAYER
  //===========================================================================

  var Player = Class.create({

    initialize: function() {

      this.x         = col2x(0.5);
      this.y         = row2y(0);
      this.w         = Constants.PLAYER_WIDTH;
      this.h         = Constants.PLAYER_HEIGHT;
      this.dx        = 0;
      this.dy        = 0;
      this.gravity   = Constants.METER * Constants.GRAVITY;
      this.maxdx     = Constants.METER * Constants.MAXDX;
      this.maxdy     = Constants.METER * Constants.MAXDY;
      this.climbdy   = Constants.METER * Constants.CLIMBDY;
      this.impulse   = Constants.METER * Constants.IMPULSE;
      this.accel     = this.maxdx / Constants.ACCEL;
      this.friction  = this.maxdx / Constants.FRICTION;
      this.input     = { left: false, right: false, up: false, down: false, jump: false, jumpAvailable: true };
      this.collision = this.createCollisionPoints();
      this.animation = Constants.PLAYER.STAND;
      this.score     = 0;

    },

    createCollisionPoints: function() {
      return {
        topLeft:     { x: -this.w/4, y: this.h-2 },
        topRight:    { x:  this.w/4, y: this.h-2 },
        middleLeft:  { x: -this.w/2, y: this.h/2 },
        middleRight: { x:  this.w/2, y: this.h/2 },
        bottomLeft:  { x: -this.w/4, y:  0       },
        bottomRight: { x:  this.w/4, y:  0       },
        underLeft:   { x: -this.w/4, y: -1       },
        underRight:  { x:  this.w/4, y: -1       },
        ladderUp:    { x:         0, y: this.h/2 },
        ladderDown:  { x:         0, y: -1       }
      }
    },

    update: function(dt) {

      this.animate();

      var wasleft  = this.dx  < 0,
          wasright = this.dx  > 0,
          falling  = this.falling,
          friction = this.friction * (this.falling                  ? 0.5 : 1),
          accel    = this.accel    * (this.falling || this.climbing ? 0.5 : 1);

      if (this.stepping)
        return this.stepUp();
      else if (this.hurting)
        return this.hurt(dt);

      this.ddx = 0;
      this.ddy = falling ? -this.gravity : 0;
    
      if (this.climbing) {
        this.ddy = 0;
        if (this.input.up)
          this.dy =  this.climbdy;
        else if (this.input.down)
          this.dy = -this.climbdy;
        else
          this.dy = 0;
      }

      if (this.input.left)
        this.ddx = this.ddx - accel;
      else if (wasleft)
        this.ddx = this.ddx + friction;

      if (this.input.right)
        this.ddx = this.ddx + accel;
      else if (wasright)
        this.ddx = this.ddx - friction;
    
      if (this.input.jump && (!falling || this.fallingJump))
        this.performJump();

      this.updatePosition(dt);
    
      while (this.checkCollision()) {
        // iterate until no more collisions
      }

      // clamp dx at zero to prevent friction from making us jiggle side to side
      if ((wasleft  && (this.dx > 0)) ||
          (wasright && (this.dx < 0))) {
        this.dx = 0;
      }

      // if falling, track short period of time during which we're falling but can still jump
      if (this.falling && (this.fallingJump > 0))
        this.fallingJump = this.fallingJump - 1;

      // debug information
      this.debug = Math.floor(this.x) + ", " + Math.floor(this.y) + ", " + Math.floor(this.dx) + ", " + Math.floor(this.dy) + (this.falling ? " FALLING " : "");

    },

    updatePosition: function(dt) {
      this.x  = normalizex(this.x  + (dt * this.dx));
      this.y  =            this.y  + (dt * this.dy);
      this.dx = Game.Math.bound(this.dx + (dt * this.ddx), -this.maxdx, this.maxdx);
      this.dy = Game.Math.bound(this.dy + (dt * this.ddy), -this.maxdy, this.maxdy);
    },

    hurt: function(dt) {
      if (this.hurting === true) {
        this.dx  = -this.dx/2;
        this.ddx = 0;
        this.ddy = this.impulse/2;
        this.hurting = Constants.FPS;
        this.hurtLeft = this.input.left;
      }
      else {
        this.ddy = -this.gravity;
        this.hurting = this.hurting - 1;
      }
      this.updatePosition(dt);
      if (this.y <= 0) {
        this.hurting = false;
        this.falling = false;
        this.y  = 0;
        this.dy = 0;
      }
    },

    animate: function() {
      if (this.hurting)
        Game.animate(Constants.FPS, this, this.hurtLeft ? Constants.PLAYER.HURTL : Constants.PLAYER.HURTR);
      else if (this.climbing && (this.input.up || this.input.down || this.input.left || this.input.right))
        Game.animate(Constants.FPS, this, Constants.PLAYER.CLIMB);
      else if (this.climbing)
        Game.animate(Constants.FPS, this, Constants.PLAYER.BACK);
      else if (this.input.left  || (this.stepping == Constants.DIR.LEFT))
        Game.animate(Constants.FPS, this, Constants.PLAYER.LEFT);
      else if (this.input.right || (this.stepping == Constants.DIR.RIGHT))
        Game.animate(Constants.FPS, this, Constants.PLAYER.RIGHT);
      else
        Game.animate(Constants.FPS, this, Constants.PLAYER.STAND);
    },

    checkCollision: function() {

      var falling      = this.falling,
          fallingUp    = this.falling && (this.dy >  0),
          fallingDown  = this.falling && (this.dy <= 0),
          climbing     = this.climbing,
          climbingUp   = this.climbing && this.input.up,
          climbingDown = this.climbing && this.input.down,
          runningLeft  = this.dx < 0,
          runningRight = this.dx > 0,
          tl           = this.collision.topLeft,
          tr           = this.collision.topRight,
          ml           = this.collision.middleLeft,
          mr           = this.collision.middleRight,
          bl           = this.collision.bottomLeft,
          br           = this.collision.bottomRight,
          ul           = this.collision.underLeft,
          ur           = this.collision.underRight,
          ld           = this.collision.ladderDown,
          lu           = this.collision.ladderUp;
      
      this.updateCollisionPoint(tl);
      this.updateCollisionPoint(tr);
      this.updateCollisionPoint(ml);
      this.updateCollisionPoint(mr);
      this.updateCollisionPoint(bl);
      this.updateCollisionPoint(br);
      this.updateCollisionPoint(ul);
      this.updateCollisionPoint(ur);
      this.updateCollisionPoint(ld);
      this.updateCollisionPoint(lu);

      if      (tl.coin) return this.collectCoin(tl);
      else if (tr.coin) return this.collectCoin(tr);
      else if (ml.coin) return this.collectCoin(ml);
      else if (mr.coin) return this.collectCoin(mr);
      else if (bl.coin) return this.collectCoin(bl);
      else if (br.coin) return this.collectCoin(br);

      if (fallingDown && bl.blocked && !ml.blocked && !tl.blocked && nearRowSurface(this.y + bl.y, bl.row))
        return this.collideDown(bl);

      if (fallingDown && br.blocked && !mr.blocked && !tr.blocked && nearRowSurface(this.y + br.y, br.row))
        return this.collideDown(br);

      if (fallingDown && ld.ladder && !lu.ladder)
        return this.collideDown(ld);

      if (fallingUp && tl.blocked && !ml.blocked && !bl.blocked)
        return this.collideUp(tl);

      if (fallingUp && tr.blocked && !mr.blocked && !br.blocked)
        return this.collideUp(tr);

      if (climbingDown && ld.blocked)
        return this.stopClimbing(ld);

      if (runningRight && tr.blocked && !tl.blocked)
        return this.collide(tr);

      if (runningRight && mr.blocked && !ml.blocked)
        return this.collide(mr);

      if (runningRight && br.blocked && !bl.blocked) {
        if (falling)
          return this.collide(br);
        else
          return this.startSteppingUp(DIR.RIGHT);
      }

      if (runningLeft && tl.blocked && !tr.blocked)
        return this.collide(tl, true);

      if (runningLeft && ml.blocked && !mr.blocked)
        return this.collide(ml, true);

      if (runningLeft && bl.blocked && !br.blocked) {
        if (falling)
          return this.collide(bl, true);
        else
          return this.startSteppingUp(DIR.LEFT);
      }

      var onLadder = (lu.ladder || ld.ladder) && nearColCenter(this.x, lu.col, LADDER_EDGE);

      // check to see if we are now falling or climbing
      if (!climbing && onLadder && ((lu.ladder && this.input.up) || (ld.ladder && this.input.down)))
        return this.startClimbing();
      else if (!climbing && !falling && !ul.blocked && !ur.blocked && !onLadder)
        return this.startFalling(true);

      // check to see if we have fallen off a ladder
      if (climbing && !onLadder)
        return this.stopClimbing();

      if (!this.hurting && (tl.monster || tr.monster || ml.monster || mr.monster || bl.monster || br.monster || lu.monster || ld.monster))
        return this.hitMonster();

      return false; // done, we didn't collide with anything

    },

    updateCollisionPoint: function(point) {
      point.row  = y2row(this.y + point.y);
      point.col  = x2col(this.x + point.x);
      point.cell = tower.getCell(point.row, point.col);
      point.blocked  = point.cell.platform;
      point.platform = point.cell.platform;
      point.ladder   = point.cell.ladder;
      point.monster  = false;
      point.coin     = false;
      if (point.cell.monster) {
        var monster = point.cell.monster;
        if (Game.Math.between(this.x + point.x, monster.x + monster.nx, monster.x + monster.nx + monster.w) &&
            Game.Math.between(this.y + point.y, monster.y + monster.ny, monster.y + monster.ny + monster.h)) {
          point.monster  = point.cell.monster;
        }
      }
      if (point.cell.coin) {
        if (Game.Math.between(this.x + point.x, col2x(point.col+0.5) - Constants.COIN.W/2, col2x(point.col+0.5) + Constants.COIN.W/2) &&  // center point of column +/- COIN.W/2
            Game.Math.between(this.y + point.y, row2y(point.row), row2y(point.row+1))) {
          point.coin = true;
        }
      }
    },

    collectCoin: function(point) {
      point.cell.coin = false;
      this.score = this.score + 50;
    },

    startFalling: function(allowFallingJump) {
      this.falling     = true;
      this.fallingJump = allowFallingJump ? Constants.FALLING_JUMP : 0;
    },

    collide: function(point, left) {
      this.x  = normalizex(col2x(point.col + (left ? 1 : 0)) - point.x);
      this.dx = 0;
      return true;
    },

    collideUp: function(point) {
      this.y  = row2y(point.row) - point.y;
      this.dy = 0;
      return true;
    },

    collideDown: function(point) {
      this.y       = row2y(point.row + 1);
      this.dy      = 0;
      this.falling = false;
      return true;
    },

    performJump: function() {
      if (this.climbing)
        this.stopClimbing();
      this.dy  = 0;
      this.ddy = this.impulse; // an instant big force impulse
      this.startFalling(false);
      this.input.jump = false;
    },

    startSteppingUp: function(dir) {
      this.stepping  = dir;
      this.stepCount = Constants.STEP.FRAMES;
      return false; // NOT considered a collision
    },

    stepUp: function() {

      var left = (this.stepping == Constants.DIR.LEFT),
          dx   = Constants.STEP.W / Constants.STEP.FRAMES,
          dy   = Constants.STEP.H / Constants.STEP.FRAMES;

      this.dx  = 0;
      this.dy  = 0;
      this.x   = normalizex(this.x + (left ? -dx : dx));
      this.y   =            this.y +               dy;

      if (--(this.stepCount) == 0)
        this.stepping = Constants.DIR.NONE;
    },

    startClimbing: function() {
      this.climbing = true;
      this.dx = 0;
    },

    stopClimbing: function(point) {
      this.climbing = false;
      this.dy = 0;
      this.y  = point ? row2y(point.row + 1) : this.y;
      return true;
    },

    hitMonster: function() {
      this.score = this.score - 10;
      Dom.set(score, this.score);
      this.hurting = true;
      return true;
    }

  });










  //===========================================================================
  // MONSTERS
  //===========================================================================

  var Monsters = Class.create({

    initialize: function(level) {
      this.all = this.createMonsters(level.map);
    },

    //-------------------------------------------------------------------------

    update: function(dt) {
      var n, max, all = this.all;
      for(n = 0, max = all.length ; n < max ; n++)
        all[n].update(dt);
    },

    //-------------------------------------------------------------------------

    createMonsters: function(source) {
      var row, col, type, monster, all = [];
      for(row = 0 ; row < tower.rows ; row++) {
        for(col = 0 ; col < tower.cols ; col++) {
          type = parseInt(source[row][col], 10);
          if (!isNaN(type)) {
            monster = new Monster(row, col, Constants.MONSTERS[type]);
            all.push(monster);
            tower.map[row][col].monster = monster;
          }
        }
      }
      return all;
    }

  });

  //===========================================================================
  // MONSTER
  //===========================================================================

  var Monster = Class.create({

    initialize: function(row, col, type) {

      this.row  = row;
      this.col  = col;
      this.x    = col2x(col+0.5);
      this.y    = row2y(row)
      this.dx   = 0;
      this.dy   = 0;
      this.w    = type.w;
      this.h    = type.h;
      this.nx   = type.nx * type.w;
      this.ny   = type.ny * type.h;
      this.type = type;
      this[type.dir] = true;
      this.animation = type.animation[type.dir];

      if (type.vertical) {
        this.minrow = row;
        this.maxrow = row;
        while ((this.minrow > 0) && !tower.map[this.minrow-1][col].platform && !tower.map[this.minrow-1][col].ladder)
          this.minrow--;
        while ((this.maxrow < tower.rows-1) && !tower.map[this.maxrow+1][col].platform && !tower.map[this.maxrow+1][col].ladder)
          this.maxrow++;
        this.miny = row2y(this.minrow)     + this.ny;
        this.maxy = row2y(this.maxrow + 1) + this.ny - this.h;
      }

      if (type.horizontal) {
        this.mincol = col;
        this.maxcol = col;
        while ((this.mincol != normalizeColumn(col+1)) && !tower.getCell(row, this.mincol-1).platform && !tower.getCell(row, this.mincol-1).ladder && tower.getCell(row-1, this.mincol-1).platform)
          this.mincol = normalizeColumn(this.mincol - 1);
        while ((this.maxcol != normalizeColumn(col-1)) && !tower.getCell(row, this.maxcol+1).platform && !tower.getCell(row, this.maxcol+1).ladder && tower.getCell(row-1, this.maxcol+1).platform)
          this.maxcol = normalizeColumn(this.maxcol + 1);
        this.minx  = col2x(this.mincol)     - this.nx;
        this.maxx  = col2x(this.maxcol + 1) - this.nx - this.w;
        this.wrapx = this.minx > this.maxx;
      }

    },

    //-------------------------------------------------------------------------

    update: function(dt) {

      if (this.left)
        this.dx = -this.type.speed;
      else if (this.right)
        this.dx =  this.type.speed;
      else
        this.dx = 0;

      if (this.up)
        this.dy = this.type.speed;
      else if (this.down)
        this.dy = -this.type.speed;
      else
        this.dy = 0;

      this.x  = normalizex(this.x  + (dt * this.dx));
      this.y  =            this.y  + (dt * this.dy);

      if (this.up && (this.y > this.maxy)) {
        this.y    = this.maxy;
        this.up   = false;
        this.down = true;
        this.animation = this.type.animation.down;
      }
      else if (this.down && (this.y < this.miny)) {
        this.y    = this.miny;
        this.down = false;
        this.up   = true;
        this.animation = this.type.animation.up;
      }

      if (this.left && (this.x < this.minx) && (!this.wrapx || this.x > this.maxx)) {
        this.x = this.minx;
        this.left = false;
        this.right = true;
        this.animation = this.type.animation.right;
      }
      else if (this.right && (this.x > this.maxx) && (!this.wrapx || this.x < this.minx)) {
        this.x = this.maxx;
        this.right = false;
        this.left = true;
        this.animation = this.type.animation.left;
      }

      var row = y2row(this.y - this.ny),
          col = x2col(this.x - this.nx);

      if ((row != this.row) || (col != this.col)) {
        tower.map[this.row][this.col].monster = null;
        tower.map[row][col].monster = this;
        this.row = row;
        this.col = col;
      }

      Game.animate(Constants.FPS, this);
    }

  });












  //===========================================================================
  // CAMERA
  //===========================================================================

  var Camera = Class.create({

    initialize: function() {
      this.x    = player.x;
      this.y    = player.y;
      this.dx   = 0;
      this.dy   = 0;
      this.miny = 0;
      this.maxy = tower.h;
    },

    update: function(dt) {
      this.x  = player.x;
      this.y  = player.y;
      this.dx = player.dx;
      this.dy = player.dy;
    }

  });











  //===========================================================================
  // RENDERER
  //===========================================================================

  var Renderer = Class.create({

    initialize: function(images) {
      this.images        = images;
      this.canvas        = Game.Canvas.init(Dom.get('canvas'), Constants.WIDTH, Constants.HEIGHT);
      this.ctx           = this.canvas.getContext('2d');
      this.stars         = this.createStars();
      this.gradient      = this.createGradient();
      this.ground        = this.createGround();
      this.debug         = Dom.get('debug');
      this.score         = Dom.get('score');
      this.vscore        = 0;
      this.platformWidth = 2 * tower.or * Math.tan((360/tower.cols) * Math.PI / 360);
    },

    //-------------------------------------------------------------------------

    render: function(dt) {

      player.rx = normalizex(Game.Math.lerp(player.x, player.dx, dt));
      player.ry =            Game.Math.lerp(player.y, player.dy, dt);
      camera.rx = normalizex(Game.Math.lerp(camera.x, camera.dx, dt));
      camera.ry =            Game.Math.lerp(camera.y, camera.dy, dt);

      player.ry = Math.max(0, player.ry); // dont let sub-frame interpolation take the player below the horizon
      camera.ry = Math.max(0, camera.ry); // dont let sub-frame interpolation take the camera below the horizon

      this.ctx.clearRect(0, 0, Constants.WIDTH, Constants.HEIGHT);
      this.renderStars(this.ctx);
      this.ctx.save();
      this.ctx.translate(Constants.WIDTH/2, 0);
      this.renderBack(this.ctx);
      this.renderTower(this.ctx);
      this.renderFront(this.ctx);
      this.renderGround(this.ctx);
      this.renderPlayer(this.ctx);
      this.renderScore(this.ctx);
      this.ctx.restore();

      // Dom.set(debug, player.debug);

    },

    //-------------------------------------------------------------------------

    renderStars: function(ctx) {

      var x  = Game.Math.normalize(Constants.WIDTH  * camera.x/tower.w, 0, Constants.WIDTH),
          y  = Game.Math.normalize(Constants.HEIGHT * camera.y/tower.h, 0, Constants.HEIGHT),
          nx = Constants.WIDTH  - x,
          ny = Constants.HEIGHT - y;

        ctx.drawImage(this.stars, 0,   0,  nx, ny,   x, y, nx, ny);
      if (x > 0)
        ctx.drawImage(this.stars, nx,  0,   x, ny,   0, y,  x, ny);
      if (y > 0)
        ctx.drawImage(this.stars, 0,  ny,  nx,  y,   x, 0, nx,  y);
      if ((x > 0) && (y > 0))
        ctx.drawImage(this.stars, nx, ny,   x,  y,   0, 0,  x,  y);

    },

    //-------------------------------------------------------------------------

    renderGround: function(ctx) {
      var ground = this.ground,
          x      = ground.w * (camera.rx/tower.w),
          y      = ty(0),
          w      = Math.min(Constants.WIDTH, ground.w-x),
          w2     = Constants.WIDTH - w;
      ctx.drawImage(ground.image, x, 0, w, ground.h, -Constants.WIDTH/2, y, w, ground.h);
      if (w2 > 0)
        ctx.drawImage(ground.image, 0, 0, w2, ground.h, -Constants.WIDTH/2 + w, y, w2, ground.h);
    },

    //-------------------------------------------------------------------------

    renderTower: function(ctx) {

      var offsets = [0, 0.5],
          top     = Math.max(ty(tower.h), 0),
          bottom  = Math.min(ty(0),       Constants.HEIGHT);

      ctx.fillStyle = this.gradient;
      ctx.fillRect(-tower.ir, top, tower.ir * 2, bottom - top);
      ctx.strokeStyle = tower.color.stroke;
      ctx.lineWidth=1;

      ctx.beginPath();
      var n, y, offset = 0;
      for(n = 0 ; n < tower.rows ; n++) {
        y = ty(n*Constants.ROW_HEIGHT);
        if (Game.Math.between(y, -Constants.ROW_HEIGHT, Constants.HEIGHT + Constants.ROW_HEIGHT)) {
          ctx.moveTo(-tower.ir, y);
          ctx.lineTo( tower.ir, y);
          this.renderBricks(ctx, y, offsets[offset]);
        } 
        offset = (offset < offsets.length-1 ? offset + 1 : 0);
      }

      ctx.moveTo(-tower.ir, top);
      ctx.lineTo( tower.ir, top);
      ctx.moveTo(-tower.ir, top);
      ctx.lineTo(-tower.ir, bottom);
      ctx.moveTo( tower.ir, top);
      ctx.lineTo( tower.ir, bottom);

      ctx.stroke();
    },

    //-------------------------------------------------------------------------

    renderBricks: function(ctx, y, offset) {
      var n, x, a;
      for(n = 0 ; n < tower.cols ; n++) {
        x = (n+offset) * Constants.COL_WIDTH;
        a = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx));
        if (Game.Math.between(a, -90, 90)) {
          x = tx(x, tower.ir);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - Constants.ROW_HEIGHT);
        }
      }
    },

    //-------------------------------------------------------------------------

    renderBack: function(ctx) {

      ctx.strokeStyle = tower.color.stroke;
      ctx.lineWidth   = 2;

      var left  = x2col(camera.rx - tower.w/4),
          right = x2col(camera.rx + tower.w/4);

      this.renderQuadrant(ctx, normalizeColumn(left  - 3), left,  +1);
      this.renderQuadrant(ctx, normalizeColumn(right + 3), right, -1);

    },

    //-------------------------------------------------------------------------

    renderFront: function(ctx) {

      ctx.strokeStyle = tower.color.stroke;
      ctx.lineWidth   = 2;

      var left   = x2col(camera.rx - tower.w/4),
          center = x2col(camera.rx),
          right  = x2col(camera.rx + tower.w/4);

      this.renderQuadrant(ctx, left,  normalizeColumn(center + 0), +1);
      this.renderQuadrant(ctx, right, normalizeColumn(center - 1), -1);

    },

    //-------------------------------------------------------------------------

    renderQuadrant: function(ctx, min, max, dir) {
      var r, y, cell,
          rmin = Math.max(0,              y2row(camera.ry - Constants.HORIZON) - 1),
          rmax = Math.min(tower.rows - 1, rmin + (Constants.HEIGHT / Constants.ROW_HEIGHT + 1)),
          c    = min;
      while (c != max) {
        for(r = rmin ; r <= rmax ; r++) {
          y = ty(r * Constants.ROW_HEIGHT);
          cell = tower.getCell(r, c);
          if (cell.platform)
            this.renderPlatform(ctx, c, y);
          else if (cell.ladder)
            this.renderLadder(ctx, c, y);
          else if (cell.coin)
            this.renderCoin(ctx, c, y);
          if (cell.monster)
            this.renderMonster(ctx, c, y, cell.monster);
        }
        c = normalizeColumn(c + dir);
      }
    },

    //-------------------------------------------------------------------------

    renderPlatform: function(ctx, col, y) {

      var x = col2x(col+0.5),
          a = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx)),
          x0 = tx(x, tower.or),
          x1 = x0 - this.platformWidth/2,
          x2 = x0 + this.platformWidth/2;

      ctx.fillStyle = Game.Math.darken(tower.color.platform, 60 * Math.min(1, Math.abs(a/90)));
      ctx.fillRect(  x1, y - Constants.ROW_HEIGHT, x2 - x1, Constants.ROW_HEIGHT);
      ctx.strokeRect(x1, y - Constants.ROW_HEIGHT, x2 - x1, Constants.ROW_HEIGHT);
   
    },

    //-------------------------------------------------------------------------

    renderLadder: function(ctx, col, y) {

      var ladder = this.images.ladder,
          x      = col2x(col+0.5),
          a      = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx)),
          d      = Math.floor(12 * Math.min(1, Math.abs(a/90))),
          x0     = tx(x, tower.or),
          x1     = x0 - ladder.width/2 + 10,
          x2     = x0 + ladder.width/2 - 10,
          w      = x2 - x1,
          ny     = 4, // overdraw the ladders
          h      = Constants.ROW_HEIGHT + ny;

      ctx.drawImage(ladder, 0, d*30, ladder.width, 30, x1, y-h, w, h);

    },

    //-------------------------------------------------------------------------

    renderCoin: function(ctx, col, y) {

      var coins = this.images.coins,
          x     = col2x(col+0.5),
          a     = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx)),
          d     = Math.floor(12 * Math.min(1, Math.abs(a/90))),
          w     = Constants.COIN.W,
          h     = Constants.COIN.H,
          x0    = tx(x, tower.or),
          x1    = x0 - w/2,
          x2    = x0 + w/2;

      ctx.drawImage(coins, 0, d*36, coins.width, 36, x1, y-h, w, h);

    },

    //-------------------------------------------------------------------------

    renderMonster: function(ctx, col, y, monster) {

      var a = monster.animation,
          x = tx(monster.x, tower.or) + monster.nx,
          y = ty(monster.y)           + monster.ny,
          w = monster.w,
          h = monster.h;

      ctx.drawImage(this.images.monster, a.x + (monster.animationFrame*a.w), a.y, a.w, a.h, x, y - h - 1, w, h);

    },

    //-------------------------------------------------------------------------

    renderPlayer: function(ctx) {
      ctx.drawImage(this.images.player, player.animation.x + (player.animationFrame * player.animation.w), player.animation.y, player.animation.w, player.animation.h, tx(player.rx, tower.ir) - player.w/2, ty(player.ry) - player.h, player.w, player.h);
      if (Constants.PLAYER.DEBUG) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth   = 1;
        ctx.strokeRect(tx(player.rx, tower.ir) - player.w/2, ty(player.ry + player.h), player.w, player.h);
        ctx.fillStyle = "#800000";
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.topLeft.x,          ty(player.ry + player.collision.topLeft.y),      5,  5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.topRight.x,         ty(player.ry + player.collision.topRight.y),    -5,  5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.middleLeft.x,       ty(player.ry + player.collision.middleLeft.y),   5,  5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.middleRight.x,      ty(player.ry + player.collision.middleRight.y), -5,  5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.bottomLeft.x,       ty(player.ry + player.collision.bottomLeft.y),   5, -5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.bottomRight.x,      ty(player.ry + player.collision.bottomRight.y), -5, -5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.ladderUp.x - 2.5,   ty(player.ry + player.collision.ladderUp.y),     5,  5);
        ctx.fillRect(tx(player.rx, tower.ir) + player.collision.ladderDown.x - 2.5, ty(player.ry + player.collision.ladderDown.y),   5, -5);
      }
    },

    //-------------------------------------------------------------------------

    renderScore: function(ctx) {
      if (player.score > this.vscore) {
        this.vscore = this.vscore + 2;
        Dom.set(score, this.vscore);
      }
    },

    //-------------------------------------------------------------------------

    createStars: function() {
      return Game.Canvas.render(Constants.WIDTH, Constants.HEIGHT, function(ctx) {
        var n, x, y, r, max = 500,
          colors = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#800000", "#808000"],
          sizes  = [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 2];
        for(n = 0 ; n < max ; n++) {
          ctx.fillStyle = Game.Math.darken(Game.Math.randomChoice(colors), Game.Math.random(1,100));
          x = Game.Math.randomInt(2, Constants.WIDTH-4);
          y = Game.Math.randomInt(2, Constants.HEIGHT-4);
          r = Game.Math.randomChoice(sizes);
          ctx.fillRect(x,y,r,r);
        } 
      });
    },

    //-------------------------------------------------------------------------

    createGradient: function(tower) {

      var radius   = this.tower.ir,
          color    = this.tower.color.wall,
          gradient = this.ctx.createLinearGradient(-radius, 0, radius, 0);

      gradient.addColorStop(0,   Game.Math.darken(color, 20));
      gradient.addColorStop(0.3, Game.Math.brighten(color, 10));
      gradient.addColorStop(0.5, Game.Math.brighten(color, 15));
      gradient.addColorStop(0.7, Game.Math.brighten(color, 10));
      gradient.addColorStop(1,   Game.Math.darken(color, 20));

      return gradient;

    },

    //-------------------------------------------------------------------------

    createGround: function() {
      var w     = Constants.WIDTH*Constants.GROUND_SPEED,
          h     = Constants.HORIZON,
          tile  = this.images.ground,
          tw    = tile.width,
          th    = tile.height,
          max   = Math.floor(w/tile.width),
          dw    = w/max,
          image = Game.Canvas.render(w, h, function(ctx) {
            var n;
            for(n = 0 ; n < max ; n++)
              ctx.drawImage(tile, 0, 0, tw, th, n * dw, 0, dw, h);
          });
      return { w: w, h: h, image: image };
    }

  });








  //===========================================================================
  // LETS PLAY!
  //===========================================================================

  run();

  //---------------------------------------------------------------------------

})();
