import apiClient from "./axiosInstance";

export const getMovieStream = async (id: number) => {
  const res = await apiClient.get(`/streams/movie/${id}`);
  return res.data as { url: string };
};

export const getTvStream = async (id: number, season: number, episode: number) => {
  const res = await apiClient.get(`/streams/tv/${id}/${season}/${episode}`);
  return res.data as { url: string };
};
