import * as Constants from './Constants.js';

export default class Tower {

    //-------------------------------------------------------------------------

    initialize(level) {

      var row, col;

      level.map.reverse(); // make 0 index the ground, increasing towards the sky

      this.name     = level.name;
      this.color    = level.color;
      this.rows     = level.map.length;
      this.cols     = level.map[0].length;
      this.ir       = Constants.WIDTH/4;                 // inner radius (walls)
      this.or       = this.ir * 1.2;           // outer radius (walls plus platforms)
      this.w        = this.cols * Constants.COL_WIDTH;
      this.h        = this.rows * Constants.ROW_HEIGHT;
      this.map      = this.createMap(level.map);
      this.ground   = { platform: true  };
      this.air      = { platform: false };

    }

    //-------------------------------------------------------------------------

    getCell(row, col) {
      if (row < 0)
        return this.ground;
      else if (row >= this.rows)
        return this.air;
      else
        return this.map[row][normalizeColumn(col)];
    }

    //-------------------------------------------------------------------------

    createMap(source) {
      var row, col, cell, map = [];
      for(row = 0 ; row < this.rows ; row++) {
        map[row] = [];
        for(col = 0 ; col < this.cols ; col++) {
          cell = source[row][col];
          map[row][col] = {
            platform: (cell == 'X'),
            ladder:   (cell == 'H'),
            coin:     (cell == 'o')
          };
        }
      }
      return map;
    }

    normalizeColumn(col)       { return Game.Math.normalize(col, 0, tower.cols);}

  }