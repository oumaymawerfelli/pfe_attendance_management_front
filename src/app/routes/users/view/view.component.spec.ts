import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core'; // 👈 add
import { of } from 'rxjs'; // 👈 add

import { ViewComponent } from './view.component';
import { UsersService } from '../user.service';

describe('ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      declarations: [ViewComponent],
      schemas: [NO_ERRORS_SCHEMA], // 👈 add
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 1 } } },
        },
        {
          provide: UsersService,
          useValue: {
            getUser: jasmine.createSpy('getUser').and.returnValue(
              of({
                // 👈 use of()
                id: 1,
                firstName: 'Test',
                lastName: 'User',
                registrationPending: false,
                accountNonLocked: true,
                active: true,
                enabled: true,
              })
            ),
          },
        },
        {
          provide: MatSnackBar,
          useValue: { open: jasmine.createSpy('open') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
