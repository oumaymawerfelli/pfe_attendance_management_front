// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@core/authentication/interface';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  setUser(user: User | null): void {
    this.userSubject.next(user);
  }

  getUser(): Observable<User | null> {
    return this.user$;
  }

  updateUser(partialUser: Partial<User>): void {
    const currentUser = this.userSubject.value;
    if (currentUser) {
      this.userSubject.next({ ...currentUser, ...partialUser });
    }
  }

  clearUser(): void {
    this.userSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }
}
