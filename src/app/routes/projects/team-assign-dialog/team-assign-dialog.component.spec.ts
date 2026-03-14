import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamAssignDialogComponent } from './team-assign-dialog.component';

describe('TeamAssignDialogComponent', () => {
  let component: TeamAssignDialogComponent;
  let fixture: ComponentFixture<TeamAssignDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TeamAssignDialogComponent]
    });
    fixture = TestBed.createComponent(TeamAssignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
