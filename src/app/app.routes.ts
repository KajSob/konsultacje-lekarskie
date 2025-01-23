import { Routes } from '@angular/router';
import { CalendarComponent } from './calendar/calendar.component';
import { DoctorScheduleComponent } from './doctor-schedule/doctor-schedule.component';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { RegisterDialogComponent } from './register-dialog/register-dialog.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { doctorGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: CalendarComponent },
  { 
    path: 'schedule', 
    component: DoctorScheduleComponent, 
    canActivate: [doctorGuard],
    data: { requiresAuth: true }
  },
  { path: 'login', component: LoginDialogComponent },
  { path: 'register', component: RegisterDialogComponent },
  { 
    path: 'admin', 
    component: AdminPanelComponent, 
    canActivate: [adminGuard],
    data: { requiresAuth: true }
  },
  
  { path: '**', redirectTo: '' }
];