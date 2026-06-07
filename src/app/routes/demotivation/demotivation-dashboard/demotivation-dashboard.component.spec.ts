import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemotivationDashboardComponent } from './demotivation-dashboard.component';

describe('DemotivationDashboardComponent', () => {
  let component: DemotivationDashboardComponent;
  let fixture: ComponentFixture<DemotivationDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DemotivationDashboardComponent]
    });
    fixture = TestBed.createComponent(DemotivationDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
