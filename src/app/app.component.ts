import { Component, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  maps = ['topo', 'satellite', 'streets'];
  currentMap = 'streets';
  opacity = 0.6;
  mapSelected: Subject<string> = new Subject();
  opacityChanged: Subject<number> = new Subject();
  isCollapsed = false;


  onSelect(map: string) {
    this.currentMap = map;
    this.mapSelected.next(map);
  }

  onChangeOpacity(e) {
    console.log('opacity');
    console.log(e);
    this.opacityChanged.next(e.target.value);
  }

  onMapLoaded() {
    let overlay = document.getElementById("loading-overlay");
    overlay.style.display = "none";
  }
}
