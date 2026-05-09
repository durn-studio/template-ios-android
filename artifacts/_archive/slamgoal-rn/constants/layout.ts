// Layout constants shared across screens.
//
// Upper bound on the centred content column. We want the game to feel
// native on phones AND to scale up on iPad — not sit inside a tiny
// phone-shaped window with ambient margin. 900 dp fills iPad Mini (744),
// iPad Air / Pro 11" (~820) and leaves a modest letterbox on iPad
// Pro 12.9" (1024) which still reads as a deliberate column.
// Phones (≤ 430 dp) are unaffected — Math.min pins content to SW.
export const MAX_CONTENT_WIDTH = 900;
