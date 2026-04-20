import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface LeaveDocumentData {
  leaveId: number;
  employeeFullName: string;
  employeeDepartment: string;
  employeeJobTitle?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  requestDate: string;
  approverFullName: string;
  approverRole: string;
  approvalDate: string;
  signatureDataUrl: string;
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogo?: string;
}

@Injectable({ providedIn: 'root' })
export class LeavePdfService {
  private readonly NAVY = '#1a2e44';
  private readonly GOLD = '#c9a84c';
  private readonly DARK = '#1c2b3a';
  private readonly GREY = '#555e68';
  private readonly LGREY = '#888f96';
  private readonly WHITE = '#ffffff';

  /**
   * Generates the PDF and returns it as a Blob.
   * The caller is responsible for uploading it to the backend
   * and optionally triggering a local download.
   */
  generateBlob(data: LeaveDocumentData): Blob {
    const doc = this.buildDoc(data);
    return doc.output('blob');
  }

  /** Convenience: generate + trigger browser download immediately. */
  generateAndDownload(data: LeaveDocumentData): Blob {
    const doc = this.buildDoc(data);
    const blob = doc.output('blob');
    const fileName = `Leave_Authorization_${data.employeeFullName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return blob;
  }

  // ── Private: build document ───────────────────────────────────────────────

  private buildDoc(data: LeaveDocumentData): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const ML = 22;
    const MR = 22;
    const CW = W - ML - MR;

    doc.setFillColor(this.GOLD);
    doc.rect(0, 0, W, 3, 'F');

    let y = 12;
    if (data.companyLogo) {
      try {
        doc.addImage(data.companyLogo, 'PNG', ML, y, 28, 28);
      } catch (_) {
        /* skip invalid logo */
      }
    }
    const infoX = data.companyLogo ? ML + 34 : ML;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(this.NAVY);
    doc.text(data.companyName.toUpperCase(), infoX, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(this.GREY);
    const contact: string[] = [];
    if (data.companyEmail) contact.push(data.companyEmail);
    if (data.companyPhone) contact.push(data.companyPhone);
    if (data.companyAddress) contact.push(data.companyAddress);
    if (contact.length) doc.text(contact.join('  |  '), infoX, y + 15, { maxWidth: CW * 0.62 });

    const refNum = `LV-${new Date().getFullYear()}-${data.leaveId}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(this.LGREY);
    doc.text('REF. NO.', W - MR, y + 6, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(this.NAVY);
    doc.text(refNum, W - MR, y + 12, { align: 'right' });

    y = 44;
    doc.setFillColor(this.NAVY);
    doc.rect(0, y, W, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(this.WHITE);
    doc.text('LEAVE AUTHORIZATION DOCUMENT', W / 2, y + 6.8, { align: 'center' });
    doc.setFillColor(this.GOLD);
    doc.rect(0, y + 10, W, 1.5, 'F');
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(this.DARK);
    doc.text(data.approvalDate, ML, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(this.DARK);
    doc.text(data.employeeFullName, ML, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(this.GREY);
    if (data.employeeJobTitle && data.employeeJobTitle !== '—') {
      doc.text(data.employeeJobTitle, ML, y);
      y += 5.5;
    }
    doc.text(data.employeeDepartment, ML, y);
    y += 5.5;
    doc.text(data.companyName, ML, y);
    y += 12;

    const firstName = data.employeeFullName.split(' ')[0];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(this.DARK);
    doc.text(`Dear ${firstName},`, ML, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Re: Approval of ${this.leaveLabel(data.leaveType)}`, ML, y);
    y += 2;
    doc.setDrawColor(this.GOLD);
    doc.setLineWidth(0.8);
    doc.line(ML, y + 1, ML + 118, y + 1);
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(this.DARK);

    const p1 =
      `We are pleased to inform you that your request for ${this.leaveLabel(data.leaveType)} ` +
      `has been reviewed and officially approved. Your leave is granted for the period commencing ` +
      `on ${data.startDate} and concluding on ${data.endDate}, encompassing a total of ` +
      `${data.daysCount} working day${data.daysCount !== 1 ? 's' : ''}.`;
    const l1 = doc.splitTextToSize(p1, CW);
    doc.text(l1, ML, y, { align: 'justify', maxWidth: CW });
    y += l1.length * 6 + 6;

    if (data.reason && data.reason !== '—') {
      const p2 =
        `The stated reason for this leave is as follows: "${data.reason}". ` +
        `Please ensure that all pending responsibilities are appropriately delegated and that ` +
        `your colleagues are informed of your absence prior to your departure date.`;
      const l2 = doc.splitTextToSize(p2, CW);
      doc.text(l2, ML, y, { align: 'justify', maxWidth: CW });
      y += l2.length * 6 + 6;
    }

    const p3 =
      `This letter constitutes official confirmation of your approved leave. Please retain a ` +
      `copy for your records. For any further inquiries, kindly contact the Human Resources Department.`;
    const l3 = doc.splitTextToSize(p3, CW);
    doc.text(l3, ML, y, { align: 'justify', maxWidth: CW });
    y += l3.length * 6 + 10;

    doc.text('Sincerely,', ML, y);
    y += 8;

    const sigW = 55;
    const sigH = 22;
    if (data.signatureDataUrl?.startsWith('data:image')) {
      try {
        doc.addImage(data.signatureDataUrl, 'PNG', ML, y, sigW, sigH);
      } catch (_) {
        /* skip invalid signature */
      }
    }
    y += sigH + 2;
    doc.setDrawColor('#c0cad4');
    doc.setLineWidth(0.4);
    doc.line(ML, y, ML + sigW, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(this.DARK);
    doc.text(data.approverFullName, ML, y);
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(this.GREY);
    doc.text(data.approverRole, ML, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(this.LGREY);
    doc.text(`Date: ${data.approvalDate}`, ML, y);

    const sigEndY = y;
    const boxX = ML + 92;
    const boxY = sigEndY - 34;
    const boxW = CW - 92;
    const boxH = 38;

    doc.setFillColor('#f4f7fa');
    doc.setDrawColor('#d8e2ec');
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'FD');
    doc.setFillColor(this.NAVY);
    doc.roundedRect(boxX, boxY, boxW, 7.5, 2, 2, 'F');
    doc.rect(boxX, boxY + 5.5, boxW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(this.WHITE);
    doc.text('LEAVE SUMMARY', boxX + boxW / 2, boxY + 5.2, { align: 'center' });

    const rows: [string, string][] = [
      ['Type', this.leaveLabel(data.leaveType)],
      ['From', data.startDate],
      ['To', data.endDate],
      ['Days', `${data.daysCount} day${data.daysCount !== 1 ? 's' : ''}`],
    ];
    let ry = boxY + 13;
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(this.LGREY);
      doc.text(label, boxX + 4, ry);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(this.DARK);
      doc.text(value, boxX + 22, ry);
      ry += 5.8;
    });

    doc.setFillColor(this.GOLD);
    doc.rect(0, 282, W, 1.5, 'F');
    doc.setFillColor(this.NAVY);
    doc.rect(0, 283.5, W, 13.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#8da4bc');
    doc.text(`${data.companyName}  ·  Human Resources  ·  Confidential  ·  ${refNum}`, W / 2, 292, {
      align: 'center',
    });
    doc.setTextColor('#5a7a9a');
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`,
      W - MR,
      292,
      { align: 'right' }
    );

    return doc;
  }

  private leaveLabel(type: string): string {
    return (
      ({ ANNUAL: 'Annual Leave', SICK: 'Sick Leave', UNPAID: 'Unpaid Leave' } as any)[type] ?? type
    );
  }
}
