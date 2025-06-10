import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Database, ref, set } from '@angular/fire/database';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-student-registration',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './student-registration.component.html',
  styleUrl: './student-registration.component.css'
})
export class StudentRegistrationComponent {
  private fb = inject(FormBuilder);
  private db = inject(Database);

  constructor(private auth: AuthService) {}

  studentForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthday: ['', Validators.required],
    schoolGrade: ['', Validators.required],
    gender: ['', Validators.required],
    password: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]]
  });   

  userRole: string | null = null;
  successMessage = '';
  errorMessage = '';
  qrData: string = '';
  qrImage: string = '';
  linkedTeacherId: string = '';
 
  async onSubmit() {
    if (this.studentForm.invalid) return;
  
    const studentData = this.studentForm.value;
    const uid = `stu_${Date.now()}`;
  
    this.auth.getCurrentUserWithRole().subscribe(async user => {
      if (!user) return;
  
      try {
        await set(ref(this.db, `users/${uid}`), {
          uid,
          ...studentData,
          role: 'Student',
          linkedTeacherId: user.uid
        });
  
        this.successMessage = 'Student successfully registered!';
        this.errorMessage = '';
        this.qrData = JSON.stringify({ uid, pin: studentData.password });
  
        await this.downloadPDF(studentData);
        this.studentForm.reset();
  
      } catch (err) {
        console.error(err);
        this.errorMessage = 'Error registering student.';
        this.successMessage = '';
      }
    });
  }  

  // async downloadPDF(student: any) {
  //   const qrUrl = await QRCode.toDataURL(this.qrData);
  //   //logos path: assets/images/{lg.png MATHORIA.pnj} lg a tt droite et mathoria tt a gauche du page  
  //   const doc = new jsPDF();
  //   doc.setFontSize(16);
  //   doc.text("Student QR Code Login", 20, 20);
  
  //   doc.setFontSize(12);
  //   doc.text(`First Name: ${student.firstName}`, 20, 30);
  //   doc.text(`Last Name: ${student.lastName}`, 20, 40);
  //   doc.text(`Grade: ${student.schoolGrade}`, 20, 50);
  //   doc.text(`Birth Date: ${student.birthday}`, 20, 60);
  //   doc.text(`Gender: ${student.gender}`, 20, 70);
  //   doc.text(`PIN: ${student.password}`, 20, 80);
  //   doc.text("Scan the QR code below to log in:", 20, 100);
  
  //   doc.addImage(qrUrl, "PNG", 20, 110, 100, 100);
  
  //   const filename = `student-${student.firstName}-${student.lastName}-G${student.schoolGrade}.pdf`;
  //   doc.save(filename);
  // }  
  async downloadPDF(student: any) {
  const qrUrl = await QRCode.toDataURL(this.qrData);

  // Charger les deux logos
  const logoRight = await this.loadImageAsBase64('assets/images/lg.png');
  const logoLeft = await this.loadImageAsBase64('assets/images/MATHORIA.png');

  const doc = new jsPDF();

  // Ajouter les logos : MATHORIA à gauche, LG à droite
  doc.addImage(logoLeft, 'PNG', 10, 10, 45, 20);    // à gauche
  doc.addImage(logoRight, 'PNG', 170, 10, 30, 20);  // à droite

  doc.setFontSize(16);
  doc.text("Student QR Code Login", 70, 40);

  doc.setFontSize(12);
  doc.text(`First Name: ${student.firstName}`, 20, 50);
  doc.text(`Last Name: ${student.lastName}`, 20, 60);
  doc.text(`Grade: ${student.schoolGrade}`, 20, 70);
  doc.text(`Birth Date: ${student.birthday}`, 20, 80);
  doc.text(`Gender: ${student.gender}`, 20, 90);
  doc.text(`PIN: ${student.password}`, 20, 100);
  doc.text("Scan the QR code below to log in:", 20, 120);

  doc.addImage(qrUrl, "PNG", 60, 130, 100, 100);

  const filename = `student-${student.firstName}-${student.lastName}-G${student.schoolGrade}.pdf`;
  doc.save(filename);
}

  private async loadImageAsBase64(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return await this.convertBlobToBase64(blob);
}

private convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

  
}