import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Database, ref, update } from '@angular/fire/database';
import { ConsultationBookingComponent } from '../consultation-booking/consultation-booking.component';
import { DataSourceService } from '../services/data-source.service';
import { AuthService } from '../services/auth.service';

interface Pacjent {
  imie: string;
  nazwisko: string;
  wiek: number;
  plec: string;
}

interface Harmonogram {
  data: string;
  godzina: string;
  status: string;
  typKonsultacji: string | null;
  pacjent: Pacjent | null;
  informacje: string | null;
  id ?: number;
}

interface AbsencjaZapis {
  id?: string;
  dataOd: string;
  dataDo: string;
  powod: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatTooltipModule, RouterModule, MatDialogModule]
})
export class CalendarComponent implements OnInit {
  private dataService = inject(DataSourceService);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private database = inject(Database);
  public authService = inject(AuthService); 
  
  harmonogram: Harmonogram[] = [];
  weekDays: Date[] = [];
  timeSlots: string[] = [];
  currentWeek: number = 0;
  startHour: number = 8;
  endHour: number = 14; 
  currentTime: Date = new Date();
  currentTimePosition: number = 0;
  absences: AbsencjaZapis[] = [];

  messageVisible = false;
  message = '';  
  ngOnInit(): void {
    this.generateWeekDays();
    this.generateTimeSlots();
    this.loadSchedule();
    this.loadAbsences();
    
    
    this.adjustVisibleHours();
  }
  private showMessage(text: string) {
    this.message = text;
    this.messageVisible = true;
    setTimeout(() => {
      this.messageVisible = false;
      this.message = '';
    }, 3000);
  }

  isCurrentDay(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }

  isCurrentTimeSlot(date: Date, time: string): boolean {
    if (!this.isCurrentDay(date)) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const currentHours = this.currentTime.getHours();
    const currentMinutes = this.currentTime.getMinutes();
    
    
    const slotStartMinutes = hours * 60 + minutes;
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    return currentTotalMinutes >= slotStartMinutes && 
           currentTotalMinutes < slotStartMinutes + 30;
  }

  isPastSlot(date: Date, time: string): boolean {
    const slotDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    slotDate.setHours(hours, minutes);
    return slotDate < this.currentTime;
  }

  getConsultationsCount(date: Date): number {
    const dateString = date.toLocaleDateString('en-CA');
    return this.harmonogram.filter(slot => 
      slot.data === dateString && slot.status === 'zarezerwowany'
    ).length;
  }

  getSlotColor(slot: Harmonogram): string {
    if (slot.status === 'odwołany') {
      return '#ffcdd2'; 
    }
    if (slot.status !== 'zarezerwowany') return '';
    
    const slotDate = new Date(slot.data + 'T' + slot.godzina);
    if (slotDate < this.currentTime) {
      return '#999999';
    }
    
    switch(slot.typKonsultacji) {
      case 'pierwsza wizyta': return '#ffcc99';
      case 'wizyta kontrolna': return '#99ff99';
      case 'badanie': return '#99ccff';
      case 'wizyta nagła': return '#d4fa00';
      case 'recepta': return '#ff99ff';
      default: return '#9999ff';
    }
  }

  loadSchedule() {
    this.dataService.getHarmonogram().subscribe(data => {
      this.harmonogram = data;
      this.generateWeekDays();
    });
  }

  loadAbsences() {
    this.dataService.getAbsences().subscribe(absences => {
      this.absences = absences;
      this.generateWeekDays();
    });
  }

  generateWeekDays() {
    const today = new Date();
    const firstDayOfWeek = new Date(today); 
    
   
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() + (this.currentWeek * 7));
    
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      this.weekDays.push(day);
    }
  }

  generateTimeSlots() {
    this.timeSlots = [];
    
    const actualEndHour = Math.min(24, this.endHour);
    for (let hour = this.startHour; hour < actualEndHour; hour++) {
      this.timeSlots.push(`${String(Math.floor(hour)).padStart(2, '0')}:00`);
      this.timeSlots.push(`${String(Math.floor(hour)).padStart(2, '0')}:30`);
    }
  }


  getSlotsForDayAndTime(date: Date, time: string): Harmonogram[] {
    
    const dateString = date.toLocaleDateString('en-CA');
    return this.harmonogram.filter(slot => slot.data === dateString && slot.godzina === time);
  }

  isReserved(slot: Harmonogram): boolean {
    return slot.status === 'zarezerwowany';
  }

  previousWeek() {
    this.currentWeek--;
    this.generateWeekDays();
  }

  nextWeek() {
    this.currentWeek++;
    this.generateWeekDays();
  }

  updateHours(event: any) {
    const newStartHour = parseFloat(event.target.value);
    
    
    if (newStartHour > 23) {
      this.startHour = 23;
    } else {
      this.startHour = newStartHour;
    }
  
    const viewportHeight = window.innerHeight;
    const headerHeight = 150;
    const footerHeight = 100;
    const slotHeight = 60;
    
    const availableHeight = viewportHeight - headerHeight - footerHeight;
    const possibleSlots = Math.floor(availableHeight / slotHeight);
    const numberOfSlots = Math.min(12, Math.max(4, possibleSlots));
    const numberOfHours = Math.ceil(numberOfSlots / 2);
    
    this.endHour = Math.min(24, this.startHour + numberOfHours);
    
    
    if (this.endHour >= 24) {
      this.startHour = 24 - numberOfHours;
    }
    
    this.generateTimeSlots();
  }


  adjustVisibleHours(): void {
  const viewportHeight = window.innerHeight;
  const headerHeight = 150;
  const footerHeight = 100;
  const slotHeight = 60;
  
  
  const availableHeight = viewportHeight - headerHeight - footerHeight;
  const possibleSlots = Math.floor(availableHeight / slotHeight);
  
  
  const numberOfHours = Math.ceil(possibleSlots / 2);
  
  
  this.endHour = Math.min(24, this.startHour + numberOfHours);
  
  
  if (this.endHour >= 24) {
    this.startHour = 24 - numberOfHours;
    this.endHour = 24;
  }
  
  this.generateTimeSlots();
}
  handleScroll(event: WheelEvent) {
    event.preventDefault(); 
    
    const scrollStep = 1; 
    if (event.deltaY > 0) { 
      const newStartHour = Math.min(23, this.startHour + scrollStep);
      this.updateHours({ target: { value: newStartHour } });
    } else { 
      const newStartHour = Math.max(0, this.startHour - scrollStep);
      this.updateHours({ target: { value: newStartHour } });
    }
  }
  getTooltipContent(slot: Harmonogram): string {
  if (!slot) return '';
  
  let content = `Status: ${slot.status}\n`;
  
  
  if (slot.status === 'zarezerwowany' || (slot.status === 'odwołany' && slot.typKonsultacji)) {
    content += `
      Typ konsultacji: ${slot.typKonsultacji}
      Data: ${slot.data}
      Godzina: ${slot.godzina}
      
      Pacjent: ${slot.pacjent?.imie} ${slot.pacjent?.nazwisko}
      Wiek: ${slot.pacjent?.wiek}
      Płeć: ${slot.pacjent?.plec}
      
      Informacje: ${slot.informacje}
    `.trim();
  } else if (slot.status === 'odwołany') {
    content += `
      Data: ${slot.data}
      Godzina: ${slot.godzina}
      Informacje: ${slot.informacje}
    `.trim();
  } else {
    content += `
      Wolny termin
      Data: ${slot.data}
      Godzina: ${slot.godzina}
    `.trim();
  }
  
  return content;
}

  isAbsenceDay(date: Date): boolean {
  if (!this.absences || !date) return false;
  
 
  const currentDate = new Date(date.getTime());
  currentDate.setHours(0, 0, 0, 0);
  const dateString = currentDate.toISOString().split('T')[0];

  return this.absences.some(absence => {
    const absenceStart = new Date(absence.dataOd);
    const absenceEnd = new Date(absence.dataDo);
    absenceStart.setHours(0, 0, 0, 0);
    absenceEnd.setHours(0, 0, 0, 0);
    
    return currentDate >= absenceStart && currentDate <= absenceEnd;
  });
}

onSlotClick(slot: Harmonogram) {
  const dataSource = localStorage.getItem('dataSource');
  
  if (slot.status === 'zarezerwowany') {
    this.authService.hasRole('patient').subscribe(canCancel => {
      if (!canCancel) {
        this.showMessage('Musisz być zalogowany jako pacjent aby anulować wizytę');
        return;
      }
      
      if (confirm('Czy na pewno chcesz anulować tę rezerwację?')) {
        if (dataSource === 'firebase') {
         
          const updates: { [key: string]: any } = {};
          updates[`harmonogram/${slot.id}`] = {
            ...slot,
            status: 'wolny',
            typKonsultacji: null,
            pacjent: null,
            informacje: null
          };

          update(ref(this.database), updates)
            .then(() => {
              this.loadSchedule();
            })
            .catch((error) => {
              console.error('Error cancelling reservation:', error);
            });
        } else {
          
          const resetSlot = {
            ...slot,
            status: 'wolny',
            typKonsultacji: null,
            pacjent: null,
            informacje: null
          };

          this.http.put(`http://localhost:3000/harmonogram/${slot.id}`, resetSlot)
            .subscribe({
              next: () => {
                this.loadSchedule(); 
              },
              error: (error) => {
                console.error('Error cancelling reservation:', error);
              }
            });
        }
      }
    });
  } else if (slot.status === 'wolny') {
    this.authService.hasRole('patient').subscribe(canBook => {
      if (!canBook) {
        this.showMessage('Musisz być zalogowany jako pacjent aby zarezerwować wizytę');
        return;
      }
      
      const dialogRef = this.dialog.open(ConsultationBookingComponent, {
        width: '480px',
        maxHeight: '90vh',
        data: { slot: slot },
        panelClass: 'booking-dialog'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.loadSchedule();
        }
      });
    });
  }
}
}