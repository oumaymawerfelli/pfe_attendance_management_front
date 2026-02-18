// src/app/routes/profile/overview/overview.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '@core/authentication';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class ProfileOverviewComponent implements OnInit {
  user: User | null = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.user().subscribe(user => {
      this.user = user;
    });
  }
}
