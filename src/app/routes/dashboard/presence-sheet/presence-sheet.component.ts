// presence-sheet.component.ts
import {
  Component, OnInit, OnChanges, Input,
  SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

// ── Matches AttendanceResponseDTO ─────────────────────────
export interface AttendanceResponseDTO {
  id:              number | null;
  userId:          number;
  userFullName:    string;
  userJobTitle:    string;   // ← new field
  userPhone:       string;   // ← new field
  userEmail:       string;   // ← new field
  userDepartment:  string;
  date:            string;
  checkIn:         string | null;   // ISO LocalDateTime
  checkOut:        string | null;
  status:          'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
  workDuration:    number | null;
  overtimeHours:   number | null;
  notes:           string | null;
}

export type DisplayStatus = 'present' | 'late' | 'on_leave' | 'absent';

@Component({
  selector: 'app-presence-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule],
  templateUrl: './presence-sheet.component.html',
  styleUrls:   ['./presence-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresenceSheetComponent implements OnInit, OnChanges {

  @Input() department:   string      = 'ALL';
  @Input() specificDate: Date | null = null;

  records:         AttendanceResponseDTO[] = [];
  filteredRecords: AttendanceResponseDTO[] = [];
  searchQuery    = '';
  statusFilter   = 'ALL';
  deptFilter     = 'ALL';
  availableDepts: string[] = [];
  loading        = true;
  error          = false;
  today          = new Date();

  // Gradient pairs [from, to] — one per slot
  private gradients: [string, string][] = [
    ['#6366f1', '#8b5cf6'],  // indigo → violet
    ['#0891b2', '#06b6d4'],  // cyan shades
    ['#1a2e5a', '#2563eb'],  // navy → blue
    ['#d97706', '#f59e0b'],  // amber shades
    ['#059669', '#10b981'],  // emerald shades
    ['#dc2626', '#f87171'],  // red shades
    ['#7c3aed', '#a78bfa'],  // purple shades
    ['#0369a1', '#38bdf8'],  // sky shades
    ['#be185d', '#f472b6'],  // pink shades
    ['#0f766e', '#2dd4bf'],  // teal shades
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // ── Stats ──────────────────────────────────────────────
  get presentCount(): number  { return this.records.filter(r => r.status === 'PRESENT').length; }
  get lateCount():    number  { return this.records.filter(r => r.status === 'LATE').length; }
  get onLeaveCount(): number  { return this.records.filter(r => r.status === 'ON_LEAVE').length; }
  get absentCount():  number  { return this.records.filter(r => r.status === 'ABSENT').length; }

  // ── Lifecycle ──────────────────────────────────────────
  ngOnInit(): void { this.load(); }

  ngOnChanges(c: SimpleChanges): void {
    if (c['department'] || c['specificDate']) this.load();
  }

  // ── Filtering ──────────────────────────────────────────
  onSearch(): void { this.applyFilters(); this.cdr.markForCheck(); }

  onStatusFilter(s: string): void {
    this.statusFilter = s;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  onDeptFilter(d: string): void {
    this.deptFilter = d;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  private applyFilters(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredRecords = this.records.filter(r => {
      const matchSearch =
        !q ||
        r.userFullName.toLowerCase().includes(q) ||
        r.userJobTitle?.toLowerCase().includes(q) ||
        r.userDepartment?.toLowerCase().includes(q) ||
        r.userEmail?.toLowerCase().includes(q);
      const matchStatus =
        this.statusFilter === 'ALL' || r.status === this.statusFilter;
      const matchDept =
        this.deptFilter === 'ALL' || r.userDepartment === this.deptFilter;
      return matchSearch && matchStatus && matchDept;
    });
  }

  // ── Helpers ────────────────────────────────────────────
  avatarColor(idx: number): string {
    return this.gradients[idx % this.gradients.length][0];
  }

  avatarGrad(idx: number, stop: 0 | 1): string {
    return this.gradients[idx % this.gradients.length][stop];
  }

  initials(name: string): string {
    return (name || '')
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  displayStatus(s: string): DisplayStatus {
    const map: Record<string, DisplayStatus> = {
      PRESENT: 'present', LATE: 'late',
      ON_LEAVE: 'on_leave', ABSENT: 'absent',
      HALF_DAY: 'present',
    };
    return map[s] ?? 'absent';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      PRESENT: 'Present', LATE: 'Late',
      ON_LEAVE: 'On Leave', ABSENT: 'Absent', HALF_DAY: 'Half Day',
    };
    return map[s] ?? s;
  }

  formatCheckIn(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatLastUpdate(iso: string | null): string {
    if (!iso) return '—';
    const d    = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1)  return 'just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric',
                                           hour: '2-digit', minute: '2-digit' });
  }

  exportCsv(): void {
    const rows = [
      ['#','Name','Job Title','Phone','Email','Department','Status','Check In'],
      ...this.filteredRecords.map((r, i) => [
        i + 1,
        r.userFullName, r.userJobTitle ?? '',
        r.userPhone ?? '', r.userEmail ?? '',
        r.userDepartment,
        this.statusLabel(r.status),
        this.formatCheckIn(r.checkIn),
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'presence-sheet.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Data loading ───────────────────────────────────────
  private load(): void {
    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    let params = new HttpParams();

    if (this.specificDate) {
      const d = this.specificDate;
      params = params.set('date',
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }

    if (this.department && this.department !== 'ALL') {
      params = params.set('department', this.department);
    }

    // ← Uses the existing AttendanceController endpoint
    this.http.get<AttendanceResponseDTO[]>(
      `${environment.apiUrl}/attendance/presence-sheet`, { params }
    ).subscribe({
      next: data => {
        this.records         = data;
        this.filteredRecords = data;
        this.availableDepts  = [...new Set(data.map(r => r.userDepartment).filter(Boolean))].sort();
        this.loading         = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}