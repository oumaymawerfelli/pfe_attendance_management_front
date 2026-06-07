import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WellbeingWidgetComponent } from './wellbeing-widget.component';

describe('WellbeingWidgetComponent', () => {
  let component: WellbeingWidgetComponent;
  let fixture: ComponentFixture<WellbeingWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WellbeingWidgetComponent]
    });
    fixture = TestBed.createComponent(WellbeingWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
