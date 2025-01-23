import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get } from '@angular/fire/database';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataSourceService {
  private currentSource = new BehaviorSubject<'json' | 'firebase'>('json');

  constructor(
    private http: HttpClient,
    private database: Database
  ) {
    const savedSource = localStorage.getItem('dataSource') as 'json' | 'firebase';
    if (savedSource) {
      this.currentSource.next(savedSource);
    }
  }

  setDataSource(source: 'json' | 'firebase') {
    this.currentSource.next(source);
    localStorage.setItem('dataSource', source);
  }

  getCurrentSource(): Observable<'json' | 'firebase'> {
    return this.currentSource.asObservable();
  }

  private getEndpoint(endpoint: string) {
    return `http://localhost:3000/${endpoint}`;
  }

 
  getHarmonogram(): Observable<any[]> {
    if (this.currentSource.value === 'firebase') {
      return from(get(ref(this.database, 'harmonogram'))).pipe(
        map(snapshot => snapshot.val() ? Object.values(snapshot.val()) : [])
      );
    }
    return this.http.get<any[]>(this.getEndpoint('harmonogram'));
  }

  getAbsences(): Observable<any[]> {
    if (this.currentSource.value === 'firebase') {
      return from(get(ref(this.database, 'absencje'))).pipe(
        map(snapshot => snapshot.val() ? Object.values(snapshot.val()) : [])
      );
    }
    return this.http.get<any[]>(this.getEndpoint('absencje'));
  }
}