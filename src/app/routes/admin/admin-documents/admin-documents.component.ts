// routes/admin/admin-documents/admin-documents.component.ts

import {
  Component, OnInit, OnDestroy, ViewChild, AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup }          from '@angular/forms';
import { MatPaginator, PageEvent }         from '@angular/material/paginator';
import { MatSort, Sort }                   from '@angular/material/sort';
import { MatDialog }                       from '@angular/material/dialog';
import { MatTableDataSource }              from '@angular/material/table';
import { Subject }                         from 'rxjs';
import { debounceTime, takeUntil }         from 'rxjs/operators';

import { DocumentService }       from '../services/document.service';         // ← ../services
import { ReviewDialogComponent } from '../review-dialog/review-dialog.component'; // ← ../review-dialog
import {
  LeaveDocument,
  DocumentType,
  DocumentCategory,
  DocumentStatus,
  DocumentFilter,
} from '../models/leave-document.model';                                       // ← ../models

@Component({
  selector: 'app-admin-documents',
  templateUrl: './admin-documents.component.html',
  styleUrls: ['./admin-documents.component.scss'],
})
export class AdminDocumentsComponent implements OnInit, AfterViewInit, OnDestroy {

 displayedColumns = [
  'userFullName', 'fileName', 'documentType',
  'documentCategory', 'status', 'actions',
];
  dataSource    = new MatTableDataSource<LeaveDocument>([]);
  totalElements = 0;
  pageSize      = 20;
  pageIndex     = 0;
  sortField     = 'uploadedAt';
  sortDir       = 'desc';

  loading   = false;
  exporting = false;

  filterForm: FormGroup;

  documentTypes: DocumentType[] = [
    'ACCEPTATION_LETTER', 'JUSTIFICATION',
    'MEDICAL_CERTIFICATE', 'PROOF', 'OTHER',
  ];
  documentCategories: DocumentCategory[] = ['GENERATED', 'UPLOADED'];
  statuses: DocumentStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:              FormBuilder,
    private documentService: DocumentService,
    private dialog:          MatDialog,
  ) {
    this.filterForm = this.fb.group({
      userFullName:     [''],
      documentType:     [null],
      documentCategory: [null],
      status:           [null],
      uploadedFrom:     [null],
      uploadedTo:       [null],
      leaveFrom:        [null],
      leaveTo:          [null],
    });
  }

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
      });

    this.load();
  }

  ngAfterViewInit(): void {
    this.sort.sortChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((s: Sort) => {
        this.sortField = s.active;
        this.sortDir   = s.direction || 'asc';
        this.pageIndex = 0;
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.documentService.getAll(this.buildFilter())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          this.dataSource.data = page.content;
          this.totalElements   = page.totalElements;
          this.loading         = false;
        },
        error: () => { this.loading = false; },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.load();
  }

  download(doc: LeaveDocument): void {
    this.documentService.download(doc.id).subscribe({
      next: response => {
        const blob     = response.body!;
        const filename = this.documentService.getFilename(response, doc.fileName);
        this.documentService.triggerDownload(blob, filename);
      },
    });
  }

  openReview(doc: LeaveDocument): void {
    this.dialog.open(ReviewDialogComponent, {
      width: '480px',
      data:  { document: doc },
    }).afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  archive(doc: LeaveDocument): void {
    if (!confirm(`Archive "${doc.fileName}"?`)) return;
    this.documentService.archive(doc.id).subscribe(() => this.load());
  }

  exportZip(): void {
    this.exporting = true;
    const filter   = this.buildFilter();
    delete filter.page;
    delete filter.size;
    this.documentService.exportZip(filter).subscribe({
      next: blob => {
        this.documentService.triggerDownload(blob, 'documents_export.zip');
        this.exporting = false;
      },
      error: () => { this.exporting = false; },
    });
  }

  exportExcel(): void {
    this.exporting = true;
    const filter   = this.buildFilter();
    delete filter.page;
    delete filter.size;
    this.documentService.exportExcel(filter).subscribe({
      next: blob => {
        this.documentService.triggerDownload(blob, 'documents_report.xlsx');
        this.exporting = false;
      },
      error: () => { this.exporting = false; },
    });
  }

  resetFilters(): void {
    this.filterForm.reset();
  }

  statusColor(status: DocumentStatus): string {
    return { PENDING: 'accent', APPROVED: 'primary', REJECTED: 'warn', ARCHIVED: '' }[status] ?? '';
  }

  statusIcon(status: DocumentStatus): string {
    return { PENDING: 'schedule', APPROVED: 'check_circle', REJECTED: 'cancel', ARCHIVED: 'inventory_2' }[status] ?? 'help';
  }

  typeLabel(type: DocumentType): string {
    return {
      ACCEPTATION_LETTER:  'Authorization letter',
      JUSTIFICATION:       'Justification',
      MEDICAL_CERTIFICATE: 'Medical certificate',
      PROOF:               'Proof',
      OTHER:               'Other',
    }[type] ?? type;
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private buildFilter(): DocumentFilter {
    const v = this.filterForm.value;
    return {
      ...(v.userFullName     && { userFullName:     v.userFullName }),
      ...(v.documentType     && { documentType:     v.documentType }),
      ...(v.documentCategory && { documentCategory: v.documentCategory }),
      ...(v.status           && { status:           v.status }),
      ...(v.uploadedFrom     && { uploadedFrom: this.toIsoDate(v.uploadedFrom) }),
      ...(v.uploadedTo       && { uploadedTo:   this.toIsoDate(v.uploadedTo) }),
      ...(v.leaveFrom        && { leaveFrom:    this.toIsoDate(v.leaveFrom) }),
      ...(v.leaveTo          && { leaveTo:      this.toIsoDate(v.leaveTo) }),
      page: this.pageIndex,
      size: this.pageSize,
      sort: `${this.sortField},${this.sortDir}`,
    };
  }

  private toIsoDate(d: Date | string): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
  }

  min(a: number, b: number): number { return Math.min(a, b); }

getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

fileIconClass(doc: LeaveDocument): string {
  const name = doc.fileName?.toLowerCase() ?? '';
  if (doc.mimeType === 'application/pdf' || name.endsWith('.pdf')) return 'fi-pdf';
  if (doc.mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(name)) return 'fi-image';
  if (/\.(doc|docx)$/.test(name)) return 'fi-doc';
  return 'fi-other';
}

fileIconName(doc: LeaveDocument): string {
  const name = doc.fileName?.toLowerCase() ?? '';
  if (doc.mimeType === 'application/pdf' || name.endsWith('.pdf')) return 'picture_as_pdf';
  if (doc.mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(name)) return 'image';
  if (/\.(doc|docx)$/.test(name)) return 'article';
  return 'insert_drive_file';
}
}