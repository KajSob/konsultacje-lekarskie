import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Database, ref, set, update, get, DataSnapshot } from '@angular/fire/database';

interface ConsultationData {
  durationSlots: number;
  typKonsultacji: string;
  pacjent: {
    imie: string;
    nazwisko: string;
    plec: string;
    wiek: number;
  };
  informacje: string;
}
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

@Component({
  selector: 'app-consultation-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, HttpClientModule],
  template: `
    <div class="dialog-container">
      <h2>Rezerwacja konsultacji</h2>
      <form (ngSubmit)="onSubmit()">
        <div class="form-row">
          <div class="form-group">
            <label>Długość konsultacji:</label>
            <select [(ngModel)]="consultationData.durationSlots" name="duration">
              <option [value]="1">30 minut</option>
              <option *ngIf="availableSlots >= 2" [value]="2">1 godzina</option>
              <option *ngIf="availableSlots >= 3" [value]="3">1.5 godziny</option>
              <option *ngIf="availableSlots >= 4" [value]="4">2 godziny</option>
              <option *ngIf="availableSlots >= 5" [value]="5">2.5 godziny</option>
              <option *ngIf="availableSlots >= 6" [value]="6">3 godziny</option>
            </select>
          </div>
          <div class="form-group">
            <label>Typ konsultacji:</label>
            <select [(ngModel)]="consultationData.typKonsultacji" name="type">
              <option value="pierwsza wizyta">Pierwsza wizyta</option>
              <option value="wizyta kontrolna">Wizyta kontrolna</option>
              <option value="recepta">Recepta</option>
              <option value="badanie">Badanie</option>
              <option value="wizyta nagła">Wizyta nagła</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Imię:</label>
            <input [(ngModel)]="consultationData.pacjent.imie" name="firstName" required>
          </div>
          <div class="form-group">
            <label>Nazwisko:</label>
            <input [(ngModel)]="consultationData.pacjent.nazwisko" name="lastName" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Płeć:</label>
            <select [(ngModel)]="consultationData.pacjent.plec" name="gender">
              <option value="mężczyzna">Mężczyzna</option>
              <option value="kobieta">Kobieta</option>
            </select>
          </div>
          <div class="form-group">
            <label>Wiek:</label>
            <input type="number" [(ngModel)]="consultationData.pacjent.wiek" name="age" required>
          </div>
        </div>

        <div class="form-group">
          <label>Informacje dla lekarza:</label>
          <textarea [(ngModel)]="consultationData.informacje" name="info" rows="2"></textarea>
        </div>

        <div class="actions">
          <button type="button" class="cancel-btn" (click)="onCancel()">Anuluj</button>
          <button type="submit" class="submit-btn">Zarezerwuj</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container { 
      padding: 16px;
      width: 480px;
      max-height: 100%;
      box-sizing: border-box;
    }
    h2 {
      margin: 0 0 12px 0;
      color: #1976d2;
      font-size: 1.3em;
    }
    .form-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    .form-group {
      flex: 1;
      margin-bottom: 8px;
    }
    label {
      display: block;
      margin-bottom: 4px;
      color: #333;
      font-size: 0.85em;
      font-weight: 500;
    }
    input, select {
      width: 100%;
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 0.9em;
      box-sizing: border-box;
    }
    textarea {
      width: 100%;
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 4px;
      resize: none;
      min-height: 50px;
      box-sizing: border-box;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      font-size: 0.9em;
    }
    .submit-btn {
      background: #1976d2;
      color: white;
    }
    .cancel-btn {
      background: #f5f5f5;
      color: #333;
    }
    .submit-btn:hover {
      background: #1565c0;
    }
    .cancel-btn:hover {
      background: #e0e0e0;
    }
  `]
})
export class ConsultationBookingComponent {
  availableSlots: number = 1;
  consultationData: ConsultationData = {
    durationSlots: 1,
    typKonsultacji: 'pierwsza wizyta',
    pacjent: {
      imie: '',
      nazwisko: '',
      plec: 'mężczyzna',
      wiek: 0
    },
    informacje: ''
  };
  selectedDates: Date[] = [];

  constructor(
    private dialogRef: MatDialogRef<ConsultationBookingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { slot: Harmonogram },
    private http: HttpClient,
    private database: Database
  ) {
    this.checkAvailableSlots();
  }

  private checkAvailableSlots() {
    const dataSource = localStorage.getItem('dataSource');
    
    const source = dataSource === 'firebase' 
      ? from(get(ref(this.database, 'harmonogram'))).pipe(
          map((snapshot: DataSnapshot) => snapshot.val() ? Object.values(snapshot.val()) as Harmonogram[] : [])
        )
      : this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram');

    source.subscribe({
      next: (allSlots) => {
        const currentSlot = this.data.slot;
        let consecutiveSlots = 1;
        
        
        const [hours, minutes] = currentSlot.godzina.split(':').map(Number);
        const currentMinutes = hours * 60 + minutes;
        
        
        for (let i = 1; i <= 6; i++) {
          const nextMinutes = currentMinutes + (i * 30);
          const nextHour = Math.floor(nextMinutes / 60);
          const nextMinute = nextMinutes % 60;
          const nextTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
          
          const nextSlot = allSlots.find(slot => 
            slot.data === currentSlot.data && 
            slot.godzina === nextTime && 
            slot.status === 'wolny'
          );
          
          if (nextSlot) {
            consecutiveSlots++;
          } else {
            break;
          }
        }
        
        this.availableSlots = consecutiveSlots;
      }
    });
  }

  onSubmit() {
    const dataSource = localStorage.getItem('dataSource');
    const currentSlot = this.data.slot;
    
    const source = dataSource === 'firebase' 
      ? from(get(ref(this.database, 'harmonogram'))).pipe(
          map((snapshot: DataSnapshot) => snapshot.val() ? Object.values(snapshot.val()) as Harmonogram[] : [])
        )
      : this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram');
  
    source.subscribe({
      next: (allSlots) => {
        const [hours, minutes] = currentSlot.godzina.split(':').map(Number);
        const baseMinutes = hours * 60 + minutes;
        const slotsToUpdate: Harmonogram[] = [];
  
        
        for (let i = 0; i < this.consultationData.durationSlots; i++) {
          const slotMinutes = baseMinutes + (i * 30);
          const slotHour = Math.floor(slotMinutes / 60);
          const slotMinute = slotMinutes % 60;
          const slotTime = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
  
          const slotToUpdate = allSlots.find(slot => 
            slot.data === currentSlot.data && 
            slot.godzina === slotTime
          );
  
          if (slotToUpdate) {
            slotsToUpdate.push({
              ...slotToUpdate,
              status: 'zarezerwowany',
              typKonsultacji: this.consultationData.typKonsultacji,
              pacjent: this.consultationData.pacjent,
              informacje: this.consultationData.informacje
            });
          }
        }
  
        if (dataSource === 'firebase') {
          
          const updates: { [key: string]: any } = {};
          
          slotsToUpdate.forEach(slot => {
            updates[`harmonogram/${slot.id}`] = {
              ...slot,
              status: 'zarezerwowany',
              typKonsultacji: this.consultationData.typKonsultacji,
              pacjent: this.consultationData.pacjent,
              informacje: this.consultationData.informacje
            };
          });
  
          update(ref(this.database), updates)
            .then(() => {
              this.dialogRef.close(true);
              window.location.reload();
            })
            .catch(error => {
              console.error('Error:', error);
            });
        } else {
          
          const updatePromises = slotsToUpdate.map(slot => 
            this.http.put(`http://localhost:3000/harmonogram/${slot.id}`, slot)
          );
  
          forkJoin(updatePromises).subscribe({
            next: () => {
              this.dialogRef.close(true);
              window.location.reload();
            },
            error: (error) => {
              console.error('Error:', error);
            }
          });
        }
      }
    });
  }

  cancelReservation(slot: Harmonogram) {
    const dataSource = localStorage.getItem('dataSource');
    
    if (dataSource === 'firebase') {
      
      from(get(ref(this.database, 'harmonogram'))).pipe(
        map((snapshot: DataSnapshot) => snapshot.val() ? Object.values(snapshot.val()) as Harmonogram[] : [])
      ).subscribe({
        next: (slots: Harmonogram[]) => {
          const slotToUpdate = slots.find(s => s.id === slot.id);
          
          if (slotToUpdate) {
            
            const updates: { [key: string]: any } = {};
            updates[`harmonogram/${slotToUpdate.id}`] = {
              ...slotToUpdate,
              status: 'wolny',
              typKonsultacji: null,
              pacjent: null,
              informacje: null
            };
  
            update(ref(this.database), updates)
              .then(() => {
                this.dialogRef.close(true);
                window.location.reload();
              })
              .catch(error => {
                console.error('Error:', error);
              });
          }
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
    } else {
      
      this.http.put(`http://localhost:3000/harmonogram/${slot.id}`, {
        ...slot,
        status: 'wolny',
        typKonsultacji: null,
        pacjent: null,
        informacje: null
      }).subscribe({
        next: () => {
          this.dialogRef.close(true);
          window.location.reload();
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
