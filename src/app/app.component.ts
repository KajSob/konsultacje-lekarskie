import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DataSourceService } from './services/data-source.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonToggleModule],
  template: `
    <div class="data-source-selector">
      <mat-button-toggle-group (change)="onDataSourceChange($event.value)" [value]="currentSource">
        <mat-button-toggle value="json">Local JSON</mat-button-toggle>
        <mat-button-toggle value="firebase">Firebase</mat-button-toggle>
      </mat-button-toggle-group>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .data-source-selector {
      display: flex;
      justify-content: center;
    }
  `]
})
export class AppComponent {
  currentSource: 'json' | 'firebase' = 'json';

  constructor(private dataService: DataSourceService) {
    this.dataService.getCurrentSource().subscribe(
      (source: 'json' | 'firebase') => this.currentSource = source
    );
  }

  onDataSourceChange(source: 'json' | 'firebase') {
    this.dataService.setDataSource(source);
    window.location.reload();
  }
}