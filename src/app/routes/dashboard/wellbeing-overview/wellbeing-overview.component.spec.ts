import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WellbeingOverviewComponent } from './wellbeing-overview.component';

describe('WellbeingOverviewComponent', () => {
  let component: WellbeingOverviewComponent;
  let fixture: ComponentFixture<WellbeingOverviewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WellbeingOverviewComponent]
    });
    fixture = TestBed.createComponent(WellbeingOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
