import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule  } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { NgIf } from '@angular/common';
import { sendEmailVerification } from 'firebase/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      school: [''],
    });
  }

  onSubmit() {
    if (this.registerForm.invalid){
    alert("registration form is invalid, review your info ");
    return;} 

    this.loading = true;
    const { email, password, ...profile } = this.registerForm.value;

    this.auth.register(email, password, profile).subscribe({
      next: async (user) => {
        try {
          await user.reload();
          await sendEmailVerification(user);
          alert('Registration successful. Please check your email to verify your account.');
          setTimeout(() => {
            this.router.navigate(['/login']);
          });          
        } catch (verifyError) {
          console.error('Verification error:', verifyError);
          this.errorMessage = 'Account created but failed to send verification email.';
        }
      },
      error: (err) => { 
        console.error('Registration error:', err);
        this.loading = false;
        // Display Firebase's error message if it exists
        if (err.code === 'auth/email-already-in-use') {
          this.errorMessage = 'This email is already registered. Please try logging in.';
        } else if (err.code === 'auth/invalid-email') {
          this.errorMessage = 'The email address is invalid.';
        } else if (err.code === 'auth/weak-password') {
          this.errorMessage = 'The password is too weak. It should be at least 6 characters.';
        } else {
          this.errorMessage = err.message || 'An unexpected error occurred during registration.';
        }
      }
    });
  }
}
