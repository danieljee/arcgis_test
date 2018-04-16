import { Component, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs/Subject';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  maps = ['topo', 'satellite', 'streets', 'dark-gray'];
  currentMap = 'dark-gray';
  opacity = 0.6;
  mapSelected: Subject<string> = new Subject();
  opacityChanged: Subject<number> = new Subject();
  outlineChanged: Subject<any> = new Subject();
  isCollapsed = true;
  outlineRed = 255;
  outlineGreen = 255;
  outlineBlue = 255;


  onSelect(map: string) {
    this.currentMap = map;
    this.mapSelected.next(map);
  }

  onChangeOpacity(e) {
    this.opacityChanged.next(e.target.value);
  }

  onChangeOutlineColor() {
    this.outlineChanged.next({
      color: [this.outlineRed, this.outlineGreen, this.outlineBlue, 255]
    });
  }

  onMapLoaded() {
    let overlay = document.getElementById("loading-overlay");
    overlay.style.display = "none";
  }
}
