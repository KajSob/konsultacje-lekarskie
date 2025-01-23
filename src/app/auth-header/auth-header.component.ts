import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon'; // Fix import path
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoginDialogComponent } from '../login-dialog/login-dialog.component';
import { RegisterDialogComponent } from '../register-dialog/register-dialog.component';
import { AdminPanelComponent } from '../admin-panel/admin-panel.component';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatMenuModule, 
    MatIconModule, 
    FormsModule, 
    MatDialogModule,
  ],
  template: `
    <div class="auth-header">
      <ng-container *ngIf="!(authService.getCurrentUser() | async)">
        <button mat-button (click)="openLoginDialog()">Zaloguj</button>
        <button mat-button (click)="openRegisterDialog()">Zarejestruj</button>
      </ng-container>
      
      <ng-container *ngIf="authService.getCurrentUser() | async as user">
        <button mat-button [matMenuTriggerFor]="menu">
          {{ getRoleLabel(user.role) }} ({{ user.email }})
          <mat-icon>arrow_drop_down</mat-icon>
        </button>
        
        <mat-menu #menu="matMenu">
          <button mat-menu-item *ngIf="authService.hasRole('admin') | async" 
                  (click)="openAdminPanel()">
            Panel admina
          </button>
          <button mat-menu-item (click)="logout()">Wyloguj</button>
        </mat-menu>
      </ng-container>
    </div>
  `,
  styles: [`
    .auth-header {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `]
})
export class AuthHeaderComponent {
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);

  openLoginDialog() {
    this.dialog.open(LoginDialogComponent, {
      width: '400px'
    });
  }

  openRegisterDialog() {
    this.dialog.open(RegisterDialogComponent, {
      width: '400px'
    });
  }

  openAdminPanel() {
    this.dialog.open(AdminPanelComponent, {
      width: '600px'
    });
  }

  logout() {
    this.authService.logout();
  }

  getRoleLabel(role: 'patient' | 'doctor' | 'admin'): string {
    switch (role) {
      case 'patient': return 'Pacjent';
      case 'doctor': return 'Lekarz';
      case 'admin': return 'Admin';
      default: return '';
    }
  }
}