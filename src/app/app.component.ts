import { Component } from '@angular/core';
import { Subject } from 'rxjs/Subject';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  maps = ['topology', 'satellite', 'streets'];
  currentMap = 'streets';
  mapSelected: Subject<string> = new Subject();

  onSelect(map: string) {
    this.mapSelected.next(map);
  }
}
