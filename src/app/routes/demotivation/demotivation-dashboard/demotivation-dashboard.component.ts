import { Component, OnInit } from '@angular/core';
import { DemotivationService } from '../services/demotivation.service';
import { DemotivationScore } from '../models/demotivation.model';

@Component({
  selector: 'app-demotivation-dashboard',
  templateUrl: './demotivation-dashboard.component.html',
  styleUrls: ['./demotivation-dashboard.component.scss']
})
export class DemotivationDashboardComponent implements OnInit {

  scores: DemotivationScore[] = [];
  loading = false;
  error = '';

  // Démo : on calcule sur mai 2026 (mois complet avec données)
  month = 5;
  year = 2026;

  // Compteurs pour les cartes de résumé
  countEleve = 0;
  countMoyen = 0;
  countFaible = 0;

  constructor(private demotivationService: DemotivationService) {}

  ngOnInit(): void {
    this.loadScores();
  }

  loadScores(): void {
    this.loading = true;
    this.error = '';
    this.demotivationService.getAllScores(this.month, this.year).subscribe({
      next: (data) => {
        this.scores = data;
        this.countEleve  = data.filter(s => s.level === 'ÉLEVÉ').length;
        this.countMoyen  = data.filter(s => s.level === 'MOYEN').length;
        this.countFaible = data.filter(s => s.level === 'FAIBLE').length;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des scores.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  // Classe CSS du badge selon le niveau
  levelClass(level: string): string {
    switch (level) {
      case 'ÉLEVÉ': return 'badge-eleve';
      case 'MOYEN': return 'badge-moyen';
      default:      return 'badge-faible';
    }
  }

  // Score affiché en pourcentage
  asPercent(score: number): number {
    return Math.round(score * 100);
  }
}