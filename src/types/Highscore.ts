export type Highscore = {
    id: number;
    name: string;
    score: number;
    songs: {
        artist: string;
        song_title: string;
      };
  };
  