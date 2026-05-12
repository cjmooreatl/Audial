import { searchArtists } from './common/itunes';

export async function searchITunesArtists(input: {
  query: string;
  limit?: number;
}) {
  const artists = await searchArtists(input.query, input.limit ?? 8);
  return { artists };
}
