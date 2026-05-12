import { searchTracks } from './common/itunes';

export async function searchITunesTracks(input: {
  query: string;
  limit?: number;
}) {
  const tracks = await searchTracks(input.query, input.limit ?? 20);
  return { tracks };
}
