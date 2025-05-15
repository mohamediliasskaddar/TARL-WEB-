import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Database, ref, set, get } from '@angular/fire/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private auth = inject(Auth);
  private db = inject(Database); 

  register(email: string, password: string, userProfile: any): Observable<any> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(userCredential => {
        const uid = userCredential.user?.uid;
        const user = userCredential.user;
        if (!uid) throw new Error('UID not found');
        const userData = {
          uid,
          email,
          emailVerified: user.emailVerified,
          role: 'Pending',
          ...userProfile
        };
        const userRef = ref(this.db, `users/${uid}`);
        return from(set(userRef, userData)).pipe(map(() => user));
      })
    );
  }
  //register a parent
  registerParent(email: string, password: string, userProfile: any): Observable<any> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(userCredential => {
        const uid = userCredential.user.uid;
        const user = userCredential.user;

        const userData = {
          uid,
          email,
          emailVerified: user.emailVerified,
          role: 'Parent',
          mustChangePassword: true, // pour forcer à changer à la première connexion si nécessaire
          ...userProfile,
        };

        const userRef = ref(this.db, `users/${uid}`);
        return from(set(userRef, userData)).pipe(
          switchMap(() => from(sendEmailVerification(user))),
          map(() => user)
        );
      })
    );
  }

  login(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  getCurrentUserWithRole(): Observable<any> {
    return new Observable(observer => {
      this.auth.onAuthStateChanged(user => {
        if (!user || !user.emailVerified) {
          observer.next(null);
          observer.complete();
        } else {
          const userRef = ref(this.db, `users/${user.uid}`);
          from(get(userRef)).subscribe({
            next: snapshot => {
              observer.next(snapshot.val());
              observer.complete();
            },
            error: err => {
              observer.error(err);
            }
          });          
        }
      });
    });
  }

  getUserData(uid: string): Observable<any> {
    const userRef = ref(this.db, `users/${uid}`);
    return from(get(userRef)).pipe(map(snapshot => snapshot.val()));
  }

  logout(): Promise<void> {
    return signOut(this.auth).then(() => {});
  }

  resetPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }
}
