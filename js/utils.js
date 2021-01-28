export function normalizex(x) { return Game.Math.normalize(x,   0, tower.w);},  // wrap x-coord around to stay within tower boundary
  normalizeColumn(col)       { return Game.Math.normalize(col, 0, tower.cols);                    }  // wrap column  around to stay within tower boundary
  function x2col(x)                   { return Math.floor(normalizex(x)/Constants.COL_WIDTH);                        }  // convert x-coord to tower column index
  function y2row(y)                   { return Math.floor(y/Constants.ROW_HEIGHT);                                   }  // convert y-coord to tower row    index
  function col2x(col)                 { return col * Constants.COL_WIDTH;                                            }  // convert tower column index to x-coord
  function row2y(row)                 { return row * Constants.ROW_HEIGHT;                                           }  // convert tower row    index to y-coord
  function x2a(x)                     { return 360 * (normalizex(x)/tower.w);                              }  // convert x-coord to an angle around the tower
  function tx(x, r)                   { return r * Math.sin((normalizex(x-camera.rx)/tower.w) *2*Math.PI); }  // transform x-coord for rendering
  function ty(y)                      { return Constants.HEIGHT - Constants.HORIZON - (y - camera.ry);                         }  // transform y-coord for rendering
  function nearColCenter(x,col,limit) { return limit > Math.abs(x - col2x(col + 0.5))/(Constants.COL_WIDTH/2);       }  // is x-coord "near" the center  of a tower column
  function nearRowSurface(y,row)      { return y > (row2y(row+1) - Constants.ROW_SURFACE);                           }  // is y-coord "near" the surface of a tower row