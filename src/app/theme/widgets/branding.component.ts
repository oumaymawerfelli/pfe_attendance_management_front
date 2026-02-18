import { Component } from '@angular/core';

@Component({
  selector: 'app-branding',
  template: `
    <a class="d-inline-block text-nowrap r-full text-reset" href="/">
      <img src="./assets/images/logo1.webp" class="brand-logo align-middle m-2 r-full" alt="logo" />
    </a>
  `,
  styles: [
    `
      .brand-logo {
        width: 150px;
        height: 150px;
      }

      a {
        text-decoration: none;
      }
    `,
  ],
})
export class BrandingComponent {}
