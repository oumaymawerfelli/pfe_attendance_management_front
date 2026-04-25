import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, HostBinding, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';
import { AppSettings, SettingsService } from '@core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

const MOBILE_MEDIAQUERY = 'screen and (max-width: 599px)';
const TABLET_MEDIAQUERY = 'screen and (min-width: 600px) and (max-width: 959px)';
const MONITOR_MEDIAQUERY = 'screen and (min-width: 960px)';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminLayoutComponent implements OnDestroy {
  @ViewChild('sidenav', { static: true }) sidenav!: MatSidenav;
  @ViewChild('content', { static: true }) content!: MatSidenavContent;
  @ViewChild('sidenavNotice') sidenavNotice!: MatSidenav; // Add this if needed

  options = this.settings.options;

  get themeColor() {
    return this.settings.themeColor;
  }

  get isOver(): boolean {
    return this.isMobileScreen;
  }

  private isMobileScreen = false;

  @HostBinding('class.matero-content-width-fix') get contentWidthFix() {
    return (
      this.isContentWidthFixed &&
      this.options.navPos === 'side' &&
      this.options.sidenavOpened &&
      !this.isOver
    );
  }

  private isContentWidthFixed = true;

  @HostBinding('class.matero-sidenav-collapsed-fix') get collapsedWidthFix() {
    return (
      this.isCollapsedWidthFixed &&
      (this.options.navPos === 'top' || (this.options.sidenavOpened && this.isOver))
    );
  }

  private isCollapsedWidthFixed = false;

  private layoutChangesSubscription = Subscription.EMPTY;

  constructor(
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private settings: SettingsService
  ) {
    this.initBreakpointObserver();
    this.initRouterEvents();
  }

  ngOnDestroy() {
    this.layoutChangesSubscription.unsubscribe();
  }

  /**
   * Initialize breakpoint observer for responsive layout
   */
  private initBreakpointObserver(): void {
    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_MEDIAQUERY, TABLET_MEDIAQUERY, MONITOR_MEDIAQUERY])
      .subscribe(state => {
        // Reset sidenav state on layout change
        this.options.sidenavOpened = true;
        this.isMobileScreen = state.breakpoints[MOBILE_MEDIAQUERY];
        this.options.sidenavCollapsed = false; // always start expanded with text
        this.isContentWidthFixed = state.breakpoints[MONITOR_MEDIAQUERY];
      });
  }

  /**
   * Initialize router events to handle navigation
   */
  private initRouterEvents(): void {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.handleNavigationEnd();
    });
  }

  /**
   * Handle navigation end events
   */
  private handleNavigationEnd(): void {
    // Close sidenav on mobile after navigation
    if (this.isOver) {
      this.sidenav.close();
    }
    // Scroll to top on navigation
    this.content.scrollTo({ top: 0 });
  }

  /**
   * Toggle sidenav collapsed state
   * Cycles between: opened → icons-only → closed
   */
  toggleCollapsed(): void {
    this.isContentWidthFixed = false;
    this.options.sidenavCollapsed = !this.options.sidenavCollapsed;
    this.resetCollapsedState();
  }
  /**
   * Check if main sidenav should be open
   */
  isMainSidenavOpen(): boolean {
    return this.options.navPos === 'side' && this.options.sidenavOpened && !this.isOver;
  }

  /**
   * Check if toggle button should be shown in header
   */
  shouldShowToggle(): boolean {
    return !this.options.sidenavCollapsed && this.options.navPos !== 'top';
  }

  /**
   * Reset collapsed state after animation
   * @param timer Delay in milliseconds
   */
  private resetCollapsedState(timer = 400): void {
    setTimeout(() => this.settings.setOptions(this.options), timer);
  }

  /**
   * Handle sidenav closed start event
   */
  onSidenavClosedStart(): void {
    this.isContentWidthFixed = false;
  }

  /**
   * Handle sidenav opened state change
   * @param isOpened Whether sidenav is opened
   */
  onSidenavOpenedChange(isOpened: boolean): void {
    this.isCollapsedWidthFixed = !this.isOver;
    this.options.sidenavOpened = isOpened;
    this.settings.setOptions(this.options);
  }

  /**
   * Update layout options
   * @param options New app settings
   */
  updateOptions(options: AppSettings): void {
    this.options = options;
    this.settings.setOptions(options);
    this.settings.setDirection();
    this.settings.setTheme();
  }
}
