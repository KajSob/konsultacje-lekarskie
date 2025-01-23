import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { CalendarComponent } from './app/calendar/calendar.component';
import { DoctorScheduleComponent } from './app/doctor-schedule/doctor-schedule.component';
import { LoginDialogComponent } from './app/login-dialog/login-dialog.component';
import { RegisterDialogComponent } from './app/register-dialog/register-dialog.component';
import { AdminPanelComponent } from './app/admin-panel/admin-panel.component';
import { adminGuard } from './app/guards/auth.guard';
import { importProvidersFrom } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from './environments/environment';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

const routes = [
  { path: '', component: CalendarComponent }, 
  { path: 'schedule', component: DoctorScheduleComponent },
  { path: 'login', component: LoginDialogComponent },
  { path: 'register', component: RegisterDialogComponent },
  { path: 'admin', component: AdminPanelComponent, canActivate: [adminGuard] }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideAnimations(),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideDatabase(() => getDatabase()),
    provideAuth(() => getAuth())
  ],
});