import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { loadModules } from 'esri-loader';
import { Subject } from 'rxjs/Subject';
import esri = __esri;

@Component({
  selector: 'app-esri-map',
  templateUrl: './esri-map.component.html',
  styleUrls: ['./esri-map.component.css']
})

export class EsriMapComponent implements OnInit {

  // Private vars with default values
  private _zoom = 10;
  private _center = [0.1278, 51.5074];
  private maps = {
    topo: null,
    streets: null,
    satellite: null
  };

  private mapView: esri.MapView;
  private locationLoading = false;
  private _currentMap = 'streets';
  private Point;
  private trackWidget;

  @Input()
    set zoom(zoom: number) {
      this._zoom = zoom;
    }

    get zoom(): number {
      return this._zoom;
    }

  @Input()
    set center(center: any[]) {
      this._center = center;
    }

    get center(): any[] {
      return this._center;
    }

  @Input() _mapSelected: Subject<string>;

  @Output() mapLoaded = new EventEmitter<boolean>();

  // this is needed to be able to create the MapView at the DOM element in this component
  @ViewChild('mapViewNode') private mapViewEl: ElementRef;

  constructor() { }

  public ngOnInit() {
    console.log('oninit');
    this._mapSelected.subscribe(mapType => {
      this.mapView.map = this.maps[mapType];
    })


    loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/geometry/Point',
      'esri/symbols/SimpleMarkerSymbol',
      'esri/symbols/SimpleLineSymbol',
      'esri/Color',
      'esri/Graphic',
      'esri/widgets/Track'
    ])
    .then(([EsriMap, EsriMapView, FeatureLayer, Point, SimpleMarkerSymbol, SimpleLineSymbol, Color, Graphic, Track]) => {
      
      this.Point = Point;
      const featureLayer = new FeatureLayer({
        url: "https://services7.arcgis.com/0A8SPugLkdU8g5QU/arcgis/rest/services/IBRA7Subregion/FeatureServer"
      })

      Object.keys(this.maps).forEach(mapType => {
        let mapProperties: esri.MapProperties = {
          basemap: mapType
        };
        let map: esri.Map = new EsriMap(mapProperties);
        map.add(featureLayer);
        this.maps[mapType] = map;
      })

      // Set type for MapView constructor properties
      const mapViewProperties: esri.MapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this._center,
        zoom: this._zoom,
        map: this.maps[this._currentMap]
      };

      
      this.mapView = new EsriMapView(mapViewProperties);
      this.trackWidget = new Track({
        view: this.mapView
      })

      this.mapView.ui.add(this.trackWidget, 'top-left');
      this.trackWidget.on('track', event => {
        console.log('tracking...');
        console.log(event);
      })

      this.trackWidget.on('track-error', event => {
        alert("Cannot track location. Please refresh.");
        console.log('Track error');
        console.log(event);
      })
      
      this.mapView.when(() => {
        // All the resources in the MapView and the map have loaded. Now execute additional processes
        this.mapLoaded.emit(true);
        //track does not work properly. perhaps its domain issue.
        // this.trackWidget.start();
        this.getLocation();

      }, err => {
        console.error(err);
      });
    })
    .catch(err => {
      console.error(err);
    });
  } // ngOnInit


  locationError(error) {
    console.log(`location error: ${error.message}`);
    switch(error.code){
      case error.PERMISSION_DENIED: alert("Error: Location not provided");
        break;
      case error.POSITION_UNAVAILABLE: alert("Current location is not available");
        break;
      case error.TIMEOUT: alert("Timeout Error: Could not obtain location information");
        break;
      default: alert("unknown error");
        break;
    }
  }

  /*
      Geolocation
    */
  getLocation() {
    if(navigator.geolocation) {
      console.log("location.");
      //  Load position
      this.locationLoading = true;
      navigator.geolocation.getCurrentPosition(location => {
        console.log("location");
        
        let point = new this.Point(location.coords.longitude, location.coords.latitude);
        // let line = new this.SimpleLineSymbol(this.SimpleLineSymbol.STYLE_SOLID, new this.Color([210, 105, 30, 0.5]), 8);
        // let marker = new this.SimpleMarkerSymbol(this.SimpleMarkerSymbol.STYLE_CIRCLE, 12, line, new this.Color([210, 105, 30, 0.9]))
        // //add marker graphic here
        // let graphic = new this.Graphic(point, marker);
        this.mapView.center = point;
        // this.mapView.graphics.add(graphic);

        /*
          Todo: Add loading message
        */

        // navigator.geolocation.watchPosition(location => {
        //   console.log("loc update");
        //   let point = new this.Point(location.coords.longitude, location.coords.latitude);
        //   this.mapView.center = point;
        // }, this.locationError);
      }, this.locationError, {timeout: 40000, maximumAge: 560000, enableHighAccuracy: false});
  
      //  Update position
      
    }


  }
}