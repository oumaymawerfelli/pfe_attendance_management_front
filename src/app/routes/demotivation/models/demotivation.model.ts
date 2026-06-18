export interface DemotivationScore {
  userId: number;
  userFullName: string;
  score: number;
  level: 'FAIBLE' | 'MOYEN' | 'ÉLEVÉ';
  breakdown: {
    absence: number;
    retard: number;
    demiJournee: number;
    departAnticipe: number;
  };
  mlArisque: boolean | null;
  mlProba: number | null;
  verdictHybride: boolean | null;
}
