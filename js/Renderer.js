// var Renderer = Class.create({
export default class Renderer {

    initialize(images) {
      this.images        = images;
      this.canvas        = Game.Canvas.init(Dom.get('canvas'), WIDTH, HEIGHT);
      this.ctx           = this.canvas.getContext('2d');
      this.stars         = this.createStars();
      this.gradient      = this.createGradient();
      this.ground        = this.createGround();
      this.debug         = Dom.get('debug');
      this.score         = Dom.get('score');
      this.vscore        = 0;
      this.platformWidth = 2 * tower.or * Math.tan((360/tower.cols) * Math.PI / 360);
    }

    //-------------------------------------------------------------------------

    render(dt) {

      player.rx = normalizex(Game.Math.lerp(player.x, player.dx, dt));
      player.ry =            Game.Math.lerp(player.y, player.dy, dt);
      camera.rx = normalizex(Game.Math.lerp(camera.x, camera.dx, dt));
      camera.ry =            Game.Math.lerp(camera.y, camera.dy, dt);

      player.ry = Math.max(0, player.ry); // dont let sub-frame interpolation take the player below the horizon
      camera.ry = Math.max(0, camera.ry); // dont let sub-frame interpolation take the camera below the horizon

      this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
      this.renderStars(this.ctx);
      this.ctx.save();
      this.ctx.translate(WIDTH/2, 0);
      this.renderBack(this.ctx);
      this.renderTower(this.ctx);
      this.renderFront(this.ctx);
      this.renderGround(this.ctx);
      this.renderPlayer(this.ctx);
      this.renderScore(this.ctx);
      this.ctx.restore();

      // Dom.set(debug, player.debug);

    }

    //-------------------------------------------------------------------------

    renderStars(ctx) {

      var x  = Game.Math.normalize(WIDTH  * camera.x/tower.w, 0, WIDTH),
          y  = Game.Math.normalize(HEIGHT * camera.y/tower.h, 0, HEIGHT),
          nx = WIDTH  - x,
          ny = HEIGHT - y;

        ctx.drawImage(this.stars, 0,   0,  nx, ny,   x, y, nx, ny);
      if (x > 0)
        ctx.drawImage(this.stars, nx,  0,   x, ny,   0, y,  x, ny);
      if (y > 0)
        ctx.drawImage(this.stars, 0,  ny,  nx,  y,   x, 0, nx,  y);
      if ((x > 0) && (y > 0))
        ctx.drawImage(this.stars, nx, ny,   x,  y,   0, 0,  x,  y);

    }

    //-------------------------------------------------------------------------

    renderGround(ctx) {
      var ground = this.ground,
          x      = ground.w * (camera.rx/tower.w),
          y      = ty(0),
          w      = Math.min(WIDTH, ground.w-x),
          w2     = WIDTH - w;
      ctx.drawImage(ground.image, x, 0, w, ground.h, -WIDTH/2, y, w, ground.h);
      if (w2 > 0)
        ctx.drawImage(ground.image, 0, 0, w2, ground.h, -WIDTH/2 + w, y, w2, ground.h);
    }

    //-------------------------------------------------------------------------

    renderTower(ctx) {

      var offsets = [0, 0.5],
          top     = Math.max(ty(tower.h), 0),
          bottom  = Math.min(ty(0),       HEIGHT);

      ctx.fillStyle = this.gradient;
      ctx.fillRect(-tower.ir, top, tower.ir * 2, bottom - top);
      ctx.strokeStyle = tower.color.stroke;
      ctx.lineWidth=1;

      ctx.beginPath();
      var n, y, offset = 0;
      for(n = 0 ; n < tower.rows ; n++) {
        y = ty(n*ROW_HEIGHT);
        if (Game.Math.between(y, -ROW_HEIGHT, HEIGHT + ROW_HEIGHT)) {
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
    }

    //-------------------------------------------------------------------------

    renderBricks(ctx, y, offset) {
      var n, x, a;
      for(n = 0 ; n < tower.cols ; n++) {
        x = (n+offset) * COL_WIDTH;
        a = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx));
        if (Game.Math.between(a, -90, 90)) {
          x = tx(x, tower.ir);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - ROW_HEIGHT);
        }
      }
    }

    //-------------------------------------------------------------------------

    renderBack(ctx) {

      ctx.strokeStyle = tower.color.stroke;
      ctx.lineWidth   = 2;

      var left  = x2col(camera.rx - tower.w/4),
          right = x2col(camera.rx + tower.w/4);

      this.renderQuadrant(ctx, normalizeColumn(left  - 3), left,  +1);
      this.renderQuadrant(ctx, normalizeColumn(right + 3), right, -1);

    }

    //-------------------------------------------------------------------------

    renderFront(ctx) {

      ctx.strokeStyle = tower.color.stroke;
      ctx.lineWidth   = 2;

      var left   = x2col(camera.rx - tower.w/4),
          center = x2col(camera.rx),
          right  = x2col(camera.rx + tower.w/4);

      this.renderQuadrant(ctx, left,  normalizeColumn(center + 0), +1);
      this.renderQuadrant(ctx, right, normalizeColumn(center - 1), -1);

    }

    //-------------------------------------------------------------------------

    renderQuadrant(ctx, min, max, dir) {
      var r, y, cell,
          rmin = Math.max(0,              y2row(camera.ry - HORIZON) - 1),
          rmax = Math.min(tower.rows - 1, rmin + (HEIGHT / ROW_HEIGHT + 1)),
          c    = min;
      while (c != max) {
        for(r = rmin ; r <= rmax ; r++) {
          y = ty(r * ROW_HEIGHT);
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
    }

    //-------------------------------------------------------------------------

    renderPlatform(ctx, col, y) {

      var x = col2x(col+0.5),
          a = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx)),
          x0 = tx(x, tower.or),
          x1 = x0 - this.platformWidth/2,
          x2 = x0 + this.platformWidth/2;

      ctx.fillStyle = Game.Math.darken(tower.color.platform, 60 * Math.min(1, Math.abs(a/90)));
      ctx.fillRect(  x1, y - ROW_HEIGHT, x2 - x1, ROW_HEIGHT);
      ctx.strokeRect(x1, y - ROW_HEIGHT, x2 - x1, ROW_HEIGHT);
   
    }

    //-------------------------------------------------------------------------

    renderLadder(ctx, col, y) {

      var ladder = this.images.ladder,
          x      = col2x(col+0.5),
          a      = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx)),
          d      = Math.floor(12 * Math.min(1, Math.abs(a/90))),
          x0     = tx(x, tower.or),
          x1     = x0 - ladder.width/2 + 10,
          x2     = x0 + ladder.width/2 - 10,
          w      = x2 - x1,
          ny     = 4, // overdraw the ladders
          h      = ROW_HEIGHT + ny;

      ctx.drawImage(ladder, 0, d*30, ladder.width, 30, x1, y-h, w, h);

    }

    //-------------------------------------------------------------------------

    renderCoin(ctx, col, y) {

      var coins = this.images.coins,
          x     = col2x(col+0.5),
          a     = Game.Math.normalizeAngle180(x2a(x) - x2a(camera.rx)),
          d     = Math.floor(12 * Math.min(1, Math.abs(a/90))),
          w     = COIN.W,
          h     = COIN.H,
          x0    = tx(x, tower.or),
          x1    = x0 - w/2,
          x2    = x0 + w/2;

      ctx.drawImage(coins, 0, d*36, coins.width, 36, x1, y-h, w, h);

    }

    //-------------------------------------------------------------------------

    renderMonster(ctx, col, y, monster) {

      var a = monster.animation,
          x = tx(monster.x, tower.or) + monster.nx,
          y = ty(monster.y)           + monster.ny,
          w = monster.w,
          h = monster.h;

      ctx.drawImage(this.images.monster, a.x + (monster.animationFrame*a.w), a.y, a.w, a.h, x, y - h - 1, w, h);

    }

    //-------------------------------------------------------------------------

    renderPlayer(ctx) {
      ctx.drawImage(this.images.player, player.animation.x + (player.animationFrame * player.animation.w), player.animation.y, player.animation.w, player.animation.h, tx(player.rx, tower.ir) - player.w/2, ty(player.ry) - player.h, player.w, player.h);
      if (PLAYER.DEBUG) {
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
    }

    //-------------------------------------------------------------------------

    renderScore(ctx) {
      if (player.score > this.vscore) {
        this.vscore = this.vscore + 2;
        Dom.set(score, this.vscore);
      }
    }

    //-------------------------------------------------------------------------

    createStars() {
      return Game.Canvas.render(WIDTH, HEIGHT, function(ctx) {
        var n, x, y, r, max = 500,
          colors = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#800000", "#808000"],
          sizes  = [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 2];
        for(n = 0 ; n < max ; n++) {
          ctx.fillStyle = Game.Math.darken(Game.Math.randomChoice(colors), Game.Math.random(1,100));
          x = Game.Math.randomInt(2, WIDTH-4);
          y = Game.Math.randomInt(2, HEIGHT-4);
          r = Game.Math.randomChoice(sizes);
          ctx.fillRect(x,y,r,r);
        } 
      });
    }

    //-------------------------------------------------------------------------

    createGradient() {

      var radius   = tower.ir,
          color    = tower.color.wall,
          gradient = this.ctx.createLinearGradient(-radius, 0, radius, 0);

      gradient.addColorStop(0,   Game.Math.darken(color, 20));
      gradient.addColorStop(0.3, Game.Math.brighten(color, 10));
      gradient.addColorStop(0.5, Game.Math.brighten(color, 15));
      gradient.addColorStop(0.7, Game.Math.brighten(color, 10));
      gradient.addColorStop(1,   Game.Math.darken(color, 20));

      return gradient;

    }

    //-------------------------------------------------------------------------

    createGround() {
      var w     = WIDTH*GROUND_SPEED,
          h     = HORIZON,
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

  }