/** * Tags that define the "soul" of the image.
 * These are kept static in the query (AND logic) to maintain context.
 */
const CORE_TAGS = [
  // Ratings (Philomena System)
  'safe',
  'suggestive',
  'questionable',
  'explicit',
  'semi-grimdark',
  'grimdark',
  'grotesque',

  // Media & Style Core
  'vector',
  'pixel art',
  '3d',
  'screencap',
  'fanart',
  'traditional art',
  'digital art',
  'photo',
  'sketch',
];

export default CORE_TAGS;
