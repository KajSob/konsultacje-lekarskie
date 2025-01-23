import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatButtonModule,
    MatDialogModule
  ],
  template: `
    <div class="admin-container">
      <h2>Panel administratora</h2>
      <form (ngSubmit)="updateRole()">
        <mat-form-field appearance="outline" class="form-field">
          <mat-label>Email użytkownika</mat-label>
          <input matInput type="email" [(ngModel)]="email" name="email" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="form-field">
          <mat-label>Nowa rola</mat-label>
          <mat-select [(ngModel)]="role" name="role" required>
            <mat-option value="patient">Pacjent</mat-option>
            <mat-option value="doctor">Lekarz</mat-option>
            <mat-option value="admin">Administrator</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="actions">
          <button mat-button mat-dialog-close>Anuluj</button>
          <button mat-raised-button color="primary" type="submit">
            Zaktualizuj rolę
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .admin-container {
      padding: 24px;
      min-width: 400px;
    }
    h2 {
      margin: 0 0 24px;
      color: #1976d2;
      font-size: 24px;
      font-weight: 500;
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
export class AdminPanelComponent {
  email = '';
  role: 'patient' | 'doctor' | 'admin' = 'patient';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  updateRole() {
    if (this.email === 'admin@gmail.com') {
      alert('Nie można zmienić roli głównego administratora');
      return;
    }
    
    this.authService.setUserRole(this.email, this.role).then(() => {
      alert('Rola została zaktualizowana pomyślnie');
      this.router.navigate(['/']);
    }).catch((error: any) => {
      alert('Wystąpił błąd podczas aktualizacji roli');
      console.error('Update role error:', error);
    });
  }
}