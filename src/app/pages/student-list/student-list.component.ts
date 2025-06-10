import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Database, ref, onValue, get, update, Unsubscribe } from '@angular/fire/database';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit, OnDestroy {
  private db = inject(Database);
  private auth = inject(AuthService);

  students: any[] = [];
  loading = true;
  teacherUID = '';

  private usersUnsub: Unsubscribe | null = null;

  ngOnInit(): void {
    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user || user.role !== 'Teacher') return;
      this.teacherUID = user.uid;

      // Real-time listener for students under this teacher
      const usersRef = ref(this.db, 'users');
      this.usersUnsub = onValue(usersRef, snapshot => {
        const all = snapshot.val() || {};
        this.students = Object.values(all)
          .filter((u: any) => u.role === 'Student' && u.linkedTeacherId === this.teacherUID);
        this.loading = false;
      });
    });
  }

  ngOnDestroy(): void {
    if (this.usersUnsub) this.usersUnsub();
  }

  async unlinkStudent(uid: string) {
    try {
      await update(ref(this.db, `users/${uid}`), { linkedTeacherId: null });
      this.students = this.students.filter(s => s.uid !== uid);
    } catch (error) {
      console.error('Error unlinking student:', error);
    }
  }

  async downloadPDF(uid: string) {
    try {
       const logoRight = await this.loadImageAsBase64('assets/images/lg.png');
       const logoLeft = await this.loadImageAsBase64('assets/images/MATHORIA.png');
      // Fetch student data
      const snap = await get(ref(this.db, `users/${uid}`));
      const student = snap.val();
      if (!student) {
        console.error('Student not found');
        return;
      }

      // Generate QR code
      const qrData = JSON.stringify({ uid, pin: student.password });
      const qrUrl = await QRCode.toDataURL(qrData);

      // Create PDF
      const doc = new jsPDF();
      // Ajouter les logos : MATHORIA à gauche, LG à droite
      doc.addImage(logoLeft, 'PNG', 10, 10, 45, 20);    // à gauche
      doc.addImage(logoRight, 'PNG', 170, 10, 30, 20);  // à droite
      
      doc.setFontSize(16);
      doc.text('Student QR Code Login', 70, 40);
      doc.setFontSize(12);
      doc.text(`First Name: ${student.firstName}`, 20, 50);
      doc.text(`Last Name: ${student.lastName}`, 20, 60);
      doc.text(`Grade: ${student.schoolGrade}`, 20, 70);
      doc.text(`Birth Date: ${student.birthday}`, 20, 80);
      doc.text(`Gender: ${student.gender}`, 20, 90);
      doc.text(`PIN: ${student.password}`, 20, 100);
      doc.text('Scan the QR code below to log in:', 20, 120);
      doc.addImage(qrUrl, 'PNG', 60, 130, 100, 100);

      const filename = `student-${student.firstName}-${student.lastName}-G${student.schoolGrade}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
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
