import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DataSourceService } from './services/data-source.service';
import { AuthHeaderComponent } from './auth-header/auth-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatButtonToggleModule,
    AuthHeaderComponent
  ],
  template: `
    <div class="header">
      <div class="left-section">
        <app-auth-header></app-auth-header>
        <div class="data-source-selector">
      <mat-button-toggle-group (change)="onDataSourceChange($event.value)" [value]="currentSource">
        <mat-button-toggle value="json">Local JSON</mat-button-toggle>
        <mat-button-toggle value="firebase">Firebase</mat-button-toggle>
      </mat-button-toggle-group>
      </div>
      </div>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .data-source-selector {
      display: flex;
      justify-content: center;
    }
    .header {
      display: flex;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    .left-section {
      display: flex;
      gap: 16px;
      align-items: center;
    }
  `]
})
export class AppComponent {
  currentSource: 'json' | 'firebase' = 'json';

  constructor(public dataService: DataSourceService) {
    this.dataService.getCurrentSource().subscribe(
      source => this.currentSource = source
    );
  }

  onDataSourceChange(source: 'json' | 'firebase') {
    this.dataService.setDataSource(source);
    window.location.reload();
  }
}