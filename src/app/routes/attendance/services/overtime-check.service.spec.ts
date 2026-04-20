import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { OvertimeCheckService } from './overtime-check.service';

describe('OvertimeCheckService', () => {
  let service: OvertimeCheckService;

  const matDialogMock = {
    open: jasmine.createSpy('open'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OvertimeCheckService, { provide: MatDialog, useValue: matDialogMock }],
    });

    service = TestBed.inject(OvertimeCheckService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
