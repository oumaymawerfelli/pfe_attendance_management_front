import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSettings, defaults } from './settings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private key = 'ng-matero-settings';

  // Public pour que les composants puissent y accéder
  options: AppSettings;

  private notify$ = new BehaviorSubject<Partial<AppSettings>>({});

  get notify() {
    return this.notify$.asObservable();
  }

  get themeColor(): 'light' | 'dark' {
    if (this.options.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.options.theme;
  }

  constructor() {
    const saved = localStorage.getItem(this.key);
    if (saved) {
      try {
        this.options = { ...defaults, ...JSON.parse(saved) };
      } catch (e) {
        this.options = { ...defaults };
      }
    } else {
      this.options = { ...defaults };
    }
  }

  getOptions(): AppSettings {
    return this.options;
  }

  setOptions(options: Partial<AppSettings>): void {
    this.options = { ...this.options, ...options };
    localStorage.setItem(this.key, JSON.stringify(this.options));
    this.notify$.next(this.options);
    this.setDirection();
    this.setTheme();
  }

  setLanguage(lang: string): void {
    this.options.language = lang;
    localStorage.setItem(this.key, JSON.stringify(this.options));
    this.notify$.next({ language: lang });
  }

  setDirection(): void {
    document.documentElement.dir = this.options.dir;
  }

  setTheme(): void {
    const theme = this.themeColor;
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
    }
  }

  reset(): void {
    localStorage.removeItem(this.key);
    this.options = { ...defaults };
    this.notify$.next(this.options);
    this.setDirection();
    this.setTheme();
  }
}
