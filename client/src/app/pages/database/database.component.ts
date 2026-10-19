import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Data section (products, lookups, text blocks). Each page brings its own header. */
@Component({
  selector: 'app-database',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class DatabaseComponent {}
