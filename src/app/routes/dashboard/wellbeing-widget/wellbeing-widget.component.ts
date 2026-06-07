// wellbeing-widget.component.ts
import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient }   from '@angular/common/http';
import { environment }  from '@env/environment';

interface MoodStatus {
  submitted:         boolean;
  score:             number | null;
  teamTotal:         number;
  totalEmployees:    number;
  participationRate: number;
}

@Component({
  selector: 'app-wellbeing-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './wellbeing-widget.component.html',
  styleUrls:   ['./wellbeing-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WellbeingWidgetComponent implements OnInit {

  status:  MoodStatus | null = null;
  loading  = true;
  saving   = false;
  hovered: number | null = null;
  selected: number | null = null;
  note     = '';

  readonly moods = [
    { score: 1, emoji: '😞', label: 'Very bad'  },
    { score: 2, emoji: '😕', label: 'Not great' },
    { score: 3, emoji: '😐', label: 'Okay'      },
    { score: 4, emoji: '🙂', label: 'Good'       },
    { score: 5, emoji: '😄', label: 'Great!'     },
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadStatus(); }

  loadStatus(): void {
    this.http.get<MoodStatus>(`${environment.apiUrl}/mood/status`).subscribe({
      next: s => {
        this.status  = s;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  get activeScore(): number | null {
    return this.hovered ?? this.selected;
  }

  get activeMood() {
    return this.moods.find(m => m.score === this.activeScore) ?? null;
  }

  submit(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();

    this.http.post<MoodStatus>(`${environment.apiUrl}/mood`, {
      score: this.selected,
      note:  this.note.trim() || null,
    }).subscribe({
      next: s => {
        this.status = s;
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: () => { this.saving = false; this.cdr.markForCheck(); },
    });
  }

  get submittedMood() {
    return this.moods.find(m => m.score === this.status?.score) ?? null;
  }

  get participationLabel(): string {
    const r = this.status?.participationRate ?? 0;
    return `${r}% of the team checked in today`;
  }

  moodColor(score: number): string {
    const colors = ['#ef4444','#f97316','#f59e0b','#22c55e','#10b981'];
    return colors[score - 1];
  }
}