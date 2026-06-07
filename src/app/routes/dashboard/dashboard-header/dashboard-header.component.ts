import {
  Component, OnInit, Input, Output,
  EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/authentication';

@Component({
  selector: 'app-dashboard-header',
  templateUrl: './dashboard-header.component.html',
  styleUrls: ['./dashboard-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHeaderComponent implements OnInit {

  @Output() periodChange     = new EventEmitter<string>();
  @Output() departmentChange = new EventEmitter<string>();
  @Output() dateChange       = new EventEmitter<Date | null>();

  currentUser: any       = null;
  period                 = 'day';
  selectedDepartment     = 'ALL';
  selectedDate: Date | null = null;
  today                  = new Date();

  @Input() deptLabels: string[] = [];

  constructor(
    private auth: AuthService,
    private cdr:  ChangeDetectorRef,
    private router: Router,
  ) {}

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.auth.user().subscribe((user: any) => {
      this.currentUser = user;
      console.log('USER ROLES:', user?.roles);
      this.cdr.markForCheck();
    });
  }

  onPeriodChange(value: string): void {
    this.period       = value;
    this.selectedDate = null;
    this.periodChange.emit(value);
    this.cdr.markForCheck();
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment = value;
    this.departmentChange.emit(value);
    this.cdr.markForCheck();
  }

  onDateChange(date: Date | null): void {
    this.selectedDate = date;
    this.dateChange.emit(date);
    this.cdr.markForCheck();
  }

  clearDate(): void {
    this.selectedDate = null;
    this.dateChange.emit(null);
    this.cdr.markForCheck();
  }

  goToPresenceSheet(): void {
    // Adjust the route path to match your routes-routing.module.ts
    this.router.navigate(['/dashboard/presence-sheet']);
  }
get isEmployee(): boolean {
  return this.auth.hasRole('EMPLOYEE') &&
        !this.auth.hasAnyRole(['ADMIN', 'MANAGER', 'GM']);
}
}