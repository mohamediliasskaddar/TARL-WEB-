import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';
import { ref, get, Database } from '@angular/fire/database';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  logoPath: string = '/assets/images/lg.png';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      alert('All fields are needed and must be valid');
      return;}

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.auth.login(email, password).subscribe({
      next: async (userCredential) => {
        const user = userCredential.user;
        await user.reload();

        if (!user.emailVerified) {
          this.loading = false;
          this.errorMessage = 'Please verify your email before continuing.';
          return;
        }

        this.auth.getUserData(user.uid).subscribe(userData => {
          if (!userData || userData.role === 'Pending') {
            setTimeout(() => {
              this.router.navigate(['/pending-approval']);
            });
          } else {
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            });          
          }  
        });      
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.message;
      }
    });
  }

  resetPassword() {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage = 'Please enter your email to reset your password.';
      return;
    }
  
    this.auth.resetPassword(email).subscribe({
      next: () => alert('✅ Password reset email sent. Check your inbox.'),
      error: (err) => {
        this.errorMessage = err.message;
      }
    });
  }
  
}