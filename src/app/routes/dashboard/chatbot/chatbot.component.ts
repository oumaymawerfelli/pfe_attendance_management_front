import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  private apiUrl = 'http://localhost:8080/api/chat';

  isOpen = false;
  isTyping = false;
  isUploading = false;
  userInput = '';
  uploadedFileName = '';

  messages: Message[] = [
    {
      role: 'assistant',
      content: '👋 Hello! I am your HR virtual assistant.\n\n' +
               '⚠️ Please upload an HR PDF document first using the 📎 button below.\n\n' +
               'I can help you with:\n' +
               '📋 Leave & absences\n' +
               '📄 Contracts & procedures\n' +
               '💰 Salaries & benefits\n' +
               '🎓 Training\n' +
               '📘 Internal regulations',
      timestamp: new Date()
    }
  ];

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  ngOnInit(): void {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isTyping) return;

    const question = this.userInput.trim();
    this.userInput = '';

    this.messages.push({
      role: 'user',
      content: question,
      timestamp: new Date()
    });

    setTimeout(() => this.scrollToBottom(), 50);

    this.isTyping = true;

    this.http.post<{ response: string }>(`${this.apiUrl}/message`, { question })
      .subscribe({
        next: (res) => {
          this.messages.push({
            role: 'assistant',
            content: res.response,
            timestamp: new Date()
          });
          this.isTyping = false;
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: () => {
          this.messages.push({
            role: 'assistant',
            content: '⚠️ An error occurred. Please make sure the server is running.',
            timestamp: new Date()
          });
          this.isTyping = false;
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }

    this.isUploading = true;
    this.uploadedFileName = file.name;
    setTimeout(() => this.scrollToBottom(), 50);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ message: string; filename: string }>(`${this.apiUrl}/upload`, formData)
      .subscribe({
        next: (res) => {
          this.messages.push({
            role: 'assistant',
            content: `✅ Document "${res.filename}" indexed successfully! You can now ask your questions.`,
            timestamp: new Date()
          });
          this.isUploading = false;
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: () => {
          this.messages.push({
            role: 'assistant',
            content: '⚠️ Error uploading the PDF. Please try again.',
            timestamp: new Date()
          });
          this.isUploading = false;
          this.uploadedFileName = '';
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch (err) {}
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}