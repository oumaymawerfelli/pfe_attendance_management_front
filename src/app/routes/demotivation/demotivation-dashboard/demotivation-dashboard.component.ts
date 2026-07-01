import { Component, OnInit } from '@angular/core';
import { DemotivationService } from '../services/demotivation.service';
import { DemotivationScore } from '../models/demotivation.model';

@Component({
  selector: 'app-demotivation-dashboard',
  templateUrl: './demotivation-dashboard.component.html',
  styleUrls: ['./demotivation-dashboard.component.scss'],
})
export class DemotivationDashboardComponent implements OnInit {
  // Données
  originalScores: DemotivationScore[] = [];
  scores: DemotivationScore[] = [];
  loading = false;
  error = '';

  // Filtres et tris
  filterActive = false;
  sortAscending = false; // false = plus risqué en premier

  // Démo : on calcule sur mai 2026
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
      next: data => {
        this.originalScores = data;
        this.scores = [...data];
        this.updateCounts(data);
        this.loading = false;
      },
      error: err => {
        this.error = 'Erreur lors du chargement des scores.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  // Met à jour les compteurs des cartes
  updateCounts(data: DemotivationScore[]): void {
    this.countEleve = data.filter(s => s.level === 'ÉLEVÉ').length;
    this.countMoyen = data.filter(s => s.level === 'MOYEN').length;
    this.countFaible = data.filter(s => s.level === 'FAIBLE').length;
  }

  // 🔄 Réinitialiser tous les filtres
  resetFilters(): void {
    this.filterActive = false;
    this.sortAscending = false;
    this.scores = [...this.originalScores];
    this.updateCounts(this.scores);
  }

  // 📊 Trier par probabilité IA (du plus risqué au moins risqué)
  sortByMlProba(): void {
    // Alterner l'ordre à chaque clic
    this.sortAscending = !this.sortAscending;
    
    this.scores.sort((a, b) => {
      const probaA = a.mlProba ?? -1; // null = -1 (en dernier)
      const probaB = b.mlProba ?? -1;
      
      if (this.sortAscending) {
        return probaA - probaB; // du plus faible au plus fort
      } else {
        return probaB - probaA; // du plus fort au plus faible
      }
    });
  }

  // 🔍 Filtrer par risque IA (uniquement les employés prédits à risque)
  toggleFilterByMlRisk(): void {
    this.filterActive = !this.filterActive;
    
    if (this.filterActive) {
      this.scores = this.originalScores.filter(s => s.mlArisque === true);
    } else {
      this.scores = [...this.originalScores];
    }
    
    // Réappliquer le tri si actif
    if (this.sortAscending !== undefined) {
      // Conserver l'ordre de tri actuel
    }
  }

  // Classe CSS du badge selon le niveau
  levelClass(level: string): string {
    if (level === 'ÉLEVÉ') return 'badge-eleve';
    if (level === 'MOYEN') return 'badge-moyen';
    return 'badge-faible';
  }

  // Score affiché en pourcentage
  asPercent(score: number): number {
    return Math.round(score * 100);
  }
  monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

get monthName(): string {
  return this.monthNames[this.month - 1];
}

previousMonth(): void {
  if (this.month === 1) {
    this.month = 12;
    this.year--;
  } else {
    this.month--;
  }
  this.loadScores();
}

nextMonth(): void {
  if (this.month === 12) {
    this.month = 1;
    this.year++;
  } else {
    this.month++;
  }
  this.loadScores();
}
}