export interface DemotivationScore {
  userId: number;
  userFullName: string;
  score: number;           // 0.0 à 1.0
  level: 'FAIBLE' | 'MOYEN' | 'ÉLEVÉ';
  breakdown: {
    absence: number;
    retard: number;
    demiJournee: number;
    departAnticipe: number;
  };
}