import {
  Component, OnInit, OnDestroy, ViewChild, AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatPaginator, PageEvent }  from '@angular/material/paginator';
import { MatSort, Sort }            from '@angular/material/sort';
import { MatTableDataSource }       from '@angular/material/table';
import { Subject }                  from 'rxjs';
import { debounceTime, takeUntil }  from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../services/document.service';

import {
  LeaveDocument,
  DocumentType,
  DocumentStatus,
  DocumentFilter,
} from '../models/leave-document.model';

@Component({
  selector: 'app-employee-documents',
  templateUrl: './employee-documents.component.html',
  styleUrls:  ['./employee-documents.component.scss'],
})
export class EmployeeDocumentsComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Table ────────────────────────────────────────────────
  displayedColumns = [
    'documentType', 'leaveType', 'leaveDates',
  'documentCategory', 'status', 'actions',
  ];
  dataSource    = new MatTableDataSource<LeaveDocument>([]);
  totalElements = 0;
  pageSize      = 10;
  pageIndex     = 0;
  sortField     = 'uploadedAt';
  sortDir       = 'desc';
  loading       = false;

  // ── Tabs ─────────────────────────────────────────────────
  activeTab: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';

  // ── Search ───────────────────────────────────────────────
  searchCtrl = new FormControl('');

  // ── Filter form ──────────────────────────────────────────
  filterForm: FormGroup;

  documentTypes: DocumentType[] = [
    'ACCEPTATION_LETTER', 'JUSTIFICATION',
    'MEDICAL_CERTIFICATE', 'PROOF', 'OTHER',
  ];

  // ── Preview ──────────────────────────────────────────────
  previewUrl:  SafeResourceUrl | null = null;
  previewName: string | null = null;
  previewOpen = false;
  private rawBlobUrl: string | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:              FormBuilder,
    private documentService: DocumentService,
    private sanitizer:       DomSanitizer,
  ) {
    this.filterForm = this.fb.group({
      documentType:     [null],
      documentCategory: [null],
      status:           [null],
      leaveFrom:        [null],
      leaveTo:          [null],
      includeArchived:  [false],
    });
  }

  ngOnInit(): void {
    // Filter form changes
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });

    // Search input changes
    this.searchCtrl.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });

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
    this.closePreview();
  }

  // ── Tabs ─────────────────────────────────────────────────
  setTab(tab: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.activeTab = tab;
    this.filterForm.patchValue(
      { status: tab === 'ALL' ? null : tab },
      { emitEvent: false },
    );
    this.pageIndex = 0;
    this.load();
  }

  // ── Load ─────────────────────────────────────────────────
  load(): void {
    this.loading = true;
    this.documentService.getMyDocuments(this.buildFilter())
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

  resetFilters(): void {
    this.activeTab = 'ALL';
    this.searchCtrl.setValue('', { emitEvent: false });
    this.filterForm.reset({ includeArchived: false });
  }

  // ── Download ─────────────────────────────────────────────
  download(doc: LeaveDocument): void {
    this.documentService.downloadMyDocument(doc.id).subscribe({
      next: response => {
        const blob     = response.body!;
        const filename = this.documentService.getFilename(response, doc.fileName);
        this.documentService.triggerDownload(blob, filename);
      },
    });
  }

  // ── PDF Preview ──────────────────────────────────────────
  preview(doc: LeaveDocument): void {
    if (!this.isPdf(doc)) return;
    this.documentService.downloadMyDocument(doc.id).subscribe({
      next: response => {
        const blob       = response.body!;
        this.rawBlobUrl  = URL.createObjectURL(blob);
        this.previewUrl  = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawBlobUrl);
        this.previewName = doc.fileName;
        this.previewOpen = true;
      },
    });
  }

  closePreview(): void {
    if (this.rawBlobUrl) {
      URL.revokeObjectURL(this.rawBlobUrl);
      this.rawBlobUrl = null;
    }
    this.previewUrl  = null;
    this.previewName = null;
    this.previewOpen = false;
  }

  isPdf(doc: LeaveDocument): boolean {
    return doc.mimeType === 'application/pdf' ||
           doc.fileName?.toLowerCase().endsWith('.pdf');
  }

  // ── File icon helpers ────────────────────────────────────
  fileIconClass(doc: LeaveDocument): string {
    const name = doc.fileName?.toLowerCase() ?? '';
    if (doc.mimeType === 'application/pdf' || name.endsWith('.pdf'))           return 'fi-pdf';
    if (doc.mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(name)) return 'fi-image';
    if (/\.(doc|docx)$/.test(name))                                            return 'fi-doc';
    return 'fi-other';
  }

  fileIconName(doc: LeaveDocument): string {
    const name = doc.fileName?.toLowerCase() ?? '';
    if (doc.mimeType === 'application/pdf' || name.endsWith('.pdf'))           return 'picture_as_pdf';
    if (doc.mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(name)) return 'image';
    if (/\.(doc|docx)$/.test(name))                                            return 'article';
    return 'insert_drive_file';
  }

  // ── Display helpers ──────────────────────────────────────
  typeLabel(type: DocumentType | string): string {
    return ({
      ACCEPTATION_LETTER:  'Acceptance letter',
      JUSTIFICATION:       'Justification',
      MEDICAL_CERTIFICATE: 'Medical certificate',
      PROOF:               'Proof',
      OTHER:               'Other',
    } as any)[type] ?? type;
  }

  categoryLabel(cat: string): string {
    return cat === 'GENERATED' ? 'Generated' : 'Uploaded';
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Private ──────────────────────────────────────────────
  private buildFilter(): DocumentFilter {
    const v = this.filterForm.value;
    return {
      ...(v.documentType                && { documentType:     v.documentType }),
      ...(v.documentCategory            && { documentCategory: v.documentCategory }),
      ...(v.status                      && { status:           v.status }),
      ...(v.leaveFrom                   && { leaveFrom:        this.toIso(v.leaveFrom) }),
      ...(v.leaveTo                     && { leaveTo:          this.toIso(v.leaveTo) }),
      ...(this.searchCtrl.value?.trim() && { search:           this.searchCtrl.value.trim() }),
      includeArchived: v.includeArchived === true,
      page: this.pageIndex,
      size: this.pageSize,
      sort: `${this.sortField},${this.sortDir}`,
    };
  }

  private toIso(d: Date | string): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
  }

  min(a: number, b: number): number { return Math.min(a, b); }
}