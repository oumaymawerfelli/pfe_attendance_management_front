import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RagAdminService, RagIngestionLog, RagStats } from '../services/rag-admin.service';

@Component({
  selector: 'app-rag-admin',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTableModule, MatTooltipModule, DatePipe
  ],
  template: `
    <div class="rag-page">

      <!-- HERO HEADER -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="hero-badge">RAG SYSTEM</div>
          <h1 class="hero-title">HR Chatbot</h1>
          <p class="hero-subtitle">
            Automatic synchronization of HR regulations from Google Drive
            <span class="hero-emoji">🤖</span>
          </p>
        </div>
        <div class="hero-right">
          <div class="hero-status">
            <div class="pulse-dot"></div>
            <div>
              <div class="hero-status-label">STATUS</div>
              <div class="hero-status-value">Operational</div>
            </div>
          </div>
        </div>
      </div>

      <!-- STATS GRID -->
      <div class="stats-grid">

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Updates</span>
            <div class="stat-icon-pill success">
              <mat-icon>check_circle</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ stats?.successCount || 0 }}</div>
          <div class="stat-delta up" *ngIf="stats?.successCount">
            <mat-icon>trending_up</mat-icon>
            successful
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">No changes</span>
            <div class="stat-icon-pill info">
              <mat-icon>sync</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ stats?.noChangeCount || 0 }}</div>
          <div class="stat-delta neutral">
            <mat-icon>schedule</mat-icon>
            checks
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Failures</span>
            <div class="stat-icon-pill" [class.danger]="(stats?.failedCount || 0) > 0" [class.muted]="!stats?.failedCount">
              <mat-icon>error_outline</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ stats?.failedCount || 0 }}</div>
          <div class="stat-delta" [class.down]="(stats?.failedCount || 0) > 0" [class.neutral]="!stats?.failedCount">
            <mat-icon>{{ (stats?.failedCount || 0) > 0 ? 'warning' : 'verified' }}</mat-icon>
            {{ (stats?.failedCount || 0) > 0 ? 'to investigate' : 'none' }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total ingestions</span>
            <div class="stat-icon-pill primary">
              <mat-icon>history</mat-icon>
            </div>
          </div>
          <div class="stat-value">{{ stats?.totalIngestions || 0 }}</div>
          <div class="stat-delta neutral">
            <mat-icon>storage</mat-icon>
            since start
          </div>
        </div>

      </div>

      <!-- LAST SYNC -->
      <div class="last-sync-section" *ngIf="lastLog">
        <div class="section-header">
          <div class="section-icon">
            <mat-icon>cloud_sync</mat-icon>
          </div>
          <div>
            <h2 class="section-title">Last synchronization</h2>
            <p class="section-subtitle">Current state of the RAG pipeline</p>
          </div>
        </div>

        <div class="sync-card">
          <div class="sync-info-grid">
            <div class="sync-info-item">
              <div class="sync-info-icon date"><mat-icon>schedule</mat-icon></div>
              <div>
                <div class="sync-info-label">Date</div>
                <div class="sync-info-value">{{ lastLog.ingestedAt | date:'dd MMM yyyy' }}</div>
                <div class="sync-info-sub">{{ lastLog.ingestedAt | date:'HH:mm:ss' }}</div>
              </div>
            </div>

            <div class="sync-info-item">
              <div class="sync-info-icon status" [class]="'status-' + lastLog.status.toLowerCase()">
                <mat-icon>{{ getStatusIcon(lastLog.status) }}</mat-icon>
              </div>
              <div>
                <div class="sync-info-label">Status</div>
                <div class="sync-info-value">{{ getStatusLabel(lastLog.status) }}</div>
                <div class="sync-info-sub">{{ lastLog.message }}</div>
              </div>
            </div>

            <div class="sync-info-item">
              <div class="sync-info-icon hash"><mat-icon>fingerprint</mat-icon></div>
              <div>
                <div class="sync-info-label">SHA-256 Hash</div>
                <div class="sync-info-value hash-value"
                     [matTooltip]="lastLog.fileHash"
                     (click)="copyHash(lastLog.fileHash)">
                  {{ lastLog.fileHash?.substring(0, 12) }}...
                </div>
                <div class="sync-info-sub">Click to copy</div>
              </div>
            </div>

            <div class="sync-info-item">
              <div class="sync-info-icon chunks"><mat-icon>view_module</mat-icon></div>
              <div>
                <div class="sync-info-label">Indexed chunks</div>
                <div class="sync-info-value">{{ lastLog.chunksCount || '—' }}</div>
                <div class="sync-info-sub">in ChromaDB</div>
              </div>
            </div>
          </div>

          <div class="sync-action">
            <button class="force-sync-btn"
                    (click)="forceSync()"
                    [disabled]="syncing">
              <mat-icon *ngIf="!syncing">refresh</mat-icon>
              <mat-progress-spinner *ngIf="syncing"
                                   mode="indeterminate"
                                   diameter="20"
                                   strokeWidth="2">
              </mat-progress-spinner>
              <span>{{ syncing ? 'Synchronizing...' : 'Force Sync Now' }}</span>
            </button>
            <div class="next-auto-sync">
              <mat-icon>access_time</mat-icon>
              Next automatic check in <strong>1h</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- HISTORY TABLE -->
      <div class="history-section">
        <div class="section-header">
          <div class="section-icon orange">
            <mat-icon>list_alt</mat-icon>
          </div>
          <div>
            <h2 class="section-title">Ingestion history</h2>
            <p class="section-subtitle">Complete pipeline audit trail</p>
          </div>
        </div>

        <div class="history-card">
          <table mat-table [dataSource]="logs" class="history-table">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let log">
                <div class="cell-date">
                  <strong>{{ log.ingestedAt | date:'dd/MM' }}</strong>
                  <span>{{ log.ingestedAt | date:'HH:mm' }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let log">
                <div class="status-pill" [class]="'pill-' + log.status.toLowerCase()">
                  <mat-icon>{{ getStatusIcon(log.status) }}</mat-icon>
                  {{ getStatusLabel(log.status) }}
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="hash">
              <th mat-header-cell *matHeaderCellDef>Hash</th>
              <td mat-cell *matCellDef="let log"
                  [matTooltip]="log.fileHash"
                  class="cell-hash">
                {{ log.fileHash?.substring(0, 14) }}…
              </td>
            </ng-container>

            <ng-container matColumnDef="chunks">
              <th mat-header-cell *matHeaderCellDef>Chunks</th>
              <td mat-cell *matCellDef="let log">
                <span *ngIf="log.chunksCount" class="chunk-badge">{{ log.chunksCount }}</span>
                <span *ngIf="!log.chunksCount" class="chunk-empty">—</span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --navy: #1B2845;
      --navy-light: #2C3E63;
      --orange: #F39C12;
      --orange-light: #FFC163;
      --bg: #F7F8FB;
      --card-bg: #FFFFFF;
      --text: #1B2845;
      --text-muted: #8B95A7;
      --text-light: #B4BCCB;
      --success: #10B981;
      --info: #3B82F6;
      --danger: #EF4444;
      --border: #EEF1F6;
      --shadow: 0 2px 8px rgba(27, 40, 69, 0.06);
      --shadow-hover: 0 4px 16px rgba(27, 40, 69, 0.10);
    }

    .rag-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: var(--bg);
      min-height: calc(100vh - 64px);
    }

    .hero-card {
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
      border-radius: 20px;
      padding: 32px 36px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    .hero-card::before {
      content: '';
      position: absolute;
      right: -60px;
      top: -60px;
      width: 240px;
      height: 240px;
      background: radial-gradient(circle, var(--orange) 0%, transparent 70%);
      opacity: 0.15;
    }
    .hero-badge {
      display: inline-block;
      background: rgba(243, 156, 18, 0.2);
      color: var(--orange-light);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      padding: 6px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .hero-title {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
    .hero-subtitle {
      font-size: 14px;
      color: rgba(255,255,255,0.75);
      margin: 0;
      max-width: 500px;
    }
    .hero-emoji { margin-left: 4px; }

    .hero-status {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255,255,255,0.08);
      padding: 14px 22px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
      z-index: 1;
    }
    .pulse-dot {
      width: 12px;
      height: 12px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .hero-status-label {
      font-size: 10px;
      letter-spacing: 1.2px;
      color: rgba(255,255,255,0.6);
      font-weight: 600;
    }
    .hero-status-value {
      font-size: 16px;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 22px;
      box-shadow: var(--shadow);
      transition: all 0.2s;
      border: 1px solid var(--border);
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
    }
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .stat-icon-pill {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stat-icon-pill mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .stat-icon-pill.success { background: #DCFCE7; color: var(--success); }
    .stat-icon-pill.info { background: #DBEAFE; color: var(--info); }
    .stat-icon-pill.danger { background: #FEE2E2; color: var(--danger); }
    .stat-icon-pill.muted { background: #F1F5F9; color: var(--text-light); }
    .stat-icon-pill.primary { background: #FEF3C7; color: var(--orange); }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
      margin-bottom: 10px;
    }
    .stat-delta {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .stat-delta mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .stat-delta.up { background: #DCFCE7; color: var(--success); }
    .stat-delta.down { background: #FEE2E2; color: var(--danger); }
    .stat-delta.neutral { background: #F1F5F9; color: var(--text-muted); }

    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .section-icon {
      width: 44px;
      height: 44px;
      background: var(--navy);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .section-icon.orange {
      background: var(--orange);
    }
    .section-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }
    .section-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin: 2px 0 0 0;
    }

    .last-sync-section { margin-bottom: 28px; }
    .sync-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 28px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .sync-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px dashed var(--border);
    }
    .sync-info-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .sync-info-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .sync-info-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .sync-info-icon.date { background: #FEF3C7; color: var(--orange); }
    .sync-info-icon.hash { background: #EDE9FE; color: #7C3AED; }
    .sync-info-icon.chunks { background: #DBEAFE; color: var(--info); }
    .sync-info-icon.status.status-success { background: #DCFCE7; color: var(--success); }
    .sync-info-icon.status.status-no_change { background: #DBEAFE; color: var(--info); }
    .sync-info-icon.status.status-failed { background: #FEE2E2; color: var(--danger); }

    .sync-info-label {
      font-size: 10px;
      letter-spacing: 1.2px;
      color: var(--text-light);
      font-weight: 700;
      margin-bottom: 4px;
    }
    .sync-info-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 2px;
    }
    .sync-info-value.hash-value {
      font-family: 'Courier New', monospace;
      cursor: pointer;
      font-size: 14px;
    }
    .sync-info-value.hash-value:hover {
      color: var(--orange);
    }
    .sync-info-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    .sync-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .force-sync-btn {
      background: linear-gradient(135deg, var(--orange) 0%, #E67E22 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
      transition: all 0.2s;
    }
    .force-sync-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(243, 156, 18, 0.4);
    }
    .force-sync-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .force-sync-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .next-auto-sync {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .next-auto-sync mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .history-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 8px 12px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .history-table {
      width: 100%;
      background: transparent !important;
    }
    .history-table th {
      font-size: 11px !important;
      letter-spacing: 1px !important;
      color: var(--text-muted) !important;
      font-weight: 700 !important;
      text-transform: uppercase;
      background: transparent !important;
      border-bottom: 1px solid var(--border) !important;
    }
    .history-table td {
      padding: 16px 12px !important;
      border-bottom: 1px solid var(--border) !important;
      color: var(--text);
    }
    .history-table tr:last-child td {
      border-bottom: none !important;
    }
    .history-table tr:hover td {
      background: rgba(243, 156, 18, 0.03);
    }
    .cell-date {
      display: flex;
      flex-direction: column;
    }
    .cell-date strong {
      font-size: 14px;
      font-weight: 600;
    }
    .cell-date span {
      font-size: 12px;
      color: var(--text-muted);
    }
    .cell-hash {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: var(--text-muted);
      cursor: help;
    }
    .chunk-badge {
      background: var(--navy);
      color: white;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .chunk-empty {
      color: var(--text-light);
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 5px 11px;
      border-radius: 8px;
    }
    .status-pill mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .pill-success { background: #DCFCE7; color: var(--success); }
    .pill-no_change { background: #DBEAFE; color: var(--info); }
    .pill-failed { background: #FEE2E2; color: var(--danger); }

    @media (max-width: 1100px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .sync-info-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 700px) {
      .stats-grid { grid-template-columns: 1fr; }
      .sync-info-grid { grid-template-columns: 1fr; }
      .hero-card { flex-direction: column; gap: 20px; align-items: flex-start; }
      .sync-action { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class RagAdminComponent implements OnInit {
  lastLog: RagIngestionLog | null = null;
  logs: RagIngestionLog[] = [];
  stats: RagStats | null = null;
  syncing = false;
  displayedColumns = ['date', 'status', 'hash', 'chunks'];

  constructor(
    private ragAdminService: RagAdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.ragAdminService.getLastLog().subscribe({
      next: (log: RagIngestionLog) => this.lastLog = log,
      error: () => this.lastLog = null
    });

    this.ragAdminService.getAllLogs(0, 50).subscribe({
      next: (logs: RagIngestionLog[]) => this.logs = logs
    });

    this.ragAdminService.getStats().subscribe({
      next: (stats: RagStats) => this.stats = stats
    });
  }

  forceSync(): void {
    this.syncing = true;
    this.ragAdminService.forceSync().subscribe({
      next: (res: any) => {
        this.syncing = false;
        const msg = res.log?.status === 'SUCCESS'
          ? `✅ Update successful — ${res.log.chunksCount} chunks indexed`
          : res.log?.status === 'NO_CHANGE'
          ? `ℹ️ No changes detected`
          : `⚠️ ${res.message}`;
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        this.loadAll();
      },
      error: (err: any) => {
        this.syncing = false;
        this.snackBar.open(`❌ Failed: ${err.message}`, 'OK', { duration: 5000 });
      }
    });
  }

  copyHash(hash: string): void {
    navigator.clipboard.writeText(hash);
    this.snackBar.open('Hash copied to clipboard', 'OK', { duration: 2000 });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'Success';
      case 'NO_CHANGE': return 'No change';
      case 'FAILED': return 'Failed';
      default: return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'check_circle';
      case 'NO_CHANGE': return 'sync_disabled';
      case 'FAILED': return 'error';
      default: return 'help';
    }
  }
}