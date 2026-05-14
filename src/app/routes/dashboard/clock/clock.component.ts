import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="clock-card">

  <canvas #analogCanvas width="110" height="110"></canvas>

  <div class="divider"></div>

  <div class="digital">
    <span class="date">{{ dateStr }}</span>
    <div class="time">
      <span class="digits">{{ hours }}</span>
      <span class="colon" [class.invisible]="!colonVisible">:</span>
      <span class="digits">{{ minutes }}</span>
    </div>
  </div>

</div>
  `,
  styles: [`
 .clock-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 20px;
  padding: 14px 24px 14px 18px;
  box-shadow: 0 4px 20px rgba(10, 30, 80, 0.12);
  gap: 0;
}

canvas {
  flex-shrink: 0;
  display: block;
}

.divider {
  width: 1px;
  height: 60px;
  background: #d0d8e8;
  margin: 0 22px;
  flex-shrink: 0;
}

.digital {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date {
  font-size: 13px;
  font-weight: 700;
  color: #0d2461;
  letter-spacing: 1.4px;
  white-space: nowrap;
}

.time {
  display: flex;
  align-items: center;
  line-height: 1;
}

.digits {
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 40px;
  font-weight: 700;
  color: #0d2461;
  letter-spacing: 2px;
}

.colon {
  font-size: 40px;
  font-weight: 700;
  color: #e8a020;
  margin: 0 4px;
  transition: opacity 0.2s;

  &.invisible {
    opacity: 0;
  }
}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('analogCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  dateStr      = '';
  hours        = '00';
  minutes      = '00';
  colonVisible = true;

  private interval!: ReturnType<typeof setInterval>;

  private readonly DAYS   = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  private readonly MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                             'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  ngAfterViewInit(): void {
    this.drawAnalog(new Date());
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private tick(): void {
    const now = new Date();

    this.dateStr = `${this.DAYS[now.getDay()]} ${this.MONTHS[now.getMonth()]} `
                 + `${now.getDate()} ${now.getFullYear()}`;

    this.hours        = this.pad(now.getHours());
    this.minutes      = this.pad(now.getMinutes());
    this.colonVisible = now.getSeconds() % 2 === 0;

    this.drawAnalog(now);
    this.cdr.markForCheck();
  }

  private drawAnalog(now: Date): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const W = 110, H = 110, cx = W / 2, cy = H / 2, r = 48;

    const NAVY = '#0d2461';
    const GOLD = '#e8a020';
    const GRAY = '#b0bac8';

    ctx.clearRect(0, 0, W, H);

    // Outer gradient ring
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy + r);
    grad.addColorStop(0, NAVY);
    grad.addColorStop(1, GOLD);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 5;
    ctx.stroke();

    // Tick marks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const inner = i % 3 === 0 ? r - 13 : r - 9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (r - 4), cy + Math.sin(angle) * (r - 4));
      ctx.lineTo(cx + Math.cos(angle) * inner,    cy + Math.sin(angle) * inner);
      ctx.strokeStyle = GRAY;
      ctx.lineWidth   = i % 3 === 0 ? 2 : 1.2;
      ctx.stroke();
    }

    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

    // Hour hand
    const hAngle = ((h % 12) + m / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hAngle) * (r * 0.52), cy + Math.sin(hAngle) * (r * 0.52));
    ctx.strokeStyle = NAVY;
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Minute hand
    const mAngle = (m + s / 60) / 60 * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(mAngle) * (r * 0.72), cy + Math.sin(mAngle) * (r * 0.72));
    ctx.strokeStyle = GOLD;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Second hand
    const sAngle = s / 60 * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sAngle) * (r * 0.78), cy + Math.sin(sAngle) * (r * 0.78));
    ctx.strokeStyle = '#e8a02066';
    ctx.lineWidth   = 1;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}