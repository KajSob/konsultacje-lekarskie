import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="dialog-container">
      <h2>Zaloguj się</h2>
      <form (ngSubmit)="login()">
        <mat-form-field appearance="outline" class="form-field">
          <mat-label>Email</mat-label>
          <input matInput type="email" [(ngModel)]="email" name="email" required>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="form-field">
          <mat-label>Hasło</mat-label>
          <input matInput type="password" [(ngModel)]="password" name="password" required>
        </mat-form-field>

        <div class="actions">
          <button mat-button type="button" (click)="dialogRef.close()">Anuluj</button>
          <button mat-raised-button color="primary" type="submit">Zaloguj</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 24px;
      min-width: 350px;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 500;
      color: #333;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    .form-field {
      width: 100%;
      margin-bottom: 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
    }
  `]
})
export class LoginDialogComponent {
  email = '';
  password = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    public dialogRef: MatDialogRef<LoginDialogComponent>
  ) {}

  login() {
    this.authService.login(this.email, this.password).then(() => {
      this.dialogRef.close();
      this.router.navigate(['/']);
    }).catch((error: any) => {
      console.error('Login error:', error);
      alert('Błąd logowania. Sprawdź email i hasło.');
    });
  }
}