import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitAuthorizationFormComponent } from './exit-authorization-form.component';

describe('ExitAuthorizationFormComponent', () => {
  let component: ExitAuthorizationFormComponent;
  let fixture: ComponentFixture<ExitAuthorizationFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExitAuthorizationFormComponent]
    });
    fixture = TestBed.createComponent(ExitAuthorizationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
