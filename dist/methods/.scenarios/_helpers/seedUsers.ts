// The cast of curators that populate the platform. Each has a distinct
// handle, accent (drawn from the brand-safe palette), and notes. The first
// curator (`moss.fm`) is the test user — set up so dev signin lands here.

import { SEED_COVERS } from '../../src/common/seedCovers';

export interface SeedUser {
  handle: string;
  email: string; // dev bypass for moss.fm
  displayName: string;
  notes: string;
  accentColor: string;
  isTestUser?: boolean;
  // Sets they've compiled. Each has a title, the seed cover slot, and a slice
  // of the global track pool (offset, count).
  sets: { title: string; description: string; cover: keyof typeof SEED_COVERS; offset: number; count: number }[];
  // Co-sign artist queries (looked up at seed time)
  coSignQueries: string[];
}

export const SEED_USERS: SeedUser[] = [
  {
    handle: 'moss.fm',
    email: 'remy@mindstudio.ai',
    displayName: 'Moss FM',
    notes: 'Late-night dub, ambient miniatures, percussion edits. Berlin / NY.',
    accentColor: '#7A1F1F', // oxblood
    isTestUser: true,
    sets: [
      { title: 'Concrete Hours', description: 'Late-night dub plates and ambient miniatures. Compiled across three Berlin nights in March.', cover: 'crowd', offset: 0, count: 12 },
      { title: 'Saturday 4AM', description: 'Where the floor opens up and stays open.', cover: 'laser', offset: 6, count: 14 },
      { title: 'Whispers', description: 'Vocal-led, soft-focus, headphone hours.', cover: 'silhouette', offset: 12, count: 10 },
    ],
    coSignQueries: ['fka twigs', 'four tet', 'burial', 'jamie xx'],
  },
  {
    handle: 'kestrel',
    email: 'kestrel@audial.test',
    displayName: 'Kestrel',
    notes: 'Architecture, dub, low-end research.',
    accentColor: '#1E3A8A', // cobalt
    sets: [
      { title: 'Dub Architecture', description: 'Sub-bass and concrete. Field recordings from below ground level.', cover: 'brutalist', offset: 4, count: 11 },
      { title: 'Civic', description: 'Library music for empty buildings.', cover: 'brutalist', offset: 14, count: 9 },
    ],
    coSignQueries: ['mount kimbie', 'objekt', 'caribou'],
  },
  {
    handle: 'lowlit',
    email: 'lowlit@audial.test',
    displayName: 'Low Lit',
    notes: 'Cinematic. Dimly. Considered.',
    accentColor: '#3F1F5C', // blackcurrant
    sets: [
      { title: 'Last Train Home', description: 'Songs for the silent ride.', cover: 'silhouette', offset: 18, count: 13 },
      { title: 'Static', description: 'Ambient drones and tape-warped pop.', cover: 'riso', offset: 22, count: 10 },
    ],
    coSignQueries: ['nicolas jaar', 'oneohtrix point never', 'aphex twin'],
  },
  {
    handle: 'static.bureau',
    email: 'static@audial.test',
    displayName: 'Static Bureau',
    notes: 'Field recordings, broken transmissions, library cuts.',
    accentColor: '#0F6B4F', // jade
    sets: [
      { title: 'Warmer Months', description: 'Open windows, cassettes, summer crossings.', cover: 'riso', offset: 8, count: 12 },
    ],
    coSignQueries: ['arca', 'tirzah', 'dean blunt'],
  },
  {
    handle: 'concrete.hours',
    email: 'ch@audial.test',
    displayName: 'Concrete Hours',
    notes: 'For when the city sounds like it is asleep but you know it is not.',
    accentColor: '#A8480F', // rust
    sets: [
      { title: 'Basement Years', description: 'Tracks from rooms with no windows. Recompiled annually.', cover: 'crowd', offset: 2, count: 16 },
      { title: 'Strobe', description: 'Peak-time dispatches. Compiled at 4AM, edited at noon.', cover: 'laser', offset: 16, count: 12 },
    ],
    coSignQueries: ['bicep', 'jon hopkins', 'flying lotus'],
  },
  {
    handle: 'ash.delta',
    email: 'ash@audial.test',
    displayName: 'Ash Delta',
    notes: 'Voices over machines.',
    accentColor: '#9C2641', // amaranth
    sets: [
      { title: 'Crate Diggers Vol.4', description: 'B-sides, edits, and rare presses from the long shelf.', cover: 'vinyl', offset: 24, count: 15 },
    ],
    coSignQueries: ['kelela', 'sevdaliza', 'frank ocean'],
  },
  {
    handle: 'iris.broadcast',
    email: 'iris@audial.test',
    displayName: 'Iris Broadcast',
    notes: 'Folk traditions filtered through bad weather.',
    accentColor: '#6E4DCF', // iris
    sets: [
      { title: 'Back Catalogue', description: 'Discoveries pulled from the archive shelves.', cover: 'vinyl', offset: 26, count: 12 },
    ],
    coSignQueries: ['big thief', 'phoebe bridgers', 'mitski'],
  },
  {
    handle: 'umber.club',
    email: 'umber@audial.test',
    displayName: 'Umber Club',
    notes: 'Slow club, half-time, no rush.',
    accentColor: '#915C2D', // umber
    sets: [
      { title: 'Cracked Basements', description: 'Heavy weather, late hours, low ceilings.', cover: 'crowd', offset: 10, count: 11 },
    ],
    coSignQueries: ['james blake', 'mount kimbie', 'jamie xx'],
  },
  {
    handle: 'pine.shift',
    email: 'pine@audial.test',
    displayName: 'Pine Shift',
    notes: 'Ambient. Long form. Open.',
    accentColor: '#1F3A36', // pine
    sets: [
      { title: 'Long Drives', description: 'Highway sequencing for the empty hours.', cover: 'silhouette', offset: 20, count: 14 },
    ],
    coSignQueries: ['caribou', 'beach house', 'destroyer'],
  },
  {
    handle: 'sulfur',
    email: 'sulfur@audial.test',
    displayName: 'Sulfur',
    notes: 'Loud. Yellow. Worth your time.',
    accentColor: '#C29B0C', // sulfur
    sets: [
      { title: 'Heavy Yellow', description: 'High-saturation cuts for noisy headphones.', cover: 'riso', offset: 28, count: 10 },
    ],
    coSignQueries: ['yves tumor', 'fiona apple', 'angel olsen'],
  },
];
