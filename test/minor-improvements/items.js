/**
 * @typedef {{ longName: string, shortName: string }} ListItem
 */

/**
 * @type {readonly ListItem[]}
 */
const LEVELS = Object.freeze([
  { shortName: "BOB", longName: "Bob-omb Battlefield" },
  { shortName: "WF", longName: "Whomp's Fortress" },
  { shortName: "JRB", longName: "Jolly Roger Bay" },
  { shortName: "CCM", longName: "Cool, Cool Mountain" },
  { shortName: "BBH", longName: "Big Boo's Haunt" },
  { shortName: "HMC", longName: "Hazy Maze Cave" },
  { shortName: "LLL", longName: "Lethal Lava Land" },
  { shortName: "SSL", longName: "Shifting Sand Land" },
  { shortName: "DDD", longName: "Dire, Dire Docks" },
  { shortName: "SL", longName: "Snowman's Land" },
  { shortName: "WDW", longName: "Wet-Dry World" },
  { shortName: "TTM", longName: "Tall, Tall Mountain" },
  { shortName: "THI", longName: "Tiny, Huge Island" },
  { shortName: "TTC", longName: "Tick Tock Clock" },
  { shortName: "RR", longName: "Rainbow Ride" },
  { shortName: "BitDW", longName: "Bowser in the Dark World" },
  { shortName: "BitFS", longName: "Bowser in the Fire Sea" },
  { shortName: "BitS", longName: "Bowser in the Sky" },
  { shortName: "Slide", longName: "Slide" },
  { shortName: "Aqua", longName: "Aquarium" },
  { shortName: "WMotR", longName: "Over Rainbow" },
  { shortName: "WC", longName: "Wing cap" },
  { shortName: "VC", longName: "Vanish cap" },
  { shortName: "MC", longName: "Metal cap" },
]);

/**
 * @type {readonly ListItem[]}
 */
const OTHERS = Object.freeze([
  { shortName: "Toad 1", longName: "Toad 1" },
  { shortName: "Toad 2", longName: "Toad 2" },
  { shortName: "Toad 3", longName: "Toad 3" },
  { shortName: "Mips 1", longName: "Mips 1" },
  { shortName: "Mips 2", longName: "Mips 2" },
]);


/**
 * @type {readonly Record<string, readonly ListItem[]>}
 */
const REPLACEMENTS = {
  "THI": [
    { shortName: "THIB", longName: "Tiny, Huge Island, BIG" },
    { shortName: "THIS", longName: "Tiny, Huge Island, small" },
  ]
}
