/** A width and height in pixels. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** One frame of a sheet: its number and where it sits, in pixels. */
export interface GridFrame {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The frames of a sheet cut into `frame`-sized cells, numbered row by row from the top left, the
 * way Phaser numbers a sprite sheet. A recoloured sheet (a canvas texture) gets the same numbers,
 * so code reads its frames as if it had been loaded as a sprite sheet. A strip left over at the
 * right or bottom edge, too small for a whole cell, has no frame.
 */
export function sheetGrid(image: Size, frame: Size): GridFrame[] {
  const cols = Math.floor(image.width / frame.width);
  const rows = Math.floor(image.height / frame.height);
  const frames: GridFrame[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      frames.push({
        index: row * cols + col,
        x: col * frame.width,
        y: row * frame.height,
        width: frame.width,
        height: frame.height,
      });
    }
  }
  return frames;
}
