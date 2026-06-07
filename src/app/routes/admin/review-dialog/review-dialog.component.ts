// review-dialog.component.ts — complete replacement

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA }      from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl }      from '@angular/platform-browser';
import { DocumentService } from '../services/document.service';
import { LeaveDocument }   from '../models/leave-document.model';

export interface ReviewDialogData { document: LeaveDocument; }

@Component({
  selector: 'app-review-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>rate_review</mat-icon>
      Review Document
    </h2>

    <mat-dialog-content>

      <!-- ── Document info ── -->
      <div class="doc-meta">
        <div class="meta-row">
          <mat-icon>person</mat-icon>
          <span>{{ data.document.userFullName }}</span>
        </div>
        <div class="meta-row">
          <mat-icon>description</mat-icon>
          <span>{{ data.document.fileName }}</span>
          <span class="muted">({{ formatSize(data.document.fileSize) }})</span>
        </div>
        <div class="meta-row">
          <mat-icon>label</mat-icon>
          <span>{{ typeLabel(data.document.documentType) }}</span>
        </div>
      </div>

      <!-- ── View document button ── -->
      <div class="preview-actions">
        <button mat-stroked-button (click)="openInTab()" [disabled]="loadingPreview">
          <mat-icon>open_in_new</mat-icon>
          {{ loadingPreview ? 'Loading…' : 'View document in new tab' }}
        </button>

        <!-- Inline PDF preview (shown after clicking view) -->
        <div *ngIf="previewUrl" class="pdf-preview">
          <iframe [src]="previewUrl"
                  width="100%"
                  height="400px"
                  style="border: 1px solid #e0e0e0; border-radius: 4px;">
          </iframe>
        </div>
      </div>

      <mat-divider style="margin: 16px 0"></mat-divider>

      <!-- ── Review form ── -->
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Decision</mat-label>
          <mat-select formControlName="status">
            <mat-option value="APPROVED">
              <mat-icon color="primary">check_circle</mat-icon> Approve
            </mat-option>
            <mat-option value="REJECTED">
              <mat-icon color="warn">cancel</mat-icon> Reject
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes {{ form.value.status === 'REJECTED' ? '(required)' : '(optional)' }}</mat-label>
          <textarea matInput formControlName="adminNotes" rows="3"
                    placeholder="Add a note…"></textarea>
          <mat-error *ngIf="form.get('adminNotes')?.hasError('required')">
            A reason is required when rejecting.
          </mat-error>
        </mat-form-field>
      </form>

      <div class="error-msg" *ngIf="error">{{ error }}</div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button
              [color]="form.value.status === 'APPROVED' ? 'primary' : 'warn'"
              [disabled]="form.invalid || saving"
              (click)="submit()">
        <mat-icon>{{ form.value.status === 'APPROVED' ? 'check_circle' : 'cancel' }}</mat-icon>
        {{ saving ? 'Saving…' : (form.value.status === 'APPROVED' ? 'Approve' : 'Reject') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 mat-icon    { vertical-align: middle; margin-right: 8px; }
    .doc-meta      { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .meta-row      { display: flex; align-items: center; gap: 8px; }
    .meta-row mat-icon { font-size: 18px; color: rgba(0,0,0,.54); }
    .muted         { color: rgba(0,0,0,.54); font-size: 12px; }
    .preview-actions { margin-bottom: 8px; }
    .pdf-preview   { margin-top: 12px; }
    .full-width    { width: 100%; }
    .error-msg     { color: red; font-size: 13px; margin-top: 8px; }
    mat-dialog-content { min-width: 500px; }
  `],
})
export class ReviewDialogComponent {

  form: FormGroup;
  saving        = false;
  loadingPreview = false;
  previewUrl:   SafeResourceUrl | null = null;
  private rawBlobUrl: string | null = null;
  error = '';

  constructor(
    private fb:              FormBuilder,
    private documentService: DocumentService,
    private sanitizer:       DomSanitizer,
    private dialogRef:       MatDialogRef<ReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReviewDialogData,
  ) {
    this.form = this.fb.group({
      status:     ['APPROVED', Validators.required],
      adminNotes: [''],
    });

    this.form.get('status')!.valueChanges.subscribe(status => {
      const notes = this.form.get('adminNotes')!;
      status === 'REJECTED'
        ? notes.setValidators(Validators.required)
        : notes.clearValidators();
      notes.updateValueAndValidity();
    });
  }

  // ── Preview ─────────────────────────────────────────────
  openInTab(): void {
    this.loadingPreview = true;
    this.documentService.download(this.data.document.id).subscribe({
      next: response => {
        const blob = response.body!;
        this.rawBlobUrl = URL.createObjectURL(blob);

        // Open in new tab immediately
        window.open(this.rawBlobUrl, '_blank');

        // Also show inline preview
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawBlobUrl);
        this.loadingPreview = false;
      },
      error: () => {
        this.loadingPreview = false;
        this.error = 'Could not load document.';
      },
    });
  }

  // ── Submit ───────────────────────────────────────────────
  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error  = '';

    this.documentService.review(this.data.document.id, this.form.value).subscribe({
      next: () => {
        if (this.rawBlobUrl) URL.revokeObjectURL(this.rawBlobUrl);
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: err => {
        this.saving = false;
        this.error  = err?.error?.message || 'Review failed. Please try again.';
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  typeLabel(type: string): string {
    return ({
      ACCEPTATION_LETTER:  'Acceptance letter',
      JUSTIFICATION:       'Justification',
      MEDICAL_CERTIFICATE: 'Medical certificate',
      PROOF:               'Proof',
      OTHER:               'Other',
    } as any)[type] ?? type;
  }
}