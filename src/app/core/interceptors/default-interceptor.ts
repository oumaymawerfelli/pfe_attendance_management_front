import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class DefaultInterceptor implements HttpInterceptor {
  constructor(private toast: ToastrService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ⚠️ IMPORTANT: Ne pas intercepter les requêtes d'authentification
    if (
      req.url.includes('/auth/login') ||
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/activate')
    ) {
      return next.handle(req);
    }

    if (!req.url.includes('/api/')) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      mergeMap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          const body: any = event.body;
          if (body && 'code' in body && body.code !== 0) {
            if (body.msg) {
              this.toast.error(body.msg);
            }
            return throwError(() => []);
          }
        }
        return of(event);
      })
    );
  }
}
