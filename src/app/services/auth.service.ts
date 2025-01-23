import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Database, ref, set, get } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UserRole {
  email: string;
  role: 'patient' | 'doctor' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userRoles = new BehaviorSubject<UserRole | null>(null);
  
  constructor(
    private auth: Auth,
    private database: Database
  ) {
    // Listen to auth state changes
    user(this.auth).subscribe(user => {
      if (user) {
        this.getUserRole(user.email!).subscribe(role => {
          this.userRoles.next({ email: user.email!, role });
        });
      } else {
        this.userRoles.next(null);
      }
    });
  }

  getUserRole(email: string): Observable<'patient' | 'doctor' | 'admin'> {
    return new Observable(observer => {
      get(ref(this.database, `users/${this.emailToKey(email)}`))
        .then(snapshot => {
          if (snapshot.exists()) {
            observer.next(snapshot.val().role);
          } else {
            // Default role is patient
            this.setUserRole(email, 'patient').then(() => {
              observer.next('patient');
            });
          }
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  setUserRole(email: string, role: 'patient' | 'doctor' | 'admin'): Promise<void> {
    return set(ref(this.database, `users/${this.emailToKey(email)}`), { role });
  }

  // W AuthService
register(email: string, password: string): Promise<void> {
  return createUserWithEmailAndPassword(this.auth, email, password)
    .then(() => {
      // Jeśli to admin@gmail.com, ustaw rolę admin, w przeciwnym razie patient
      const role = email === 'admin@gmail.com' ? 'admin' : 'patient';
      return this.setUserRole(email, role);
    });
}

  login(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password).then();
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  getCurrentUser(): Observable<UserRole | null> {
    return this.userRoles.asObservable();
  }

  hasRole(role: 'patient' | 'doctor' | 'admin'): Observable<boolean> {
    return this.userRoles.pipe(
      map(user => {
        if (!user) return false;
        switch (role) {
          case 'patient': return true; // All logged users can do patient stuff
          case 'doctor': return ['doctor', 'admin'].includes(user.role);
          case 'admin': return user.role === 'admin';
          default: return false;
        }
      })
    );
  }

  private emailToKey(email: string): string {
    return email.replace(/[.#$[\]]/g, '_');
  }
}